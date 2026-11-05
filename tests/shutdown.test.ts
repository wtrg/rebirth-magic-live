import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { DatabaseSync } from 'node:sqlite';

test('local shutdown drains accepted events and closes the database', { timeout: 20000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(),'rebirth-shutdown-'));
  const database = join(directory,'shutdown.sqlite');
  const base = 'http://127.0.0.1:4185';
  const server = spawn(process.execPath,['apps/server/index.ts'], {
    env: { ...process.env, PORT:'4185', DB_PATH:database, REBIRTH_MODE:'mock', REBIRTH_RECORD_REPLAY:'0' },
    stdio:['ignore','pipe','pipe'],
  });
  const closed = once(server,'close');
  let ready = false;
  let errors = '';
  server.stdout.on('data', chunk => { if (String(chunk).includes(base)) ready = true; });
  server.stderr.on('data', chunk => { errors += String(chunk); });
  const post = (path: string, payload: unknown, origin = base) => fetch(base + path, {
    method:'POST', headers:{ Origin:origin, 'Content-Type':'application/json' },
    body:JSON.stringify(payload), signal:AbortSignal.timeout(5000),
  });
  try {
    for (let i = 0; i < 100 && !ready; i++) {
      assert.equal(server.exitCode,null,errors);
      await setTimeout(40);
    }
    assert.ok(ready,'Server did not bind its QA port');
    assert.equal((await post('/admin','shutdown','http://other.test')).status,403);
    const users = Array.from({length:64},(_,i) => 'shutdown:' + i);
    const statuses = await Promise.all(users.map(user => post('/event',{
      id:user, user, name:user, kind:'chat', command:'!join',
    }).then(response => response.status)));
    assert.ok(statuses.every(status => status === 202));
    assert.equal((await post('/admin','shutdown')).status,204);
    const [exitCode] = await closed;
    assert.equal(exitCode,0,errors);
    const saved = new DatabaseSync(database,{readOnly:true});
    try {
      assert.equal(saved.prepare('PRAGMA quick_check').get()?.quick_check,'ok');
      assert.equal(saved.prepare('SELECT COUNT(*) AS n FROM players').get()?.n,64);
      assert.equal(saved.prepare('SELECT COUNT(*) AS n FROM event_receipts').get()?.n,64);
    } finally {
      saved.close();
    }
  } finally {
    if (server.exitCode === null && server.signalCode === null) server.kill();
    await closed;
    await rm(directory,{recursive:true,force:true,maxRetries:5});
  }
});
