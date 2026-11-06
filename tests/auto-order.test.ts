import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEvent, autoBattle, beginRaid, currentRulesVersion, newGame, tick } from '../packages/combat/index.ts';
import { createReplay, playReplay } from '../apps/server/replay.ts';
import type { GameEvent } from '../packages/shared/index.ts';

function raid(stage: number, count = 32, level = 30, reverse = false) {
  const state = newGame([], stage);
  for (let i = 0; i < count; i++) {
    applyEvent(state, { id: 'order-join:' + i, user: 'mock:order' + i, name: 'Player ' + i,
      kind: 'chat', command: '!join' }, 1000);
    Object.assign(state.players[i], { level, auto: true });
  }
  if (reverse) state.players.reverse();
  assert.ok(beginRaid(state, 1000));
  assert.ok(tick(state, 1800));
  return state;
}

test('v11 gives every roster position the first auto opportunity over a full 32-stage cycle', () => {
  for (const reverse of [false, true]) {
    const wins = new Map<string, number>();
    for (let stage = 1; stage <= 32; stage++) {
      // Independent fixed-loadout fixtures isolate order from growth and damage balance.
      // One high-level basic can finish each scaled boss, making first opportunity observable.
      const state = raid(stage, 32, 1100, reverse);
      const order = [...state.players];
      const expectedWinner = order[(stage - 1) % 32];
      assert.equal(autoBattle(state, 1800, 11), true);
      assert.equal(state.raid.result, 'victory');
      assert.deepEqual(state.players.filter(player => player.contribution > 0).map(player => player.id), [expectedWinner.id]);
      for (let i = 0; i < 32; i++) {
        assert.equal(state.players[i], order[i], 'Rotation must not reorder or replace roster objects');
        const winner = state.players[i] === expectedWinner;
        assert.equal(state.players[i].wins, Number(winner));
        assert.equal(state.players[i].shards, Number(winner));
        if (!winner) {
          assert.equal(state.players[i].xp, 0);
          assert.equal(state.players[i].score, 0);
          assert.equal(state.players[i].lastHit, 0);
        }
      }
      wins.set(expectedWinner.id, (wins.get(expectedWinner.id) ?? 0) + 1);
      const settled = structuredClone(state);
      assert.equal(autoBattle(state, 2400), false);
      assert.deepEqual(state, settled, 'Finished raids cannot award twice');
    }
    assert.equal(wins.size, 32);
    assert.ok([...wins.values()].every(count => count === 1));
  }
});

test('v10 keeps the original fixed order while v11 rotates the level-30 reproduction', () => {
  for (const reverse of [false, true]) {
    const legacy = raid(2, 32, 30, reverse);
    const initial = structuredClone(legacy);
    const ids = legacy.players.map(player => player.id);
    autoBattle(legacy, 1800, 10);
    assert.equal(legacy.raid.maxHp, 2845);
    assert.equal(legacy.raid.result, 'victory');
    assert.deepEqual(legacy.players.filter(player => player.wins > 0).map(player => player.id), ids.slice(0, 21));
    assert.equal(legacy.players[20].contribution, 45);
    assert.equal(legacy.players[20].score, 245);
    assert.deepEqual(playReplay({ version: 10, initial, steps: [{ kind: 'auto', at: 1800 }] }), legacy);

    const rotated = structuredClone(initial);
    autoBattle(rotated, 1800, 11);
    assert.deepEqual(rotated.players.filter(player => player.wins > 0).map(player => player.id), ids.slice(1, 22));
    assert.equal(rotated.players[21].contribution, 45);
    assert.equal(rotated.players[0].wins, 0);
    assert.deepEqual(playReplay({ version: 11, initial, steps: [{ kind: 'auto', at: 1800 }] }), rotated);
  }
});

test('rotated auto skips dead, disabled and cooling attackers and stops after the killing hit', () => {
  const state = raid(2, 5);
  state.players[1].hp = 0;
  state.players[2].auto = false;
  state.players[3].ready[3] = 1801;
  state.raid.hp = 1;
  assert.equal(autoBattle(state, 1800), true);
  assert.deepEqual(state.players.map(player => player.attackCount ?? 0), [0, 0, 0, 0, 1]);
  assert.deepEqual(state.players.map(player => player.wins), [0, 0, 0, 0, 1]);
  assert.equal(state.players[1].hp, 0);
  assert.equal(state.players[2].auto, false);
  assert.equal(state.players[3].ready[3], 1801);
  assert.equal(state.players[4].ready[3], 2400);
  const finished = structuredClone(state);
  assert.equal(autoBattle(state, 2400), false);
  assert.deepEqual(state, finished);

  for (const phase of ['IDLE', 'SPAWN', 'DEAD', 'RESET'] as const) {
    const inactive = raid(2, 5);
    inactive.raid.phase = phase;
    const before = structuredClone(inactive);
    assert.equal(autoBattle(inactive, 1800), false);
    assert.deepEqual(inactive, before);
  }
  const paused = raid(2, 5);
  paused.paused = true;
  const before = structuredClone(paused);
  assert.equal(autoBattle(paused, 1800), false);
  assert.deepEqual(paused, before);
});

test('v12 rotates first auto opportunity despite coordinated rejoin order changes', () => {
  const winners = new Set<string>();
  for (let stage = 1; stage <= 32; stage++) {
    const state = raid(stage, 32, 1100);
    const pivot = (33 - stage) % 32;
    state.players = [...state.players.slice(pivot), ...state.players.slice(0, pivot)];
    const displayOrder = state.players.map(player => player.id);
    const old = structuredClone(state);
    autoBattle(old, 1800, 11);
    assert.equal(old.players.find(player => player.wins)?.id, 'mock:order0');
    const replay = createReplay(state);
    assert.equal(autoBattle(state, 1800), true);
    replay.record({ kind: 'auto', at: 1800 });
    assert.equal(state.raid.result, 'victory');
    assert.deepEqual(state.players.map(player => player.id), displayOrder);
    const rewarded = state.players.filter(player => player.wins > 0);
    assert.equal(rewarded.length, 1);
    winners.add(rewarded[0].id);
    assert.deepEqual(playReplay(JSON.parse(replay.export())), state);
  }
  assert.equal(winners.size, 32);
});

test('current mixed manual, boss and rotated auto replay is deterministic with shared cooldowns', () => {
  const state = raid(2, 3);
  const replay = createReplay(state);
  const manual = (id: string, command: string, at: number) => {
    const player = state.players[0];
    const event: GameEvent = { id, user: player.id, name: player.name, kind: 'chat', command };
    applyEvent(state, event, at);
    replay.record({ kind: 'event', event, at });
  };
  manual('mixed-basic', '!attack', 1800);
  assert.equal(autoBattle(state, 1800), true);
  replay.record({ kind: 'auto', at: 1800 });
  assert.deepEqual(state.players.map(player => player.attackCount), [1, 1, 1]);
  assert.equal(autoBattle(state, 1850), false);
  replay.record({ kind: 'auto', at: 1850 });
  assert.equal(tick(state, 6400), true);
  replay.record({ kind: 'tick', at: 6400 });
  manual('mixed-skill', '!skill1', 6400);
  assert.equal(autoBattle(state, 6400), true);
  replay.record({ kind: 'auto', at: 6400 });
  assert.equal(state.raid.result, 'victory');
  const trace = JSON.parse(replay.export());
  assert.equal(trace.version, currentRulesVersion);
  assert.deepEqual(playReplay(trace), state);
  assert.deepEqual(playReplay(trace), state);
});
