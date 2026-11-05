import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { normalizeEvent } from '../packages/tiktok-adapter/index.ts';
import { applyEvent, newGame } from '../packages/combat/index.ts';

function prototype() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../docs/schema/normalized.sql',import.meta.url),'utf8'));
  db.exec(`
    INSERT INTO classes VALUES ('fire','Fire','fire','#ff7953',29,4,6,'test');
    INSERT INTO pets VALUES (0,'Fox','#ff985c',6,'fire','test'), (1,'Bird','#83dcff',8,'ice','test');
    INSERT INTO players VALUES ('mock:one','mock',NULL,'One',NULL,1000,1000),
      ('mock:two','mock',NULL,'Two',NULL,1000,1000);
    INSERT INTO characters VALUES ('mock:one','mock:one','fire',1,0,0,0,3,0,0,NULL),
      ('mock:two','mock:two','fire',1,0,0,0,3,0,0,NULL);
    INSERT INTO items VALUES ('ember','Staff','weapon',4,0,1), ('eclipse','Staff II','weapon',7,0,3);
    INSERT INTO bosses VALUES ('varkhazar','Boss',440,40,75,55,25,4600,3200,'test');
    INSERT INTO stages VALUES (1,'varkhazar','raid-v10');
  `);
  return db;
}

function raid(db: DatabaseSync, id: string, mode: 'ranked' | 'practice') {
  db.prepare(`INSERT INTO raid_sessions VALUES (?,?,? ,?,'mock',10,'test',1000,NULL,
    'active','PHASE_1',480,480,1,5600,NULL,'{}')`).run(id,1,'varkhazar',mode);
  db.prepare('INSERT INTO raid_participants VALUES (?, ?,1000,NULL)').run(id,'mock:one');
}

test('proposed schema defines all required entities and enforces ownership and equipment constraints', () => {
  const db = prototype();
  try {
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name));
    for (const name of ['players','characters','classes','character_stats','skills','inventory','pets','player_pets',
      'stages','bosses','raid_sessions','combat_events','rebirth_history','achievements','leaderboard_seasons','gift_events','settings']) {
      assert.ok(tables.has(name),name);
    }
    assert.equal(db.prepare('PRAGMA foreign_keys').get()?.foreign_keys,1);
    const restored = newGame();
    const fallback = normalizeEvent({ id:'fallback-name',user:'mock:'+'a'.repeat(60),name:'   ',kind:'chat',command:'!join' });
    assert.ok(fallback);
    applyEvent(restored,fallback,1000);
    assert.equal(restored.players[0].name.length,65);
    db.prepare("INSERT INTO players VALUES (?,'mock',NULL,?,1000,NULL,NULL)").run(fallback.user,restored.players[0].name);
    assert.equal(db.prepare('SELECT display_name FROM players WHERE player_id=?').get(fallback.user)?.display_name,fallback.user);
    assert.throws(() => db.exec("UPDATE characters SET class_id='missing' WHERE character_id='mock:one'"),/FOREIGN KEY/);
    db.exec('BEGIN');
    db.exec("UPDATE characters SET active_pet_id=0 WHERE character_id='mock:one'");
    assert.throws(() => db.exec('COMMIT'),/FOREIGN KEY/);
    db.exec('ROLLBACK');
    db.exec(`BEGIN;
      UPDATE characters SET active_pet_id=0 WHERE character_id='mock:one';
      INSERT INTO player_pets VALUES ('mock:one',0,1,NULL);
      INSERT INTO player_pets VALUES ('mock:two',1,1,NULL);
      COMMIT;`);
    assert.throws(() => db.exec("UPDATE characters SET active_pet_id=1 WHERE character_id='mock:one'"),/FOREIGN KEY/);
    assert.throws(() => db.exec("UPDATE player_pets SET level=6"),/CHECK/);
    assert.throws(() => db.exec("UPDATE characters SET spent_pet_shards=1 WHERE character_id='mock:one'"),/CHECK/);
    assert.throws(() => db.exec("INSERT INTO inventory VALUES ('mock:one','ember','armor',1,NULL)"),/FOREIGN KEY/);
    db.exec("INSERT INTO inventory VALUES ('mock:one','ember','weapon',1,NULL)");
    assert.throws(() => db.exec("INSERT INTO inventory VALUES ('mock:one','eclipse','weapon',1,NULL)"),/UNIQUE/);
    assert.throws(() => db.exec("INSERT INTO settings VALUES ('EULER_API_KEY','\"test\"',1000)"),/CHECK/);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
    assert.equal(db.prepare('PRAGMA quick_check').get()?.quick_check,'ok');
  } finally { db.close(); }
});

