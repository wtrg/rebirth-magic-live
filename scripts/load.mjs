import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';

const seconds = Number(process.env.QA_LOAD_SECONDS ?? 60);
assert.ok(Number.isInteger(seconds) && seconds >= 15 && seconds <= 43200);
const port = Number(process.env.QA_LOAD_PORT ?? 4183);
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
const base = 'http://127.0.0.1:' + port;
const dir = await mkdtemp(join(tmpdir(), 'rebirth-load-'));
const telemetry = 'setInterval(() => console.log("QA_MEMORY " + JSON.stringify(process.memoryUsage())), 5000).unref()';
const server = spawn(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(telemetry), 'apps/server/index.ts'], {
  env: { ...process.env, PORT: String(port), DB_PATH: join(dir,'load.sqlite'), REBIRTH_MODE:'mock', REBIRTH_RECORD_REPLAY:'0' },
  stdio: ['ignore','pipe','inherit'],
});
const closed = once(server, 'close');
const memory = [];
let lineBuffer = '';
let ready = false;
server.stdout.setEncoding('utf8');
server.stdout.on('data', text => {
  lineBuffer += text;
  const lines = lineBuffer.split('\n');
  lineBuffer = lines.pop();
  for (const line of lines) {
    if (line.startsWith('QA_MEMORY ')) memory.push(JSON.parse(line.slice(10)));
    if (line.trimEnd() === 'RE:BIRTH MOCK · ' + base) ready = true;
  }
});
const clients = [];
const updates = [];
const latencies = [];
let serial = 0;
let snapshot;
let accepted = 0;
let throttled = 0;
let peakQueue = 0;

async function waitFor(check, timeout = 10000) {
  const deadline = performance.now() + timeout;
  while (!await check()) {
    assert.equal(server.exitCode, null, 'Server exited');
    if (performance.now() > deadline) throw new Error('Timed out waiting for QA state');
    await sleep(40);
  }
}
async function health() {
  const res = await fetch(base + '/health', { signal:AbortSignal.timeout(4000) });
  assert.equal(res.status, 200);
  const result = await res.json();
  assert.equal(result.mode, 'mock');
  assert.ok(result.queue >= 0 && result.queue <= 128);
  peakQueue = Math.max(peakQueue, result.queue);
  return result;
}
async function post(path, payload) {
  const start = performance.now();
  const response = await fetch(base + path, {
    method:'POST', headers:{ Origin:base,'Content-Type':'application/json' },
    body:JSON.stringify(payload), signal:AbortSignal.timeout(8000),
  });
  if (path === '/event') latencies.push(performance.now() - start);
  return response.status;
}
const chat = (user, command) => post('/event', { kind:'chat', id:'load:' + ++serial, user, name:user, command });
const wave = (count, action) => Promise.all(Array.from({length:count}, (_, index) => action(index)));
const mib = bytes => Math.round(bytes / 1048576 * 10) / 10;

try {
  await waitFor(() => ready);
  await health();
  for (let index = 0; index < 8; index++) {
    const socket = new WebSocket(base.replace('http:', 'ws:') + '/state', { origin:base });
    clients.push(socket);
    updates.push(0);
    socket.on('message', data => {
      updates[index]++;
      if (index === 0) snapshot = JSON.parse(String(data));
    });
    await once(socket, 'open');
    socket.on('error', () => {});
  }
  assert.ok((await wave(64, index => chat('mage:' + index,'!join'))).every(status => status === 202));
  await waitFor(() => snapshot?.players.length === 64);
  assert.equal(await post('/admin','start'),204);
  await waitFor(() => snapshot?.raid.phase === 'PHASE_1');
  const spam = await wave(24, () => chat('spam','!attack'));
  assert.ok(spam.includes(429), 'Per-viewer throttling must reject spam');
  const burst = await wave(256, index => chat('burst:' + index,'!stats'));
  assert.ok(burst.includes(429), 'Global queue must reject overload');
  assert.ok(burst.every(status => status === 202 || status === 429));
  await waitFor(async () => (await health()).queue === 0);
  latencies.length = 0;
  const started = performance.now();
  const measuredFrom = memory.length;
  while (performance.now() - started < seconds * 1000) {
    const at = performance.now();
    if (snapshot?.raid.result) assert.equal(await post('/admin','start'),204);
    const results = await wave(64, index => chat('mage:' + index,'!attack'));
    for (const status of results) {
      if (status === 202) accepted++;
      else if (status === 429) throttled++;
      else assert.fail('Unexpected HTTP status ' + status);
    }
    await health();
    await sleep(Math.max(0, 250 - (performance.now() - at)));
  }
  await waitFor(async () => (await health()).queue === 0);
  assert.ok(accepted > 0 && updates.every(count => count > 10));
  assert.ok(clients.every(socket => socket.readyState === WebSocket.OPEN));
  assert.equal(snapshot.players.length,64);
  assert.ok(snapshot.raid.stage > 1, 'Expected ranked raid progression under load');
  const samples = memory.slice(measuredFrom);
  assert.ok(samples.length >= 2, 'Expected memory telemetry from the server');
  const sorted = latencies.sort((a,b) => a-b);
  const percentile = p => Math.round(sorted[Math.floor((sorted.length - 1) * p)] * 10) / 10;
  console.log(JSON.stringify({
    seconds: Math.round((performance.now() - started) / 1000),
    players:64, clients:8, accepted, throttled,
    overloadRejected:burst.filter(status => status === 429).length, peakQueue,
    updatesPerClient:Math.min(...updates), stage:snapshot.raid.stage,
    requestMs:{ p50:percentile(0.5), p95:percentile(0.95), p99:percentile(0.99), max:percentile(1) },
    rssMiB:samples.map(sample => mib(sample.rss)), heapMiB:samples.map(sample => mib(sample.heapUsed)),
  }));
} finally {
  for (const socket of clients) socket.terminate();
  if (server.exitCode === null && server.signalCode === null) server.kill();
  await closed;
  await rm(dir, { recursive:true, force:true, maxRetries:5 });
}
