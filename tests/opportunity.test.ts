import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rankedOpportunitySlots, settleRankedDebt } from '../apps/server/opportunity.ts';
import { applyEvent, newGame } from '../packages/combat/index.ts';

function chat(user: string, command: string) {
  return { kind: 'chat' as const, user, name: user, command, id: user + command };
}

test('ranked slots combine auto and manual without mode or roster priority', () => {
  const state = newGame();
  for (const id of ['auto', 'manual', 'both']) applyEvent(state, chat(id, '!join'), 1);
  state.raid.phase = 'PHASE_1';
  state.players[0].auto = true;
  state.players[2].auto = true;
  state.players[2].mp = 0;
  const manual = new Map([['manual', chat('manual', '!skill1')], ['both', chat('both', '!ult')]]);
  const debt = new Map([['manual', 3], ['auto', 2], ['both', 1]]);
  const order = () => rankedOpportunitySlots(state, manual, debt, 10).map(slot => [slot.playerId, slot.action.command]);
  assert.deepEqual(order(), [['manual', '!skill1'], ['auto', '!attack'], ['both', '!attack']]);
  state.players.reverse();
  assert.deepEqual(order(), [['manual', '!skill1'], ['auto', '!attack'], ['both', '!attack']]);
  state.raid.practice = true;
  assert.deepEqual(order(), []);
});

test('debt settlement respects the cap and execution takes precedence over denial', () => {
  const debt = new Map([['cap', 32], ['served', 4], ['absent', 2]]);
  const changes = settleRankedDebt(debt, new Set(['served', 'zero']), new Set(['cap', 'served', 'denied']));
  assert.deepEqual(changes, new Map([['served', 3], ['denied', 1]]));
});
