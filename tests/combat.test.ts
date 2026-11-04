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
  beginRaid(state,1000);
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
  db.close();
});
