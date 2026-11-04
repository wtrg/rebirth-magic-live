import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEvent, beginRaid, bossPhase, damage, newGame, tick } from '../packages/combat/index.ts';
import { normalizeEvent } from '../packages/tiktok-adapter/index.ts';
import { openStore } from '../apps/server/store.ts';

test('damage floor and boss phase thresholds', () => {
  assert.equal(damage(10, 1, 20), 1);
  assert.equal(damage(15, 1.25, 5), 13);
  for (const [hp, expected] of [[56,'PHASE_1'],[55,'PHASE_2'],[26,'PHASE_2'],[25,'ENRAGED'],[0,'DEAD']] as const) {
    assert.equal(bossPhase(hp,100),expected);
  }
});

test('raid victory, cooldown, pet unlock, ranking and rebirth', () => {
  const state = newGame();
  let now = 1000;
  const chat = (command: string) => applyEvent(state,{ id: String(now), user:'mock:astra', name:'Astra', kind:'chat', command },now);
  chat('!join');
  chat('!class thunder');
  assert.ok(beginRaid(state,now));
  now += 800;
  tick(state,now);
  const player = state.players[0];
  chat('!ult');
  const hp = state.raid.hp;
  chat('!ult');
  assert.equal(state.raid.hp,hp);
  for (let i = 0; i < 30 && state.raid.hp > 0; i++) { now += 600; chat('!attack'); }
  assert.equal(state.raid.result,'victory');
  assert.equal(player.level,2);
  assert.equal(player.owned,1);
  assert.ok(player.score > 0);
  chat('!pet 1');
  assert.equal(player.pet,0);
  for (let round = 0; round < 2; round++) {
    assert.ok(beginRaid(state,now));
    now += 800;
    tick(state,now);
    for (let i = 0; i < 40 && state.raid.hp > 0; i++) { now += 600; chat('!attack'); }
    assert.equal(state.raid.result,'victory');
  }
  assert.equal(player.level,3);
  chat('!rebirth');
  assert.equal(player.rebirth,1);
  assert.equal(player.level,1);
  assert.equal(player.owned,3);
});

test('boss defeats an idle raid and allows retry', () => {
  const state = newGame();
  applyEvent(state,{ id:'j',user:'a',name:'A',kind:'chat',command:'!join' },1000);
  beginRaid(state,1000);
  for (let i = 1; i <= 20; i++) tick(state,1000 + i*4700);
  assert.equal(state.raid.result,'defeat');
  assert.equal(state.players[0].hp,0);
  assert.ok(beginRaid(state,100000));
});

test('gift validation, streak completion and persisted deduplication', () => {
  const db = openStore(':memory:');
  const state = newGame();
  const join = normalizeEvent({ id:'j',user:'a',name:'A',kind:'chat',command:' !JOIN ' });
  assert.ok(join);
  applyEvent(state,join,1000);
  assert.ok(db.commit(state.players,join));
  assert.equal(db.commit([],join),false);
  assert.equal(db.load()[0].id,'a');
  const raw = { id:'g',user:'a',name:'A',kind:'gift',giftId:'mock-5' };
  assert.equal(normalizeEvent({ ...raw, giftId:'invalid',complete:true }),null);
  beginRaid(state,1000,true);
  tick(state,1800);
  for (const complete of [false,true]) {
    const gift = normalizeEvent({ ...raw,complete });
    assert.ok(gift);
    applyEvent(state,gift,1800);
    assert.equal(state.raid.assisted,complete);
  }
  for (let i = 1; i <= 30 && state.raid.hp > 0; i++) {
    applyEvent(state,{ id:String(i),user:'a',name:'A',kind:'chat',command:'!attack' },1800+i*600);
  }
  assert.equal(state.raid.result,'victory');
  assert.equal(state.players[0].score,0);
  assert.equal(state.players[0].level,1);
  assert.equal(state.players[0].xp,0);
  assert.equal(state.players[0].owned,0);
  assert.ok(beginRaid(state,30000));
  assert.equal(state.raid.stage,1);
  assert.deepEqual(state.raid.usedGifts,[]);
  db.close();
});

test('five gift tiers apply distinct bounded effects to an active raid', () => {
  const state = newGame();
  const sender = { id: 'sender', user: 'mage', name: 'Mage' };
  const command = (command: string, now: number) => applyEvent(state, { ...sender, kind: 'chat', command }, now);
  const gift = (tier: number, now: number) => applyEvent(state, { ...sender, kind: 'gift', giftId: 'mock-' + tier, complete: true }, now);
  command('!join', 1000);
  assert.ok(beginRaid(state, 1000));
  tick(state, 1800);
  gift(10, 1800);
  assert.equal(state.raid.hp, 480);
  assert.equal(state.raid.assisted, false);
  state.raid.phase = 'RESET';
  assert.ok(beginRaid(state, 1000, true));
  tick(state, 1800);
  gift(1, 1800);
  assert.equal(state.raid.assisted, false);
  command('!skill1', 1800);
  assert.equal(state.players[0].mp, 52);
  gift(1, 1800);
  gift(1, 1900);
  assert.equal(state.players[0].mp, 57);
  gift(5, 1900);
  assert.deepEqual(state.raid.supportPet, { player: 'mage', until: 7900 });
  assert.equal(state.players[0].owned, 0);
  const hp = state.raid.hp;
  gift(10, 1900);
  gift(10, 2000);
  assert.equal(state.raid.hp, hp - 40);
  gift(20, 1900);
  const empowered = state.raid.hp;
  command('!attack', 2000);
  assert.equal(empowered - state.raid.hp, damage(34, 1.2, 5));
  command('!attack', 9900);
  assert.equal(empowered - state.raid.hp, damage(34, 1.2, 5) + damage(29, 1, 5));
  gift(30, 9900);
  tick(state, 9900);
  assert.equal(state.players[0].hp, 120 - damage(14, 0.65, 4));
  assert.equal(state.raid.usedGifts.length, 5);
});
