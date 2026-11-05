import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { GameEvent, Player, RankedPlayer } from '../../packages/shared/index.ts';

export function openStore(path: string) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path, { timeout: 5000 });
  try {
    db.exec('PRAGMA journal_mode=WAL; BEGIN IMMEDIATE');
    const version = db.prepare('PRAGMA user_version').get()?.user_version;
    if (version !== 0 && version !== 1 && version !== 2) throw new Error('Unsupported RE:BIRTH database version');
    if (version === 0) db.exec(`
      CREATE TABLE players (id TEXT PRIMARY KEY, profile TEXT NOT NULL);
      CREATE TABLE event_receipts (id TEXT PRIMARY KEY, accepted_at INTEGER NOT NULL);
    `);
    if (version !== 2) db.exec(`
      CREATE TABLE world_progress (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), stage INTEGER NOT NULL CHECK(stage >= 1));
      INSERT INTO world_progress VALUES (1, 1);
      PRAGMA user_version = 2;
    `);
    db.exec('COMMIT');
  } catch (error) {
    db.close();
    throw error;
  }
  const profile = db.prepare('INSERT INTO players VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET profile=excluded.profile WHERE profile<>excluded.profile');
  const findPlayer = db.prepare('SELECT profile FROM players WHERE id = ?');
  const ranking = db.prepare("SELECT id, json_extract(profile, '$.name') AS name, json_extract(profile, '$.score') AS score FROM players ORDER BY json_extract(profile, '$.score') DESC, id LIMIT 8");
  const receipt = db.prepare('INSERT OR IGNORE INTO event_receipts VALUES (?, ?)');
  const selectStage = db.prepare('SELECT stage FROM world_progress WHERE singleton = 1');
  const unlockStage = db.prepare('UPDATE world_progress SET stage = MAX(stage, ?) WHERE singleton = 1');
  const prune = db.prepare('DELETE FROM event_receipts WHERE accepted_at < ?');
  return {
    load: () => db.prepare('SELECT profile FROM players').all().map(row => {
      const player = JSON.parse(String(row.profile)) as Player;
      return { ...player, ready: [0, 0, 0, 0], contribution: 0, lastHit: 0 };
    }),
    find(id: string) {
      const row = findPlayer.get(id);
      return row ? JSON.parse(String(row.profile)) as Player : undefined;
    },
    leaderboard: () => ranking.all().map(row => ({ id: String(row.id), name: String(row.name), score: Number(row.score) } satisfies RankedPlayer)),
    loadStage: () => Number(selectStage.get()?.stage ?? 1),
    commit(players: Player[], event?: GameEvent, now = Date.now(), nextStage?: number) {
      db.exec('BEGIN');
      try {
        if (event && !receipt.run(event.id, now).changes) {
          db.exec('ROLLBACK');
          return false;
        }
        for (const player of players) profile.run(player.id, JSON.stringify(player));
        if (nextStage !== undefined) unlockStage.run(nextStage);
        db.exec('COMMIT');
        return true;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    prune: (now: number) => prune.run(now - 86400000),
    close: () => db.close(),
  };
}
