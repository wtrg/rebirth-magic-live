import { createServer, type IncomingMessage } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { activeRaid, applyEvent, beginRaid, newGame, tick } from '../../packages/combat/index.ts';
import { normalizeEvent } from '../../packages/tiktok-adapter/index.ts';
import type { GameEvent } from '../../packages/shared/index.ts';
import { openStore } from './store.ts';

const port = Number(process.env.PORT ?? 4173);
const dist = resolve('dist');
const store = openStore(process.env.DB_PATH ?? 'data/rebirth.sqlite');
let state = newGame(store.load());
const queue: GameEvent[] = [];
const lastEvent = new Map<string, number>();
let pausedAt = 0;
const hosts = new Set(['127.0.0.1:' + port, 'localhost:' + port]);
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

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

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self' ws://127.0.0.1:" + port + " ws://localhost:" + port + "; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
  if (!hosts.has(req.headers.host ?? '')) { res.writeHead(403).end(); return; }
  const path = req.url?.split('?')[0];
  if (path === '/health' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', mode: 'mock', live: 'unconfigured', queue: queue.length }));
    return;
  }
  if (path === '/event' || path === '/admin') {
    if (req.method !== 'POST' || !sameOrigin(req) || req.headers['content-type'] !== 'application/json') {
      res.writeHead(403).end(); return;
    }
    let body: unknown;
    try { body = await readJson(req); } catch { res.writeHead(400).end(); return; }
    const now = Date.now();
    if (path === '/event') {
      const event = normalizeEvent(body);
      if (!event) { res.writeHead(400).end(); return; }
      if (state.paused || queue.length >= 128 || lastEvent.size >= 4096 && !lastEvent.has(event.user)) { res.writeHead(429).end(); return; }
      if (now - (lastEvent.get(event.user) ?? 0) < 200) { res.writeHead(429).end(); return; }
      lastEvent.set(event.user, now);
      if (event.kind !== 'gift' || event.complete) queue.push(event);
      res.writeHead(202).end();
      return;
    }
    if (body === 'start' || body === 'practice') {
      if (!beginRaid(state, now, body === 'practice')) { res.writeHead(409).end(); return; }
    } else if (body === 'pause') {
      if (!state.paused) {
        pausedAt = now;
        state.paused = true;
        queue.length = 0;
      }
    } else if (body === 'resume') {
      if (state.paused) {
        const elapsed = now - pausedAt;
        state.raid.next += elapsed;
        if (state.raid.wardUntil > pausedAt) state.raid.wardUntil += elapsed;
        for (const buff of [state.raid.supportPet, state.raid.awakening]) {
          if (buff && buff.until > pausedAt) buff.until += elapsed;
        }
        for (const player of state.players) player.ready = player.ready.map(time => time > pausedAt ? time + elapsed : time);
        state.paused = false;
      }
    } else { res.writeHead(400).end(); return; }
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
  if (req.url !== '/state' || !hosts.has(req.headers.host ?? '') || !sameOrigin(req) || ws.clients.size >= 32) {
    socket.destroy(); return;
  }
  ws.handleUpgrade(req, socket, head, client => {
    client.on('error', () => client.terminate());
    client.send(JSON.stringify(state));
  });
});

function broadcast() {
  const payload = JSON.stringify(state);
  for (const client of ws.clients) {
    if (client.bufferedAmount > 256000) client.terminate();
    else if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

const clock = setInterval(() => {
  if (state.paused || (!queue.length && (!activeRaid(state) && state.raid.phase !== 'SPAWN' || Date.now() < state.raid.next))) return;
  const now = Date.now();
  try {
    const draft = structuredClone(state);
    if (tick(draft, now)) { store.commit(draft.players); state = draft; }
    for (const event of queue.splice(0, 16)) {
      const next = structuredClone(state);
      applyEvent(next, event, now);
      if (store.commit(next.players, event, now)) state = next;
    }
    broadcast();
  } catch {
    state.paused = true;
    pausedAt = now;
    queue.length = 0;
    console.error('Local persistence failed. Game paused.');
    broadcast();
  }
}, 50);
const cleanup = setInterval(() => {
  for (const [id, time] of lastEvent) if (Date.now() - time > 10000) lastEvent.delete(id);
  try { store.prune(Date.now()); } catch { console.error('Could not prune event receipts.'); }
}, 10000);
server.listen(port, '127.0.0.1', () => console.log('RE:BIRTH MOCK · http://127.0.0.1:' + port));
server.on('error', () => { console.error('Could not bind the local server.'); shutdown(1); });
function shutdown(code = 0) {
  clearInterval(clock);
  clearInterval(cleanup);
  for (const client of ws.clients) client.terminate();
  ws.close();
  server.close();
  store.close();
  process.exitCode = code;
}
process.once('SIGINT', () => shutdown());
process.once('SIGTERM', () => shutdown());
