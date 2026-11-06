import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket, WebSocketServer } from 'ws';

const upstream = new WebSocketServer({ host: '127.0.0.1', port: 0 });
await once(upstream, 'listening');
const upstreamOrigin = 'ws://127.0.0.1:' + upstream.address().port;
const base = 'http://127.0.0.1:4219';
const directory = await mkdtemp(join(tmpdir(), 'rebirth-live-loopback-'));
const database = join(directory, 'synthetic.sqlite');
// Redirect only the provider origin in this test child. No runtime override or real key.
const loader = `import { registerHooks } from 'node:module';
registerHooks({load(url, context, next) {
  const result = next(url, context);
  if (!new URL(url).pathname.endsWith('/packages/tiktok-adapter/euler.ts')) return result;
  const source = Buffer.from(result.source).toString();
  const origin = "'wss://ws.eulerstream.com'";
  if (!source.includes(origin)) throw new Error('Expected Euler fixture origin');
  return {...result, source: source.replace(origin, ${JSON.stringify(JSON.stringify(upstreamOrigin))})};
}});`;
const server = spawn(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(loader), 'apps/server/index.ts'], {
  env: {...process.env, PORT: '4219', DB_PATH: database, REBIRTH_MODE: 'live',
    TIKTOK_CHANNEL: 'synthetic_qa', EULER_API_KEY: 'synthetic-only', TIKTOK_GIFT_MAP: '{"1234":5}'},
  stdio: ['ignore', 'pipe', 'pipe'],
});
const closed = once(server, 'close');
let ready = false, errors = '', downstream, state;
const connections = [];
const liveStatuses = new Set();
upstream.on('connection', (socket, request) => {
  connections.push({socket, url: new URL(request.url, upstreamOrigin)});
  socket.send(JSON.stringify({type: 'room.status', data: {state: 'connected'}}));
});
server.stdout.on('data', data => { if (String(data).includes('RE:BIRTH LIVE · ' + base)) ready = true; });
server.stderr.on('data', data => { errors += String(data); });
async function until(predicate) {
  for (let attempt = 0; attempt < 250; attempt++) {
    if (predicate()) return;
    assert.equal(server.exitCode, null, errors);
    await sleep(25);
  }
  assert.fail('Timed out waiting for loopback LIVE state');
}
function post(path, body) {
  return fetch(base + path, {method: 'POST', headers: {Origin: base, 'Content-Type': 'application/json'},
    body: JSON.stringify(body), signal: AbortSignal.timeout(3000)});
}
const user = {userId: '9007199254740993999', uniqueId: 'qa_synthetic', nickname: 'Synthetic QA'};
const chat = (msgId, comment) => ({type: 'WebcastChatMessage', data: {user, event: {msgId}, comment}});
const gift = (msgId, repeatEnd) => ({type: 'WebcastGiftMessage', data: {user, event: {msgId}, repeatEnd,
  giftId: 1234, giftDetails: {giftType: 1}, groupId: '456'}});
const send = (connection, message) => connections[connection].socket.send(JSON.stringify(message));
try {
  await until(() => ready && connections.length === 1);
  assert.equal(connections[0].url.searchParams.get('schemaVersion'), 'v1');
  downstream = new WebSocket(base.replace('http:', 'ws:') + '/state', {origin: base});
  downstream.on('message', data => {
    state = JSON.parse(String(data));
    liveStatuses.add(state.live);
  });
  await until(() => state?.mode === 'live' && state.live === 'connected');
  assert.equal((await post('/event', {kind: 'chat', command: '!join'})).status, 409);
  send(0, chat('101', '!join'));
  await until(() => state.players.length === 1);
  assert.equal(state.players[0].id, 'live:' + user.userId);
  assert.equal((await post('/admin', 'practice')).status, 204);
  await until(() => state.raid.phase === 'PHASE_1');
  send(0, chat('102', '!attack'));
  await until(() => state.players[0].contribution > 0);
  send(0, gift('103', 0));
  send(0, gift('104', 1));
  await until(() => state.raid.supportPet?.player === state.players[0].id);
  const support = state.raid.supportPet;
  connections[0].socket.close(1011);
  await until(() => connections.length === 2 && state.live === 'connected');
  assert.ok(liveStatuses.has('retrying'));
  send(1, gift('105', 1));
  send(1, chat('106', '!stats'));
  await until(() => state.logs[0]?.includes('EXP'));
  assert.deepEqual(state.raid.supportPet, support);
  assert.deepEqual(state.raid.usedGifts, ['mock-5']);
  assert.equal((await post('/admin', 'shutdown')).status, 204);
  assert.equal((await closed)[0], 0, errors);
  const db = new DatabaseSync(database, {readOnly: true});
  try {
    assert.equal(db.prepare('SELECT count(*) AS total FROM event_receipts').get().total, 4);
    assert.equal(db.prepare('SELECT count(*) AS total FROM players').get().total, 1);
    assert.equal(db.prepare('SELECT stage FROM world_progress').get().stage, 1);
  } finally { db.close(); }
  console.log('PASS: loopback Euler comments, completed gift, reconnect deduplication and SQLite persistence.');
} finally {
  downstream?.terminate();
  if (server.exitCode === null && server.signalCode === null) { server.kill(); await closed; }
  for (const socket of upstream.clients) socket.terminate();
  await new Promise(resolve => upstream.close(resolve));
  for (const suffix of ['', '-shm', '-wal']) await rm(database + suffix, {force: true});
  await rmdir(directory);
}
