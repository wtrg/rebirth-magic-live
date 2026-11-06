import assert from 'node:assert/strict';
import { test } from 'node:test';
import { participationOrder, recordParticipationWindow, settleParticipationRaid, type Participation } from '../apps/server/participation.ts';

test('first service precedes smoothed rate, oldest service and deterministic ties', () => {
  const served = (eligibleRaids: number, servedRaids: number, lastServedSeq: number) =>
    ({ eligibleRaids, servedRaids, everExecuted: true, firstEligibleSeq: 1, lastServedSeq });
  const history = new Map<string, Participation>([
    ['a-waiting', { ...served(2, 0, 0), everExecuted: false, lastServedSeq: null }],
    ['high-rate', served(4, 3, 2)],
    ['recent', served(12, 3, 8)],
    ['b-old', served(4, 1, 6)],
    ['c-old', served(4, 1, 6)],
  ]);
  const ids = ['recent', 'c-old', 'high-rate', 'new', 'b-old', 'a-waiting'];
  const candidates = ids.map(playerId => ({ playerId, tie: 'same' }));
  assert.deepEqual(candidates.sort(participationOrder(history, 9)).map(slot => slot.playerId),
    ['a-waiting', 'new', 'b-old', 'c-old', 'recent', 'high-rate']);
});

test('committed windows record actual service separately from completed raid totals', () => {
  const eligible = new Set(['served', 'waiting']);
  const executed = new Set(['served']);
  const history = recordParticipationWindow(new Map(), eligible, executed, 7);
  assert.deepEqual(history.get('served'), {
    eligibleRaids: 0, servedRaids: 0, everExecuted: true, firstEligibleSeq: 7, lastServedSeq: 7,
  });
  assert.equal(history.get('waiting')?.everExecuted, false);
  const settled = settleParticipationRaid(history, eligible, executed);
  assert.equal(settled.get('served')?.servedRaids, 1);
  assert.equal(settled.get('waiting')?.eligibleRaids, 1);
  assert.equal(settled.get('waiting')?.servedRaids, 0);
  assert.equal(history.get('served')?.servedRaids, 0);
});
