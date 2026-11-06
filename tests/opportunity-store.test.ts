import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { openStore } from '../apps/server/store.ts';
import { applyEvent, newGame } from '../packages/combat/index.ts';

test('ranked settlement migrates v2, rolls back together, and survives restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rebirth-debt-'));
  const path = join(dir, 'synthetic.sqlite');
  try {
    const event = { id: 'original', kind: 'chat' as const, user: 'mock:player', name: 'Player', command: '!join' };
    const state = newGame();
    applyEvent(state, event, 1);
    const original = openStore(path);
    original.commit(state.players, event, 1, 2);
    original.close();
    const legacy = new DatabaseSync(path);
    legacy.exec('DROP TABLE ranked_opportunity_debt; PRAGMA user_version = 2');
    legacy.close();

    const store = openStore(path);
    try {
      const winner = { ...state.players[0], wins: 1 };
      const first = { id: 'first', at: 2 };
      const second = { id: 'second', at: 3 };
      const debt = new Map([['mock:denied', 1]]);
      assert.equal(store.loadOpportunityDebt().size, 0);
      assert.equal(store.commitBatch([winner], [first, { id: event.id, at: 3 }], 3, debt), false);
      assert.equal(store.hasReceipt(first.id), false);
      assert.throws(() => store.commitBatch([winner], [first, second], 3, new Map([...debt, ['mock:invalid', 33]])));
      assert.equal(store.hasReceipt(first.id), false);
      assert.equal(store.hasReceipt(second.id), false);
      assert.equal(store.find(event.user)?.wins, 0);
      assert.equal(store.loadStage(), 2);
      assert.equal(store.loadOpportunityDebt().size, 0);
      assert.equal(store.commitBatch([winner], [first, second], 3, debt), true);
    } finally {
      store.close();
    }
    const reopened = openStore(path);
    try {
      assert.equal(reopened.find(event.user)?.wins, 1);
      assert.equal(reopened.hasReceipt('first'), true);
      assert.equal(reopened.hasReceipt('second'), true);
      assert.equal(reopened.loadStage(), 3);
      assert.deepEqual(reopened.loadOpportunityDebt(), new Map([['mock:denied', 1]]));
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
