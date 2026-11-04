import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEvent, beginRaid, bossPhase, damage, newGame, tick } from '../packages/combat/index.ts';
import { normalizeEvent } from '../packages/tiktok-adapter/index.ts';
import { achievements } from '../packages/shared/index.ts';
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
  chat('!equip ember');
  assert.equal(state.players[0].equipment, undefined);
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
  assert.deepEqual(player.inventory,['ember']);
  assert.deepEqual(achievements.filter(a => a.earned(player)).map(a => a.id), ['first-clear']);
  chat('!achievements');
  assert.match(state.logs[0],/Thành tựu 1\/6 · Hạ Boss đầu tiên/);
  chat('!equip ember');
  assert.equal(player.equipment?.weapon,'ember');
  assert.ok(player.score > 0);
  chat('!pet 1');
  assert.equal(player.pet,0);
  for (let round = 0; round < 2; round++) {
    assert.ok(beginRaid(state,now));
    now += 800;
    tick(state,now);
    if (round === 0) {
      const bossHp = state.raid.hp;
      chat('!attack');
      assert.equal(bossHp - state.raid.hp, damage(32 + 4 + 6 + 4, 1, 5));
    }
    for (let i = 0; i < 40 && state.raid.hp > 0; i++) { now += 600; chat('!attack'); }
    assert.equal(state.raid.result,'victory');
  }
  assert.equal(player.level,3);
  chat('!rebirth');
  assert.equal(player.rebirth,1);
  assert.equal(player.level,1);
  assert.equal(player.owned,3);
  assert.deepEqual(player.inventory,['ember','aegis','eclipse']);
  assert.deepEqual(achievements.filter(a => a.earned(player)).map(a => a.id), ['first-clear','armory','menagerie','reborn']);
  chat('!equip aegis');
  chat('!equip eclipse');
  assert.deepEqual(player.equipment,{weapon:'eclipse',armor:'aegis'});
  assert.ok(beginRaid(state,now));
  chat('!equip ember');
  assert.equal(player.equipment?.weapon,'eclipse');
  tick(state,now+800);
  const playerHp = player.hp;
  tick(state,now+5400);
  assert.equal(playerHp-player.hp,damage(13 + state.raid.stage, 1, 3 + 3));
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
  assert.equal(state.players[0].inventory,undefined);
  assert.equal(achievements.some(a => a.earned(state.players[0])),false);
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

test('pet upgrades spend ranked shards once and each companion contributes its own skill', () => {
  const state = newGame();
  const sender = { id:'pet-test', user:'mage', name:'Mage', kind:'chat' } as const;
  const command = (text: string, now: number) => applyEvent(state,{ ...sender, command:text },now);
  command('!join',1000);
  const mage = state.players[0];
  mage.shards = 4;
  mage.owned = 3;
  command('!pet 1',1000);
  command('!petup',1000);
  command('!petup',1000);
  assert.equal(mage.petLevels?.[0],2);
  assert.equal(mage.spentPetShards,1);
  assert.equal(mage.owned,3);
  assert.equal(mage.shards,4);
  const store = openStore(':memory:');
  try {
    store.commit(state.players);
    assert.deepEqual(store.load()[0].petLevels,[2,1,1]);
    assert.equal(store.load()[0].spentPetShards,1);
  } finally {
    store.close();
  }
  beginRaid(state,1000);
  tick(state,1800);
  mage.shards = 100;
  command('!petup',1800);
  assert.equal(mage.petLevels?.[0],2);
  const hp = state.raid.hp;
  command('!skill2',1800);
  assert.equal(hp - state.raid.hp,damage(29 + 8 + 5,1.85,5));
  assert.match(state.logs[0],/Hỏa Vĩ/);
  command('!pet 2',2000);
  const bossTurn = state.raid.next;
  command('!skill2',5200);
  assert.equal(state.raid.next,bossTurn+350);
  assert.match(state.logs[0],/Băng Dực/);
  command('!pet 3',5500);
  const mp = mage.mp;
  command('!skill2',8600);
  assert.equal(mage.mp,mp-16+5);
  assert.match(state.logs[0],/Lôi Tức/);
});

