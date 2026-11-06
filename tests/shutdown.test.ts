import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { request } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { WebSocket } from 'ws';
import { openStore } from '../apps/server/store.ts';
import { applyEvent, newGame, nextRaidStage } from '../packages/combat/index.ts';
import { playReplayWithDebt } from '../apps/server/replay.ts';
import type { GameSnapshot } from '../packages/shared/index.ts';

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
    await setTimeout(210);
    assert.equal((await post('/event', {
      id:'class-before-start', user:'shutdown:0', name:'Hỏa Pháp Sư', kind:'chat', command:'!class ice',
    })).status,202);
    // Join and class selection must apply before the immediately following admin action.
    assert.equal((await post('/admin','start')).status,204);
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
      assert.equal(JSON.parse(String(profile?.profile)).classId,'ice');
      assert.equal(saved.prepare('SELECT COUNT(*) AS n FROM event_receipts').get()?.n,65);
    } finally {
      saved.close();
    }
  } finally {
    if (server.exitCode === null && server.signalCode === null) server.kill();
    await closed;
    await rm(directory,{recursive:true,force:true,maxRetries:5});
  }
});

for (const scenario of ['terminal', 'nonterminal', 'rollback', 'participation-terminal', 'participation-nonterminal']) test('ranked window HTTP and SQLite: ' + scenario, { timeout: 15000 }, async () => {
  const terminal = !scenario.endsWith('nonterminal');
  const participation = scenario.startsWith('participation-');
  const directory = await mkdtemp(join(tmpdir(), 'rebirth-ranked-shutdown-'));
  const database = join(directory, 'synthetic.sqlite');
  const replayFile = join(directory, 'shutdown.json');
  const base = 'http://127.0.0.1:4227';
  const seed = newGame();
  const chat = (user: string, command: string) => ({ id: user + ':' + command.slice(1), user, name: user, kind: 'chat' as const, command });
  const winner = 'mock:shutdown-a', other = 'mock:shutdown-b';
  for (const id of [winner, other]) applyEvent(seed, chat(id, '!join'), 1);
  if (terminal) seed.players[0].level = 1100;
  if (participation && terminal) seed.players[1].level = 1100;
  const initial = openStore(database);
  initial.commitBatch(seed.players, [], undefined, new Map([[winner, 5]]));
  initial.close();
  const launch = (outputFile = '') => spawn(process.execPath, ['apps/server/index.ts'], {
    env: { ...process.env, PORT: '4227', DB_PATH: database, REBIRTH_MODE: 'mock',
      REBIRTH_RANKED_SCHEDULER: participation ? 'ranked-participation-v1' : '1',
      REBIRTH_RECORD_REPLAY: '1', REBIRTH_MOCK_REPLAY_FILE: outputFile },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let server = launch(replayFile);
  let closed = once(server, 'close');
  let output = '', errors = '';
  let socket: WebSocket | undefined;
  let snapshot: GameSnapshot | undefined;
  function watchServer() {
    server.stdout.on('data', chunk => { output += String(chunk); });
    server.stderr.on('data', chunk => { errors += String(chunk); });
  }
  watchServer();
  const post = async (path: string, payload: unknown, status: number) => {
    const response = await fetch(base + path, {
      method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(3000),
    });
    assert.equal(response.status, status);
  };
  async function until(predicate: () => boolean) {
    for (let i = 0; i < 240; i++) {
      if (predicate()) return;
      assert.equal(server.exitCode, null, errors);
      await setTimeout(20);
    }
    assert.fail('Timed out waiting for ranked shutdown fixture');
  }
  try {
    await until(() => output.includes(base));
    socket = new WebSocket(base.replace('http:', 'ws:') + '/state', { origin: base });
    socket.on('message', data => { snapshot = JSON.parse(String(data)) as GameSnapshot; });
    await Promise.all([winner, other].map(id => post('/event', chat(id, '!join'), 202)));
    await until(() => snapshot?.players.length === 2);
    await post('/admin', 'start', 204);
    await until(() => snapshot?.raid.phase === 'PHASE_1');
    const first = chat(winner, '!attack'), second = chat(other, '!attack');
    const sentAt = performance.now();
    await post('/event', second, 202);
    await post('/event', first, 202);
    if (scenario === 'rollback') {
      // Valid chat packets from outside the raid must not fill ranked slots.
      await Promise.all(Array.from({ length: 65 }, (_, i) =>
        post('/event', chat('mock:outside-' + i, '!attack'), 202)));
    }
    // Wait for the scheduler tick to move these commands from ingress into its window.
    await setTimeout(90);
    const health = await (await fetch(base + '/health', { signal: AbortSignal.timeout(3000) })).json();
    assert.equal(health.queue, 2);
    assert.equal(snapshot?.raid.result, null);
    if (scenario === 'rollback') {
      const fault = new DatabaseSync(database);
      try {
        fault.exec(`CREATE TRIGGER reject_settlement BEFORE UPDATE ON ranked_opportunity_debt
          BEGIN SELECT RAISE(ABORT, 'synthetic settlement failure'); END`);
      } finally { fault.close(); }
      await until(() => snapshot?.paused === true);
      const trace = await (await fetch(base + '/replay', { signal: AbortSignal.timeout(3000) })).json();
      assert.ok(trace.steps.some((step: { kind: string; outcome?: string }) =>
        step.kind === 'opportunity' && step.outcome === 'rollback'));
      assert.deepEqual(trace.steps.find((step: { kind: string }) => step.kind === 'opportunity')
        .intents.map((intent: { event: { user: string } }) => intent.event.user), [other, winner]);
      const { raid, players, logs, paused, effect } = snapshot!;
      assert.deepEqual(playReplayWithDebt(trace), {
        state: { raid, players, logs, paused, effect }, debt: new Map([[winner, 5]]),
      });
      assert.equal(raid.result, null);
      assert.ok(players.every(player => player.lastHit === 0 && player.wins === 0));
    }
    await post('/admin', 'shutdown', 204);
    if (scenario !== 'rollback') assert.ok(performance.now() - sentAt < 400, 'Shutdown must occur before the opening window expires');
    assert.equal((await closed)[0], 0, errors);
    if (participation) {
      const trace = JSON.parse(await readFile(replayFile, 'utf8'));
      assert.equal(trace.version, 14);
      assert.equal(trace.policyId, 'ranked-participation-v1');
      const replayed = playReplayWithDebt(trace);
      const windowStep = trace.steps.at(-1);
      assert.equal(windowStep.reason, 'shutdown');
      assert.equal(windowStep.terminal, terminal);
      assert.throws(() => playReplayWithDebt({ ...trace, steps: [
        ...trace.steps.slice(0, -1), { ...windowStep, windowSeq: 2 },
      ] }), /Invalid participation window sequence/);
      const saved = openStore(database, true);
      try {
        const { history, windowSeq, settlementSeq } = saved.loadParticipation();
        assert.deepEqual(replayed.participation, { history, windowSeq, settlementSeq });
        assert.equal(replayed.state.raid.result, terminal ? 'victory' : null);
        for (const player of replayed.state.players) assert.deepEqual(player, saved.find(player.id));
        assert.equal(windowSeq, 1);
        assert.equal(settlementSeq, Number(terminal));
        assert.equal(saved.loadStage(), terminal ? 2 : 1);
        assert.deepEqual(saved.loadOpportunityDebt(), new Map([[winner, 5]]));
        assert.equal(history.size, 2);
        for (const id of [winner, other]) {
          // With two new identities, the stage-one stable hash puts B first.
          const served = !terminal || id === other;
          assert.ok(saved.hasReceipt(chat(id, '!attack').id));
          assert.deepEqual(history.get(id), {
            eligibleRaids: Number(terminal), servedRaids: Number(terminal && served), everExecuted: served,
            firstEligibleSeq: 1, lastServedSeq: served ? 1 : null,
          });
        }
      } finally { saved.close(); }
      return;
    }
    const shutdownTrace = JSON.parse(await readFile(replayFile, 'utf8'));
    const shutdownReplay = playReplayWithDebt(shutdownTrace);
    const saved = openStore(database);
    try {
      assert.deepEqual(shutdownReplay.debt, saved.loadOpportunityDebt());
      for (const { id, lastHit, wins } of shutdownReplay.state.players) {
        assert.equal(lastHit, saved.find(id)?.lastHit);
        assert.equal(wins, saved.find(id)?.wins);
      }
      if (scenario === 'rollback') {
        assert.equal(saved.hasReceipt(first.id), false);
        assert.equal(saved.hasReceipt(second.id), false);
        assert.equal(saved.find(winner)?.wins, 0);
        assert.equal(saved.loadStage(), 1);
        assert.deepEqual(saved.loadOpportunityDebt(), new Map([[winner, 5]]));
        return;
      }
      const lastStep = shutdownTrace.steps.at(-1);
      assert.equal(lastStep.kind, 'opportunity');
      assert.equal(lastStep.reason, 'shutdown');
      assert.equal(lastStep.outcome, 'committed');
      assert.equal(lastStep.terminal, terminal);
      assert.equal(nextRaidStage(shutdownReplay.state), saved.loadStage());
      assert.ok(saved.hasReceipt(first.id) && saved.hasReceipt(second.id));
      assert.ok((saved.find(winner)?.lastHit ?? 0) > 0);
      assert.equal(saved.find(other)?.lastHit === 0, terminal);
      assert.equal(saved.find(winner)?.wins, terminal ? 1 : 0);
      assert.equal(saved.find(other)?.wins, 0);
      assert.equal(saved.loadStage(), terminal ? 2 : 1);
      assert.deepEqual(saved.loadOpportunityDebt(), new Map(terminal ? [[winner, 4], [other, 1]] : [[winner, 5]]));
    } finally {
      saved.close();
    }
    if (scenario === 'terminal') {
      socket.terminate();
      snapshot = undefined;
      output = errors = '';
      server = launch();
      closed = once(server, 'close');
      watchServer();
      await until(() => output.includes(base));
      const trace = await (await fetch(base + '/replay', { signal: AbortSignal.timeout(3000) })).json();
      const restored = playReplayWithDebt(trace);
      assert.equal(restored.state.raid.stage, 2);
      assert.deepEqual(restored.debt, new Map([[winner, 4], [other, 1]]));
      socket = new WebSocket(base.replace('http:', 'ws:') + '/state', { origin: base });
      socket.on('message', data => { snapshot = JSON.parse(String(data)) as GameSnapshot; });
      await post('/event', { ...chat(winner, '!join'), id: 'restarted-join' }, 202);
      await until(() => snapshot?.players[0]?.wins === 1);
      await post('/admin', 'practice', 204);
      await until(() => snapshot?.raid.practice === true && snapshot.raid.phase === 'PHASE_1');
      await post('/event', { ...first, id: 'practice-attack' }, 202);
      await until(() => snapshot?.raid.result === 'victory');
      const practiceTrace = await (await fetch(base + '/replay', { signal: AbortSignal.timeout(3000) })).json();
      assert.ok(practiceTrace.steps.some((step: { kind: string; event?: { id: string } }) =>
        step.kind === 'event' && step.event?.id === 'practice-attack'));
      assert.ok(practiceTrace.steps.every((step: { kind: string }) => step.kind !== 'opportunity'));
      const practice = playReplayWithDebt(practiceTrace);
      const { raid, players, logs, paused, effect } = snapshot!;
      assert.deepEqual(practice.state, { raid, players, logs, paused, effect });
      assert.deepEqual(practice.debt, restored.debt);
      assert.equal(players[0].wins, 1);
      await post('/admin', 'shutdown', 204);
      assert.equal((await closed)[0], 0, errors);
      const afterPractice = openStore(database);
      try {
        assert.equal(afterPractice.loadStage(), 2);
        assert.equal(afterPractice.find(winner)?.wins, 1);
        assert.deepEqual(afterPractice.loadOpportunityDebt(), restored.debt);
      } finally { afterPractice.close(); }
    }
  } finally {
    socket?.terminate();
    if (server.exitCode === null && server.signalCode === null) server.kill();
    await closed;
    await rm(directory, { recursive: true, force: true, maxRetries: 5 });
  }
});