test('proposed raid and gift ledgers reject practice rewards, duplicate gifts and repeated rewards', () => {
  const db = prototype();
  try {
    raid(db,'ranked','ranked');
    assert.throws(() => raid(db,'concurrent','practice'),/UNIQUE/);
    const receipt = db.prepare('INSERT INTO event_receipts VALUES (?,1000)');
    const gift = db.prepare("INSERT INTO gift_events VALUES (?,?,'mock:one','mock:one','gift-five',5,?,1,'applied',1000)");
    const reward = db.prepare("INSERT INTO raid_rewards VALUES (?,'mock:one',120,1,580,2000)");
    receipt.run('gift:ranked');
    assert.throws(() => gift.run('gift:ranked','ranked',1),/active practice/);
    assert.throws(() => reward.run('ranked'),/ranked victory/);
    const finish = db.prepare("UPDATE raid_sessions SET status='victory',phase='DEAD',hp=0,ended_at=2000 WHERE raid_id=?");
    db.exec("UPDATE raid_participants SET final_contribution=480 WHERE raid_id='ranked'");
    db.exec("INSERT INTO raid_participants VALUES ('ranked','mock:two',1000,0)");
    finish.run('ranked');
    assert.throws(() => db.exec("INSERT INTO raid_rewards VALUES ('ranked','mock:two',120,1,580,2000)"),/contributing ranked victory/);
    reward.run('ranked');
    assert.throws(() => reward.run('ranked'),/UNIQUE/);
    assert.throws(() => db.exec('UPDATE raid_rewards SET xp_delta=999'),/append-only/);
    raid(db,'practice','practice');
    receipt.run('gift:first');
    receipt.run('gift:duplicate');
    receipt.run('gift:incomplete');
    gift.run('gift:first','practice',1);
    assert.throws(() => db.exec("UPDATE raid_sessions SET mode='ranked',status='victory',phase='DEAD',hp=0,ended_at=2000 WHERE raid_id='practice'"),/immutable/);
    assert.equal(db.prepare("SELECT mode FROM raid_sessions WHERE raid_id='practice'").get()?.mode,'practice');
    assert.throws(() => gift.run('gift:duplicate','practice',1),/UNIQUE/);
    assert.throws(() => gift.run('gift:incomplete','practice',0),/CHECK/);
    assert.throws(() => db.exec('UPDATE gift_events SET effect_applied=0'),/append-only/);
    assert.throws(() => db.exec("INSERT INTO character_stats VALUES ('practice','missing',100,60,0,0,0,0,0,0,0,0)"),/FOREIGN KEY/);
    assert.throws(() => db.exec("INSERT INTO character_stats VALUES ('practice','mock:one',100,61,0,0,0,0,0,0,0,0)"),/CHECK/);
    const event = db.prepare("INSERT INTO combat_events VALUES ('practice',1,1000,?,'basic','{}')");
    assert.throws(() => event.run('mock:two'),/FOREIGN KEY/);
    event.run('mock:one');
    assert.throws(() => event.run('mock:one'),/UNIQUE/);
    const oversized = JSON.stringify({label:'🌟'.repeat(1100)});
    assert.ok(Buffer.byteLength(oversized) > 4096);
    assert.throws(() => db.prepare("INSERT INTO combat_events VALUES ('practice',2,1000,'mock:one','basic',?)").run(oversized),/CHECK/);
    finish.run('practice');
    assert.throws(() => reward.run('practice'),/ranked victory/);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally { db.close(); }
});
