import { createServer, type IncomingMessage } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { activeRaid, applyEvent, newGame, nextRaidStage, tick } from '../../packages/combat/index.ts';
import { LiveAdapter, normalizeEvent } from '../../packages/tiktok-adapter/index.ts';
import { eulerSource, eulerUrl, normalizeEulerMessage, readGiftMap } from '../../packages/tiktok-adapter/euler.ts';
import type { GameEvent, GameSnapshot } from '../../packages/shared/index.ts';
import { openStore } from './store.ts';
import { applyAdmin, isAdminAction } from './admin.ts';
import { createReplay } from './replay.ts';

const port = Number(process.env.PORT ?? 4173);
const dist = resolve('dist');
const configuredMode = process.env.REBIRTH_MODE ?? 'mock';
if (configuredMode !== 'mock' && configuredMode !== 'live') throw new Error('REBIRTH_MODE must be mock or live.');
const mode: GameSnapshot['mode'] = configuredMode;
const channel = process.env.TIKTOK_CHANNEL?.trim().replace(/^@/, '').toLowerCase() ?? '';
const key = process.env.EULER_API_KEY?.trim();
if (mode === 'live' && (!/^[a-z0-9_.]{2,32}$/.test(channel) || !key)) {
  throw new Error('LIVE requires TIKTOK_CHANNEL and a locally configured EULER_API_KEY.');
}
const sourceUrl = mode === 'live' && key ? eulerUrl(channel, key) : null;
const liveGiftMap = mode === 'live' ? readGiftMap(process.env.TIKTOK_GIFT_MAP ?? '{}') : new Map<string, string>();
const abortLive = new AbortController();
const live = new LiveAdapter(broadcast);
const store = openStore(process.env.DB_PATH ?? (mode === 'live' ? 'data/rebirth-live.sqlite' : 'data/rebirth.sqlite'));
let state = newGame(store.load(), store.loadStage());
const replay = mode === 'mock' && process.env.REBIRTH_RECORD_REPLAY === '1' ? createReplay(state) : null;
const queue: GameEvent[] = [];
let stopping = false;
const lastEvent = new Map<string, number>();
const adminClock = { pausedAt: 0 };
const hosts = new Set(['127.0.0.1:' + port, 'localhost:' + port]);
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };

function sameOrigin(req: IncomingMessage) {
  return req.headers.origin === 'http://' + req.headers.host;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let body = '';
  for await (const chunk of req) {
    body += chunk.toString();
    if (body.length > 2048) throw new Error('payload too large');
  }
  return JSON.parse(body);
}

function enqueue(event: GameEvent, now: number) {
  if (event.kind === 'gift' && !event.complete) return true;
  const limiterKey = event.kind + ':' + event.user;
  if (stopping || state.paused || queue.length >= 128 || lastEvent.size >= 4096 && !lastEvent.has(limiterKey)) return false;
  if (now - (lastEvent.get(limiterKey) ?? 0) < 200) return false;
  lastEvent.set(limiterKey, now);
  queue.push(event);
  return true;
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' ws://127.0.0.1:" + port + " ws://localhost:" + port + "; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
  if (stopping) { res.writeHead(503).end(); return; }
  if (!hosts.has(req.headers.host ?? '')) { res.writeHead(403).end(); return; }
  const path = req.url?.split('?')[0];
  if (path === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', mode, live: live.status, queue: queue.length }));
    return;
  }
  if (path === '/replay' && req.method === 'GET' && replay) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="rebirth-mock-replay.json"');
    res.end(replay.export());
    return;
  }
  if (path === '/event' || path === '/admin') {
    if (req.method !== 'POST' || !sameOrigin(req) || req.headers['content-type'] !== 'application/json') {
      res.writeHead(403).end(); return;
    }
    let body: unknown;
    try { body = await readJson(req); } catch { res.writeHead(400).end(); return; }
    if (stopping) { res.writeHead(503).end(); return; }
    const now = Date.now();
    if (path === '/event') {
      if (mode !== 'mock') { res.writeHead(409).end(); return; }
      const event = normalizeEvent(body);
      if (!event || event.user.startsWith('live:')) { res.writeHead(400).end(); return; }
      if (!enqueue(event, now)) { res.writeHead(429).end(); return; }
      res.writeHead(202).end();
      return;
    }
    if (body === 'shutdown') {
      res.writeHead(204).end();
      shutdown();
      return;
    }
    if (!isAdminAction(body)) { res.writeHead(400).end(); return; }
    if (!applyAdmin(state, body, now, adminClock)) { res.writeHead(409).end(); return; }
    if (body === 'pause') queue.length = 0;
    replay?.record({ kind: 'admin', action: body, at: now });
    broadcast();
    res.writeHead(204).end();
    return;
  }
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  const file = resolve(dist, '.' + (path === '/' ? '/index.html' : path ?? ''));
  try {
    if (!file.startsWith(dist + sep) || !mime[extname(file)] || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', mime[extname(file)]);
    const stream = createReadStream(file);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  } catch { res.writeHead(404).end('Build the frontend with npm run build.'); }
});

