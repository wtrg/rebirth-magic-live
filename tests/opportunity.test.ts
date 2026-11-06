import assert from 'node:assert/strict';
import { test } from 'node:test';
import { admitOpportunityIntent, openOpportunityWindow, rankedOpportunitySlots, resolveOpportunityWindow, settleRankedDebt } from '../apps/server/opportunity.ts';
import { applyEvent, newGame } from '../packages/combat/index.ts';
import { createReplay, playReplayWithDebt } from '../apps/server/replay.ts';

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

test('auto fills the same slot when an earlier attack destroys the manual target', () => {
  const state = newGame();
  for (const id of ['first', 'second']) applyEvent(state, chat(id, '!join'), 1);
  state.raid.phase = 'PHASE_2';
  state.raid.wraiths = [{ hp: 1, maxHp: 1 }, { hp: 1, maxHp: 1 }];
  state.players[1].auto = true;
  const intents = ['first', 'second'].map(user => ({ event: chat(user, '!attack left'), admittedAt: 1 }));
  const debt = new Map([['first', 1]]);
  const regular = resolveOpportunityWindow(state, intents, debt, 401);
  assert.deepEqual([...regular.executed], ['first', 'second']);
  assert.ok(regular.state.raid.hp < state.raid.hp);
  const shutdown = resolveOpportunityWindow(state, intents, debt, 401, false);
  assert.deepEqual([...shutdown.executed], ['first']);
  assert.equal(shutdown.state.raid.hp, state.raid.hp);
});

test('opening window holds one manual intent per player and excludes the exact deadline', () => {
  const window = openOpportunityWindow(1000, true);
  assert.equal(admitOpportunityIntent(window, { event: chat('first', '!skill1'), admittedAt: 1000 }), true);
  assert.equal(admitOpportunityIntent(window, { event: chat('first', '!ult'), admittedAt: 1200 }), false);
  assert.equal(admitOpportunityIntent(window, { event: chat('last', '!attack'), admittedAt: 1399 }), true);
  assert.equal(admitOpportunityIntent(window, { event: chat('late', '!attack'), admittedAt: 1400 }), false);
  assert.equal(openOpportunityWindow(1400, false).deadline, 1460);
});

test('a killing action denies only still-eligible slots and preserves the input for rollback', () => {
  const state = newGame();
  for (const id of ['winner', 'denied', 'invalid']) applyEvent(state, chat(id, '!join'), 1);
  state.raid.phase = 'PHASE_1';
  state.raid.hp = 1;
  state.players[2].mp = 0;
  const intents = [
    { event: chat('winner', '!attack'), admittedAt: 1 },
    { event: chat('denied', '!skill1'), admittedAt: 2 },
    { event: chat('invalid', '!ult'), admittedAt: 3 },
  ];
  const result = resolveOpportunityWindow(state, intents, new Map([['winner', 3]]), 401);
  assert.deepEqual([...result.executed], ['winner']);
  assert.deepEqual([...result.denied], ['denied']);
  assert.deepEqual(result.eligible, ['winner', 'denied']);
  assert.equal(result.state.raid.result, 'victory');
  assert.equal(state.raid.hp, 1);
  assert.equal(state.players[0].wins, 0);
});

test('replay distinguishes terminal and nonterminal shutdown windows', () => {
  for (const terminal of [true, false]) {
    const state = newGame();
    applyEvent(state, chat('mock:player', '!join'), 1);
    state.raid.phase = 'PHASE_1';
    if (terminal) state.raid.hp = 1;
    const debt = new Map([['mock:player', 3]]);
    const recording = createReplay(state, debt);
    recording.record({ kind: 'opportunity', at: 200, openedAt: 100, deadline: 500, closedAt: 200,
      reason: 'shutdown', outcome: 'committed', terminal,
      intents: [{ event: { ...chat('mock:player', '!attack'), id: 'ranked-shutdown' }, admittedAt: 100 }] });
    const trace = JSON.parse(recording.export());
    const result = playReplayWithDebt(trace);
    assert.equal(result.state.raid.result, terminal ? 'victory' : null);
    assert.equal(result.debt.get('mock:player'), terminal ? 2 : 3);
    trace.steps[0].terminal = !terminal;
    assert.throws(() => playReplayWithDebt(trace), /Invalid opportunity terminal outcome/);
    delete trace.steps[0].terminal;
    assert.deepEqual(playReplayWithDebt(trace), result);
  }
});
