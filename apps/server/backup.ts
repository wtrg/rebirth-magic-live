import { link, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

export async function backupDatabase(source: string, destination: string) {
  const output = resolve(destination);
  const db = new DatabaseSync(resolve(source), { readOnly: true, timeout: 5000 });
  let work: string | undefined;
  try {
    const version = db.prepare('PRAGMA user_version').get()?.user_version;
    if (version !== 1 && version !== 2) throw new Error('Unsupported RE:BIRTH database version');
    db.prepare('SELECT id, profile FROM players LIMIT 0');
    db.prepare('SELECT id, accepted_at FROM event_receipts LIMIT 0');
    if (version === 2) db.prepare('SELECT stage FROM world_progress LIMIT 0');
    await mkdir(dirname(output), { recursive: true });
    work = await mkdtemp(join(dirname(output), '.rebirth-backup-'));
    const snapshot = join(work, 'snapshot.sqlite');
    await backup(db, snapshot);
    const check = new DatabaseSync(snapshot, { readOnly: true });
    try {
      if (check.prepare('PRAGMA quick_check').get()?.quick_check !== 'ok') throw new Error('Backup failed SQLite integrity check');
    } finally {
      check.close();
    }
    // The snapshot lives on the same volume, so publication is atomic and refuses overwrite.
    await link(snapshot, output);
  } finally {
    db.close();
    if (work) {
      for (const suffix of ['', '-wal', '-shm', '-journal']) await rm(join(work, 'snapshot.sqlite' + suffix), { force: true });
      await rmdir(work);
    }
  }
}
