import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../apps/server/store.ts';
import { playReplay } from '../apps/server/replay.ts';
import { applyEvent, beginRaid, newGame, tick } from '../packages/combat/index.ts';

test('v1 database migrates in place and keeps its players and event receipts', () => {
  const directory = mkdtempSync(join(tmpdir(), 'rebirth-migration-'));
  const path = join(directory, 'v1.sqlite');
  const joinEvent = { id: 'legacy-join', user: 'mage', name: 'Mage', kind: 'chat', command: '!join' } as const;
  try {
    const old = new DatabaseSync(path);
    try {
      old.exec(`
        CREATE TABLE players (id TEXT PRIMARY KEY, profile TEXT NOT NULL);
        CREATE TABLE event_receipts (id TEXT PRIMARY KEY, accepted_at INTEGER NOT NULL);
        PRAGMA user_version = 1;
      `);
      const state = newGame();
      applyEvent(state, joinEvent, 1000);
      old.prepare('INSERT INTO players VALUES (?, ?)').run('mage', JSON.stringify(state.players[0]));
      old.prepare('INSERT INTO event_receipts VALUES (?, ?)').run(joinEvent.id, 1000);
    } finally {
      old.close();
    }
    const store = openStore(path);
    try {
      assert.equal(store.loadStage(), 1);
      assert.equal(store.load()[0].name, 'Mage');
      assert.equal(store.commit([], joinEvent, 1000, 2), false);
      assert.equal(store.loadStage(), 1);
      assert.ok(store.commit(store.load(), { ...joinEvent, id: 'ranked-win' }, 2000, 2));
    } finally {
      store.close();
    }
    const reopened = openStore(path);
    try {
      assert.equal(reopened.loadStage(), 2);
      assert.equal(reopened.load()[0].name, 'Mage');
    } finally {
      reopened.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('legacy replay preserves its reward rules', () => {
  const state = newGame();
  const mage = { user:'mage', name:'Mage', kind:'chat' } as const;
  applyEvent(state,{ ...mage, id:'join', command:'!join' },1000);
  beginRaid(state,1000);
  tick(state,1800);
  state.raid.hp = 1;
  const steps = [{ kind:'event', at:1800, event:{ ...mage, id:'attack', command:'!attack' } }];
  const legacy = playReplay({ version:1, initial:state, steps });
  const current = playReplay({ version:2, initial:state, steps });
  assert.equal(legacy.raid.result,'victory');
  assert.equal(legacy.players[0].inventory,undefined);
  assert.deepEqual(current.players[0].inventory,['ember']);
});
