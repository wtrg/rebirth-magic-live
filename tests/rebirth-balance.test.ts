import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyEvent, newGame } from '../packages/combat/index.ts';
import { attackStats, classes, maxHp } from '../packages/shared/index.ts';
import { rebirthBalance, simulateBasicRaid } from '../scripts/rebirth-balance.ts';

test('every class can rebirth through five cycles while retaining earned possessions and totals', () => {
  for (const classId of Object.keys(classes)) {
    const state = newGame();
    const base = { id: 'rebirth-test', user: 'mock:balance', name: 'Synthetic', kind: 'chat' as const };
    const chat = (command: string) => applyEvent(state, { ...base, command }, 1000);
    chat('!join');
    chat('!class ' + classId);
    const player = state.players[0];
    Object.assign(player, { owned: 3, pet: 2, petLevels: [2, 3, 4], spentPetShards: 10,
      shards: 20, inventory: ['ember', 'aegis'], equipment: { weapon: 'ember', armor: 'aegis' },
      score: 4321, wins: 20, auto: true });
    const retained = structuredClone(player);
    for (let cycle = 1; cycle <= 5; cycle++) {
      Object.assign(player, { level: 3, xp: 75 });
      const beforeAttack = attackStats(player).attack, beforeHp = maxHp(player);
      chat('!rebirth');
      assert.equal(player.rebirth, cycle, classId);
      assert.equal(player.level, 1);
      assert.equal(player.xp, 0);
      assert.equal(player.hp, maxHp(player));
      assert.equal(attackStats(player).attack - beforeAttack, -5);
      assert.equal(maxHp(player) - beforeHp, -18);
      for (const key of ['owned', 'pet', 'petLevels', 'spentPetShards', 'shards', 'inventory', 'equipment', 'score', 'wins', 'auto', 'classId', 'id'] as const) {
        assert.deepEqual(player[key], retained[key], key);
      }
    }
    Object.assign(player, { level: 3, xp: 75 });
    const capped = structuredClone(state);
    chat('!rebirth');
    assert.deepEqual(state, capped, 'Sixth rebirth must have no effects: ' + classId);
  }
});

test('ineligible rebirth leaves the complete game state unchanged', () => {
  for (const classId of Object.keys(classes)) {
    for (const condition of ['level-one', 'level-two', 'spawning', 'phase-one', 'phase-two', 'enraged', 'paused'] as const) {
      const state = newGame();
      const base = { id: 'rebirth-ineligible', user: 'mock:balance', name: 'Synthetic', kind: 'chat' as const };
      applyEvent(state, { ...base, command: '!join' }, 1000);
      applyEvent(state, { ...base, command: '!class ' + classId }, 1000);
      state.players[0].level = condition === 'level-one' ? 1 : condition === 'level-two' ? 2 : 3;
      state.players[0].xp = 41;
      if (condition === 'spawning') state.raid.phase = 'SPAWN';
      if (condition === 'phase-one') state.raid.phase = 'PHASE_1';
      if (condition === 'phase-two') state.raid.phase = 'PHASE_2';
      if (condition === 'enraged') state.raid.phase = 'ENRAGED';
      if (condition === 'paused') state.paused = true;
      const before = structuredClone(state);
      applyEvent(state, { ...base, command: '!rebirth' }, 2000);
      assert.deepEqual(state, before, classId + ': ' + condition);
    }
  }
});

test('balance worksheet uses deterministic actual combat and marks the capped row ineligible', () => {
  const report = rebirthBalance();
  assert.equal(report.rows.length, 36);
  assert.equal(report.raids.length, 72);
  for (const row of report.rows) {
    assert.equal(row.eligibleAtLevelThree, row.cycle < 5);
    assert.equal(row.immediateAttackDelta, row.cycle < 5 ? -5 : 0);
    assert.equal(row.immediateHpDelta, row.cycle < 5 ? -18 : 0);
    assert.equal(row.resultingXp, row.cycle < 5 ? 0 : 17);
  }
  assert.deepEqual(rebirthBalance(), report);
  const fire = simulateBasicRaid('fire', 0, 1);
  assert.equal(fire.result, 'victory');
  assert.equal(fire.bossMaxHp, 480);
  assert.equal(fire.remainingBossHp, 0);
  assert.ok(fire.attacks > 0);
  assert.ok(report.raids.every(raid => raid.result !== 'timeout'));
});
