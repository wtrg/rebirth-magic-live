import assert from 'node:assert/strict';
import { test } from 'node:test';
import { participationOrder, recordParticipationWindow, settleParticipationRaid, type Participation } from '../apps/server/participation.ts';
import { openStore } from '../apps/server/store.ts';

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

test('participation transaction rolls back and retries by raid identity, independent of stage', () => {
  const store = openStore(':memory:', true);
  try {
    const changes = new Map<string, Participation>([['player', {
      eligibleRaids: 1, servedRaids: 1, everExecuted: true, firstEligibleSeq: 1, lastServedSeq: 1,
    }]]);
    const window = { id: 'window-1', raidId: 'raid-1', sequence: 1 };
    const settlement = { raidId: 'raid-1', sequence: 1, stage: 1, at: 42 };
    const expected = { windowSeq: 0, settlementSeq: 0 };
    const receipt = { id: 'attack-1', at: 42 };
    assert.ok(store.commitBatch([], [receipt]));
    assert.equal(store.commitBatch([], [receipt], 2, undefined, { changes, expected, window, settlement }), false);
    assert.deepEqual(store.loadParticipation(), { history: new Map(), windowSeq: 0, settlementSeq: 0 });
    assert.equal(store.loadStage(), 1);

    assert.ok(store.commitBatch([], [{ id: 'attack-2', at: 43 }], 2, undefined, { changes, expected, window, settlement }));
    assert.equal(store.commitBatch([], [], 3, undefined, { changes, expected, settlement }), false);
    assert.deepEqual(store.loadParticipation(), { history: changes, windowSeq: 1, settlementSeq: 1 });
    assert.equal(store.loadStage(), 2);

    assert.ok(store.commitBatch([], [], undefined, undefined, {
      changes: new Map(), expected: { windowSeq: 1, settlementSeq: 1 },
      settlement: { ...settlement, raidId: 'raid-2', sequence: 2 },
    }));
    assert.equal(store.loadParticipation().settlementSeq, 2);
  } finally {
    store.close();
  }
});

test('settlement-only writes reject a stale window snapshot', () => {
  const store = openStore(':memory:', true);
  try {
    const stale = store.loadParticipation();
    const changes = recordParticipationWindow(stale.history, new Set(['player']), new Set(['player']), 1);
    assert.ok(store.commitBatch([], [], undefined, undefined, {
      changes, expected: stale, window: { id: 'window-1', raidId: 'other-raid', sequence: 1 },
    }));
    assert.throws(() => store.commitBatch([], [{ id: 'stale', at: 1 }], 2, undefined, {
      changes: new Map(), expected: stale, settlement: { raidId: 'stale-raid', sequence: 1, stage: 1, at: 1 },
    }), /Ranked participation sequence mismatch/);
    assert.equal(store.hasReceipt('stale'), false);
    assert.equal(store.loadStage(), 1);
    assert.deepEqual(store.loadParticipation(), { history: changes, windowSeq: 1, settlementSeq: 0 });
  } finally {
    store.close();
  }
});
