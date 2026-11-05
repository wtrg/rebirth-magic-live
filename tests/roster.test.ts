import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { openStore } from '../apps/server/store.ts';
import { applyEvent, newGame } from '../packages/combat/index.ts';
import type { GameSnapshot } from '../packages/shared/index.ts';

test('archived viewers rejoin without consuming permanent raid slots', { timeout: 20000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(),'rebirth-roster-'));
  const database = join(directory,'roster.sqlite');
  const base = 'http://127.0.0.1:4187';
  const seed = newGame();
  for (let i = 0; i < 64; i++) applyEvent(seed,{
    id:'seed:'+i,user:'viewer:'+i,name:'Viewer '+i,kind:'chat',command:'!join',
  },1000);
  Object.assign(seed.players[0], { xp:77, score:900, owned:1, pet:0, inventory:['ember'], equipment:{weapon:'ember'} });
  const store = openStore(database);
  store.commit(seed.players);
  store.close();
  const server = spawn(process.execPath,['apps/server/index.ts'], {
    env:{...process.env,PORT:'4187',DB_PATH:database,REBIRTH_MODE:'mock',REBIRTH_RECORD_REPLAY:'0'},
    stdio:['ignore','pipe','pipe'],
  });
  const closed = once(server,'close');
  let output = '', errors = '', serial = 0;
  let socket: WebSocket | undefined;
  let state: GameSnapshot | undefined;
  server.stdout.on('data',data => { output += String(data); });
  server.stderr.on('data',data => { errors += String(data); });
  async function until(check: () => boolean) {
    for (let i = 0; i < 150; i++) {
      if (check()) return;
      assert.equal(server.exitCode,null,errors);
      await sleep(25);
    }
    assert.fail('Timed out waiting for roster state');
  }
  async function post(path: string, body: unknown) {
    const response = await fetch(base+path,{ method:'POST', headers:{Origin:base,'Content-Type':'application/json'},
      body:JSON.stringify(body), signal:AbortSignal.timeout(5000) });
    assert.ok(response.ok,'Unexpected HTTP '+response.status);
  }
  const chat = (i: number, command: string) => post('/event',{
    id:'roster:'+ ++serial,user:'viewer:'+i,name:'Viewer '+i,kind:'chat',command,
  });
  try {
    await until(() => output.includes('RE:BIRTH MOCK · '+base));
    socket = new WebSocket(base.replace('http:','ws:')+'/state',{origin:base});
    socket.on('message',data => { state = JSON.parse(String(data)) as GameSnapshot; });
    await until(() => !!state);
    assert.equal(state!.players.length,0);
    assert.equal(state!.leaderboard?.[0].score,900);
    await Promise.all(Array.from({length:64},(_,i) => chat(i,'!join')));
    await until(() => state?.players.length === 64);
    await chat(64,'!join');
    await sleep(210);
    assert.equal(state!.players.length,64);
    await chat(0,'!leave');
    await until(() => state?.players.length === 63);
    await chat(64,'!join');
    await until(() => !!state?.players.some(player => player.id === 'viewer:64'));
    assert.equal(state!.players.length,64);
    assert.equal(state!.leaderboard?.[0].score,900);
    await chat(1,'!rank');
    await until(() => !!state?.logs[0].includes('Viewer 0 · 900'));
    await post('/admin','clear-roster');
    await until(() => state?.players.length === 0);
    await sleep(210);
    await chat(0,'!join	 fire');
    await until(() => state?.players.length === 1);
    const returning = state!.players[0];
    assert.equal(returning.xp,77);
    assert.equal(returning.score,900);
    assert.equal(returning.pet,0);
    assert.equal(returning.equipment?.weapon,'ember');
    await post('/admin','start');
    await until(() => state?.raid.phase === 'SPAWN');
    assert.equal(state!.raid.maxHp,480);
    await sleep(210);
    await chat(0,'!leave');
    await until(() => !!state?.logs[0].includes('Chờ trận kết thúc'));
    assert.equal(state!.players.length,1);
    const beforePause = Date.now();
    await post('/admin','pause');
    await until(() => state?.paused === true);
    assert.ok(state!.pausedAt! >= beforePause && state!.pausedAt! <= Date.now());
    const pausedAt = state!.pausedAt;
    const lateClient = new WebSocket(base.replace('http:','ws:')+'/state',{origin:base});
    try {
      const [message] = await once(lateClient,'message');
      const lateState = JSON.parse(String(message)) as GameSnapshot;
      assert.equal(lateState.pausedAt,pausedAt);
      assert.equal(lateState.paused,true);
    } finally { lateClient.terminate(); }
    await post('/admin','resume');
    await until(() => state?.paused === false);
    assert.equal(state!.pausedAt,undefined);
    await post('/admin','shutdown');
    assert.equal((await closed)[0],0,errors);
    const saved = openStore(database);
    try {
      assert.equal(saved.load().length,65);
      assert.equal(saved.find('viewer:0')?.xp,77);
      assert.equal(saved.leaderboard()[0].score,900);
    } finally { saved.close(); }
  } finally {
    socket?.terminate();
    if (server.exitCode === null && server.signalCode === null) server.kill();
    await closed;
    await rm(directory,{recursive:true,force:true,maxRetries:5});
  }
});
