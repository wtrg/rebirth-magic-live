import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { request } from 'node:http';
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
    const rawPost = async (parts: Buffer[]) => {
      const response = new Promise<number>((resolve, reject) => {
        const req = request(base+'/event', { method:'POST', headers:{
          Origin:base, 'Content-Type':'application/json', 'Transfer-Encoding':'chunked',
        } }, res => {
          res.resume();
          res.on('end', () => resolve(res.statusCode ?? 0));
        });
        req.on('error',reject);
        void (async () => {
          for (const part of parts) {
            req.write(part);
            await setTimeout(15);
          }
          req.end();
        })().catch(reject);
      });
      return response;
    };
    const unicode = Buffer.from(JSON.stringify({
      id:'shutdown:0', user:'shutdown:0', name:'Hỏa Pháp Sư', kind:'chat', command:'!join',
    }));
    const split = unicode.indexOf(Buffer.from('ỏ')) + 1;
    assert.equal(await rawPost([unicode.subarray(0,split), unicode.subarray(split)]),202);
    const tooLarge = JSON.stringify({ padding:'火'.repeat(800) });
    assert.equal((await fetch(base+'/event', {
      method:'POST', headers:{Origin:base,'Content-Type':'application/json'},body:tooLarge,
    })).status,413);
    assert.equal(await rawPost([Buffer.alloc(2100,32)]),413);
    assert.equal(await rawPost([Buffer.from([0x22,0xff,0x22])]),400);
    const users = Array.from({length:63},(_,i) => 'shutdown:' + (i+1));
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
      const profile = saved.prepare('SELECT profile FROM players WHERE id = ?').get('shutdown:0');
      assert.equal(JSON.parse(String(profile?.profile)).name,'Hỏa Pháp Sư');
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