test('class signatures apply bounded control, protection, support and burst', () => {
  const state = newGame();
  const command = (user: string, text: string, now = 1800, rules = 5) =>
    applyEvent(state,{ id:user + ':' + text, user, name:user, kind:'chat', command:text },now,rules);
  for (const name of ['fire','ice','thunder','knight','healer','summon']) {
    command(name,'!join',1000);
    command(name,'!class ' + name,1000);
  }
  const [fire,ice,thunder,knight,healer,summon] = state.players;
  summon.owned = 1;
  command('summon','!pet 1');
  beginRaid(state,1000);
  tick(state,1800);
  state.raid.hp = state.raid.maxHp = 10000;
  const attack = (name: string, input: string, now = 1800) => {
    const before = state.raid.hp;
    command(name,input,now);
    return before - state.raid.hp;
  };
  assert.equal(attack('fire','!ult'),damage(29,3 * 1.2,5));
  const due = state.raid.next;
  attack('ice','!skill2');
  attack('ice','!ult');
  assert.equal(state.raid.next,due+1200);
  assert.equal(attack('thunder','!ult'),damage(32,3 * 1.35,5));
  assert.match(state.logs[0],/CHÍ MẠNG/);
  assert.equal(thunder.attackCount,1);
  attack('knight','!skill2');
  assert.equal(knight.guard,true);
  fire.hp = 50;
  ice.hp = 0;
  attack('healer','!ult');
  assert.equal(fire.hp,82);
  assert.equal(fire.mp,40);
  assert.equal(healer.mp,40);
  assert.equal(ice.hp,0);
  assert.equal(attack('summon','!ult'),damage(24+9+9,3,5));
  tick(state,due+1200);
  assert.equal(knight.hp,119);
  assert.equal(knight.guard,undefined);
  assert.equal(state.raid.controlMs,0);
});

test('legacy combat leaves deterministic class counters and criticals disabled', () => {
  const state = newGame();
  const mage = { user:'mage',name:'Mage',kind:'chat' } as const;
  for (const [id,command] of [['join','!join'],['class','!class thunder']]) {
    applyEvent(state,{ ...mage,id,command },1000,4);
  }
  beginRaid(state,1000);
  tick(state,1800,4);
  const hp = state.raid.hp;
  applyEvent(state,{ ...mage,id:'ult',command:'!ult' },1800,4);
  assert.equal(hp-state.raid.hp,damage(32,3,5));
  assert.equal(state.players[0].attackCount,undefined);
  assert.doesNotMatch(state.logs[0],/CHÍ MẠNG/);
});

test('phase-two wraiths take splash and targeted damage only in current raids', () => {
  const state = newGame([],3);
  const mage = { user:'mage',name:'Mage',kind:'chat' } as const;
  const act = (command: string, at: number, rules = 8) =>
    applyEvent(state,{ ...mage,id:String(at),command },at,rules);
  act('!join',1000);
  beginRaid(state,1000);
  tick(state,1800);
  state.raid.hp = 310;
  act('!attack',1800);
  assert.equal(state.raid.phase,'PHASE_2');
  assert.deepEqual(state.raid.wraiths?.map(x => x.hp),[70,70]);
  act('!skill2',2400);
  assert.deepEqual(state.raid.wraiths?.map(x => x.hp),[49,49]);
  const hp = state.raid.hp;
  act('!attack left',3000);
  assert.equal(state.raid.hp,hp);
  assert.deepEqual(state.raid.wraiths?.map(x => x.hp),[25,49]);
  state.raid.hp = 1;
  act('!attack',3600);
  assert.deepEqual(state.raid.wraiths?.map(x => x.hp),[0,0]);
  assert.equal(state.raid.result,'victory');

  beginRaid(state,4000);
  tick(state,4800,7);
  state.raid.hp = 330;
  act('!attack',4800,7);
  assert.equal(state.raid.phase,'PHASE_2');
  assert.equal(state.raid.wraiths,undefined);
});
