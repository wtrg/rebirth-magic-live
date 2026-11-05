import { applyEvent, autoBattle, beginRaid, newGame, tick } from '../packages/combat/index.ts';
import { attackStats, classes, defenseOf, maxHp, type ClassId } from '../packages/shared/index.ts';

function profile(classId: ClassId, cycle: number, level = 1, stage = 1) {
  const state = newGame([], stage);
  const base = { id: 'balance-join', user: 'mock:balance', name: 'Synthetic balance', kind: 'chat' as const };
  applyEvent(state, { ...base, command: '!join' }, 1000);
  applyEvent(state, { ...base, command: '!class ' + classId }, 1000);
  const player = state.players[0];
  Object.assign(player, { rebirth: cycle, level, auto: true });
  player.hp = maxHp(player);
  return state;
}

// Synthetic, fixed-loadout comparison. It does not pretend each row is a saved career.
export function simulateBasicRaid(classId: ClassId, cycle: number, stage: number) {
  const state = profile(classId, cycle, 1, stage);
  beginRaid(state, 1000);
  const player = state.players[0];
  let now = 1000;
  for (; now <= 121000 && state.raid.result === null; now += 50) {
    tick(state, now, 10);
    autoBattle(state, now, 10);
  }
  return {
    classId, cycle, stage, result: state.raid.result ?? 'timeout',
    elapsedMs: now - 50 - 1800, // Exclude the 800 ms spawn; include the first attack at t=0.
    attacks: player.attackCount ?? 0, remainingPlayerHp: player.hp,
    remainingBossHp: state.raid.hp, bossMaxHp: state.raid.maxHp,
  };
}

export function rebirthBalance() {
  const rows = Object.keys(classes).flatMap(id => {
    const classId = id as ClassId;
    return Array.from({ length: 6 }, (_, cycle) => {
      const state = profile(classId, cycle, 3);
      const player = state.players[0];
      player.xp = 17;
      const gateAttack = attackStats(player).attack, gateHp = maxHp(player);
      applyEvent(state, { id: 'balance-rebirth', user: player.id, name: player.name,
        kind: 'chat', command: '!rebirth' }, 2000);
      return {
        classId, cycle, levelOneAttack: attackStats({ ...player, level: 1, rebirth: cycle }).attack,
        levelOneHp: maxHp({ ...player, level: 1, rebirth: cycle }), defense: defenseOf(player),
        levelThreeAttack: gateAttack, levelThreeHp: gateHp,
        eligibleAtLevelThree: player.rebirth !== cycle,
        resultingCycle: player.rebirth, resultingLevel: player.level, resultingXp: player.xp,
        immediateAttackDelta: attackStats(player).attack - gateAttack,
        immediateHpDelta: maxHp(player) - gateHp,
      };
    });
  });
  const raids = Object.keys(classes).flatMap(id => [1, 3].flatMap(stage =>
    Array.from({ length: 6 }, (_, cycle) => simulateBasicRaid(id as ClassId, cycle, stage))));
  return { rulesVersion: 10, stepMs: 50, rows, raids };
}

if (import.meta.main) console.log(JSON.stringify(rebirthBalance(), null, 2));