const ws = new WebSocketServer({ noServer: true, maxPayload: 256 });
server.on('upgrade', (req, socket, head) => {
  if (stopping || req.url !== '/state' || !hosts.has(req.headers.host ?? '') || !sameOrigin(req) || ws.clients.size >= 32) {
    socket.destroy(); return;
  }
  ws.handleUpgrade(req, socket, head, client => {
    client.on('error', () => client.terminate());
    client.send(snapshot());
  });
});

function snapshot() {
  const data: GameSnapshot = { ...state, mode, live: live.status };
  return JSON.stringify(data);
}

function broadcast() {
  const payload = snapshot();
  for (const client of ws.clients) {
    if (client.bufferedAmount > 256000) client.terminate();
    else if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

function processQueue(now: number, limit: number) {
  for (let i = 0; i < limit && queue.length; i++) {
    const event = queue[0];
    const next = structuredClone(state);
    applyEvent(next, event, now);
    const nextStage = nextRaidStage(next);
    const unlock = nextStage > nextRaidStage(state) ? nextStage : undefined;
    if (store.commit(next.players, event, now, unlock)) {
      state = next;
      replay?.record({ kind: 'event', event, at: now });
    }
    queue.shift();
  }
}

const clock = setInterval(() => {
  if (state.paused || (!queue.length && (!activeRaid(state) && state.raid.phase !== 'SPAWN' || Date.now() < state.raid.next))) return;
  const now = Date.now();
  try {
    const draft = structuredClone(state);
    if (tick(draft, now)) {
      store.commit(draft.players);
      state = draft;
      replay?.record({ kind: 'tick', at: now });
    }
    processQueue(now, 16);
    broadcast();
  } catch {
    applyAdmin(state, 'pause', now, adminClock);
    replay?.record({ kind: 'admin', action: 'pause', at: now });
    queue.length = 0;
    console.error('Local persistence failed. Game paused.');
    broadcast();
  }
}, 50);
const cleanup = setInterval(() => {
  for (const [id, time] of lastEvent) if (Date.now() - time > 10000) lastEvent.delete(id);
  try { store.prune(Date.now()); } catch { console.error('Could not prune event receipts.'); }
}, 10000);
server.listen(port, '127.0.0.1', () => {
  console.log('RE:BIRTH ' + mode.toUpperCase() + ' · http://127.0.0.1:' + port);
  if (sourceUrl) {
    void live.run(eulerSource(sourceUrl), raw => normalizeEulerMessage(raw, liveGiftMap, channel),
      event => enqueue(event, Date.now()), abortLive.signal);
  }
});
server.on('error', () => { console.error('Could not bind the local server.'); shutdown(1); });
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  abortLive.abort();
  clearInterval(clock);
  clearInterval(cleanup);
  try {
    processQueue(Date.now(), queue.length);
  } catch {
    code = 1;
    console.error('Could not commit pending events during shutdown.');
  }
  for (const client of ws.clients) client.terminate();
  ws.close();
  const deadline = setTimeout(() => server.closeAllConnections(), 5000);
  deadline.unref();
  server.close(() => {
    clearTimeout(deadline);
    store.close();
    process.exitCode = code;
  });
}
process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());
