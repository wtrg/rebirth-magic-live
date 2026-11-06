import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { GameEvent, Player, RankedPlayer } from '../../packages/shared/index.ts';
import type { Participation, ParticipationCommit } from './participation.ts';

export function openStore(path: string, participation = false) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path, { timeout: 5000 });
  try {
    db.exec('PRAGMA journal_mode=WAL; BEGIN IMMEDIATE');
    const version = db.prepare('PRAGMA user_version').get()?.user_version;
    if (version !== 0 && version !== 1 && version !== 2 && version !== 3) throw new Error('Unsupported RE:BIRTH database version');
    if (version === 0) db.exec(`
      CREATE TABLE players (id TEXT PRIMARY KEY, profile TEXT NOT NULL);
      CREATE TABLE event_receipts (id TEXT PRIMARY KEY, accepted_at INTEGER NOT NULL);
    `);
    if (version === 0 || version === 1) db.exec(`
      CREATE TABLE world_progress (singleton INTEGER PRIMARY KEY CHECK(singleton = 1), stage INTEGER NOT NULL CHECK(stage >= 1));
      INSERT INTO world_progress VALUES (1, 1);
    `);
    if (version !== 3) db.exec(`
      CREATE TABLE ranked_opportunity_debt (
        player_id TEXT PRIMARY KEY,
        debt INTEGER NOT NULL CHECK(debt BETWEEN 0 AND 32)
      ) STRICT;
      PRAGMA user_version = 3;
    `);
    if (participation) db.exec(`
      CREATE TABLE IF NOT EXISTS ranked_state (
        player_id TEXT PRIMARY KEY NOT NULL,
        eligible_raids INTEGER NOT NULL CHECK(eligible_raids >= 0),
        served_raids INTEGER NOT NULL CHECK(served_raids BETWEEN 0 AND eligible_raids),
        ever_executed INTEGER NOT NULL CHECK(ever_executed IN (0, 1)),
        first_eligible_seq INTEGER NOT NULL CHECK(first_eligible_seq > 0),
        last_served_seq INTEGER,
        CHECK((ever_executed = 0 AND last_served_seq IS NULL AND served_raids = 0) OR
              (ever_executed = 1 AND last_served_seq IS NOT NULL AND last_served_seq >= first_eligible_seq))
      ) STRICT;
      CREATE TABLE IF NOT EXISTS ranked_windows (
        window_id TEXT PRIMARY KEY NOT NULL,
        window_commit_seq INTEGER NOT NULL UNIQUE CHECK(window_commit_seq > 0),
        raid_instance_id TEXT NOT NULL,
        outcome TEXT NOT NULL CHECK(outcome = 'committed')
      ) STRICT;
      CREATE TABLE IF NOT EXISTS ranked_settlements (
        raid_instance_id TEXT PRIMARY KEY NOT NULL,
        settlement_seq INTEGER NOT NULL UNIQUE CHECK(settlement_seq > 0),
        stage INTEGER NOT NULL CHECK(stage > 0),
        committed_at INTEGER NOT NULL
      ) STRICT;
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
  const findReceipt = db.prepare('SELECT 1 FROM event_receipts WHERE id = ?');
  const selectStage = db.prepare('SELECT stage FROM world_progress WHERE singleton = 1');
  const unlockStage = db.prepare('UPDATE world_progress SET stage = MAX(stage, ?) WHERE singleton = 1');
  const prune = db.prepare('DELETE FROM event_receipts WHERE accepted_at < ?');
  const selectDebt = db.prepare('SELECT player_id, debt FROM ranked_opportunity_debt');
  const writeDebt = db.prepare('INSERT INTO ranked_opportunity_debt VALUES (?, ?) ON CONFLICT(player_id) DO UPDATE SET debt=excluded.debt');
  const clearDebt = db.prepare('DELETE FROM ranked_opportunity_debt WHERE player_id = ?');
  const ledger = participation ? {
    findSettlement: db.prepare('SELECT 1 FROM ranked_settlements WHERE raid_instance_id = ?'),
    findWindow: db.prepare('SELECT 1 FROM ranked_windows WHERE window_id = ?'),
    sequences: db.prepare(`SELECT
      COALESCE((SELECT MAX(window_commit_seq) FROM ranked_windows), 0) AS window_seq,
      COALESCE((SELECT MAX(settlement_seq) FROM ranked_settlements), 0) AS raid_seq`),
    window: db.prepare("INSERT INTO ranked_windows VALUES (?, ?, ?, 'committed')"),
    settlement: db.prepare('INSERT INTO ranked_settlements VALUES (?, ?, ?, ?)'),
    state: db.prepare(`INSERT INTO ranked_state VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(player_id) DO UPDATE SET eligible_raids=excluded.eligible_raids,
      served_raids=excluded.served_raids, ever_executed=excluded.ever_executed,
      first_eligible_seq=excluded.first_eligible_seq, last_served_seq=excluded.last_served_seq`),
  } : undefined;

  function commitBatch(
    players: readonly Player[],
    receipts: readonly { id: string; at: number }[],
    nextStage?: number,
    debtChanges?: ReadonlyMap<string, number>,
    participationCommit?: ParticipationCommit,
  ) {
    db.exec('BEGIN IMMEDIATE');
    try {
      if (participationCommit) {
        if (!ledger) throw new Error('Ranked participation storage is disabled');
        const { window, settlement, changes } = participationCommit;
        const raidId = settlement?.raidId ?? window?.raidId;
        if (window && settlement && window.raidId !== settlement.raidId) throw new Error('Ranked raid identity mismatch');
        if ((raidId !== undefined && ledger.findSettlement.get(raidId)) ||
            (window && ledger.findWindow.get(window.id))) {
          db.exec('ROLLBACK');
          return false;
        }
        const sequences = ledger.sequences.get();
        if ((window && window.sequence !== Number(sequences?.window_seq) + 1) ||
            (settlement && settlement.sequence !== Number(sequences?.raid_seq) + 1)) {
          throw new Error('Ranked participation sequence mismatch');
        }
        if (window) ledger.window.run(window.id, window.sequence, window.raidId);
        if (settlement) ledger.settlement.run(settlement.raidId, settlement.sequence, settlement.stage, settlement.at);
        for (const [id, stats] of changes) {
          ledger.state.run(id, stats.eligibleRaids, stats.servedRaids, Number(stats.everExecuted),
            stats.firstEligibleSeq, stats.lastServedSeq);
        }
      }
      for (const event of receipts) {
        if (!receipt.run(event.id, event.at).changes) {
          db.exec('ROLLBACK');
          return false;
        }
      }
      for (const player of players) profile.run(player.id, JSON.stringify(player));
      if (nextStage !== undefined) unlockStage.run(nextStage);
      if (debtChanges) {
        for (const [id, debt] of debtChanges) {
          if (debt === 0) clearDebt.run(id);
          else writeDebt.run(id, debt);
        }
      }
      db.exec('COMMIT');
      return true;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

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
    loadOpportunityDebt: () => new Map(selectDebt.all().map(row => [String(row.player_id), Number(row.debt)])),
    loadParticipation() {
      if (!ledger) throw new Error('Ranked participation storage is disabled');
      const sequences = ledger.sequences.get();
      const history = new Map<string, Participation>();
      for (const row of db.prepare('SELECT * FROM ranked_state ORDER BY player_id').all()) {
        history.set(String(row.player_id), {
          eligibleRaids: Number(row.eligible_raids), servedRaids: Number(row.served_raids),
          everExecuted: row.ever_executed === 1, firstEligibleSeq: Number(row.first_eligible_seq),
          lastServedSeq: row.last_served_seq === null ? null : Number(row.last_served_seq),
        });
      }
      return { history, windowSeq: Number(sequences?.window_seq ?? 0), settlementSeq: Number(sequences?.raid_seq ?? 0) };
    },
    hasReceipt: (id: string) => !!findReceipt.get(id),
    commitBatch,
    commit(players: Player[], event?: GameEvent, now = Date.now(), nextStage?: number) {
      return commitBatch(players, event ? [{ id: event.id, at: now }] : [], nextStage);
    },
    prune: (now: number) => prune.run(now - 86400000),
    close: () => db.close(),
  };
}
