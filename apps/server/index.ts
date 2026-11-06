import { createServer, type IncomingMessage } from 'node:http';
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve, extname, sep } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { activeRaid, applyEvent, autoBattle, autoReady, canExecuteCombatAction, currentRulesVersion, newGame, nextRaidStage, tick } from '../../packages/combat/index.ts';
import { LiveAdapter, normalizeEvent } from '../../packages/tiktok-adapter/index.ts';
import { eulerSource, eulerUrl, normalizeEulerMessage, readGiftMap } from '../../packages/tiktok-adapter/euler.ts';
import type { EventContext, GameEvent, GameSnapshot } from '../../packages/shared/index.ts';
import { openStore, type ParticipationCommit } from './store.ts';
import { applyAdmin, isAdminAction } from './admin.ts';
import { createReplay } from './replay.ts';
import { admitOpportunityIntent, openOpportunityWindow, resolveOpportunityWindow, settleRankedDebt, type OpportunityWindow } from './opportunity.ts';
import { participationOrder, participationPolicyId, recordParticipationWindow, settleParticipationRaid } from './participation.ts';

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
const useParticipation = mode === 'mock' && process.env.REBIRTH_RANKED_SCHEDULER === participationPolicyId;
const store = openStore(process.env.DB_PATH ?? (mode === 'live' ? 'data/rebirth-live.sqlite' : 'data/rebirth.sqlite'), useParticipation);
let state = newGame([], store.loadStage());
const useDebt = mode === 'mock' && process.env.REBIRTH_RANKED_SCHEDULER === '1';
const rankedScheduler = useDebt || useParticipation;
const opportunityDebt = useDebt ? store.loadOpportunityDebt() : new Map<string, number>();
const participation = useParticipation ? store.loadParticipation() : undefined;
// The v13 recorder cannot describe participation ordering.
const replay = mode === 'mock' && !useParticipation && process.env.REBIRTH_RECORD_REPLAY === '1' ?
  createReplay(state, useDebt ? opportunityDebt : undefined) : null;
const replayFile = process.env.REBIRTH_MOCK_REPLAY_FILE;
const queue: { event: GameEvent; admittedAt: number }[] = [];
const monotonicNow = () => Math.floor(performance.now());
let window: OpportunityWindow | undefined;
let firstWindow = true;
let executedThisRaid = new Set<string>();
let eligibleThisRaid = new Set<string>();
let raidInstanceId = '';
let stopping = false;
const lastEvent = new Map<string, number>();
const adminClock = { pausedAt: 0 };
let bossImpactAt: number | undefined;
const hosts = new Set(['127.0.0.1:' + port, 'localhost:' + port]);
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };

function sameOrigin(req: IncomingMessage) {
  return req.headers.origin === 'http://' + req.headers.host;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const limit = 2048;
  if (Number(req.headers['content-length']) > limit) throw new RangeError('payload too large');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) throw new RangeError('payload too large');
    chunks.push(chunk);
  }
  const body = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
  return JSON.parse(body);
}

function pendingEventCount() {
  return queue.length + (window?.intents.size ?? 0);
}

function enqueue(event: GameEvent, now: number) {
  if (event.kind === 'gift' && !event.complete) return true;
  const limiterKey = event.kind + ':' + event.user;
  if (stopping || state.paused || pendingEventCount() >= 128 ||
      lastEvent.size >= 4096 && !lastEvent.has(limiterKey)) return false;
  if (now - (lastEvent.get(limiterKey) ?? 0) < 200) return false;
  lastEvent.set(limiterKey, now);
  queue.push({ event, admittedAt: monotonicNow() });
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
    res.end(JSON.stringify({ status: 'ok', mode, live: live.status, queue: pendingEventCount() }));
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
    try {
      body = await readJson(req);
    } catch (error) {
      res.setHeader('Connection', 'close');
      req.resume();
      res.writeHead(error instanceof RangeError ? 413 : 400).end();
      return;
    }
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
    if (body === 'start' || body === 'practice' || body === 'clear-roster') {
      try {
        if (!useRankedScheduler()) processQueue(now, queue.length);
      } catch {
        applyAdmin(state, 'pause', now, adminClock);
        replay?.record({ kind: 'admin', action: 'pause', at: now });
        queue.length = 0;
        window = undefined;
        console.error('Local persistence failed. Game paused.');
        broadcast();
        res.writeHead(503).end();
        return;
      }
    }
    const wasPaused = state.paused;
    if (!applyAdmin(state, body, now, adminClock)) { res.writeHead(409).end(); return; }
    if (body === 'start' || body === 'practice' || body === 'clear-roster') {
      bossImpactAt = undefined;
      window = undefined;
      firstWindow = true;
      executedThisRaid.clear();
      eligibleThisRaid.clear();
      raidInstanceId = useParticipation && body === 'start' ? randomUUID() : '';
    }
    if (body === 'resume' && wasPaused && bossImpactAt !== undefined) bossImpactAt += now - adminClock.pausedAt;
    if (body === 'pause') {
      queue.length = 0;
      window = undefined;
    }
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
  const data: GameSnapshot = { ...state, mode, live: live.status, leaderboard: store.leaderboard(),
    pausedAt: state.paused ? adminClock.pausedAt : undefined, bossImpactAt };
  return JSON.stringify(data);
}

function broadcast() {
  if (stopping) return;
  const payload = snapshot();
  for (const client of ws.clients) {
    if (client.bufferedAmount > 256000) client.terminate();
    else if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

function useRankedScheduler() {
  return rankedScheduler && !state.raid.practice && activeRaid(state);
}

function publishDebt(changes: ReadonlyMap<string, number>) {
  for (const [id, debt] of changes) {
    if (debt) opportunityDebt.set(id, debt);
    else opportunityDebt.delete(id);
  }
}

function publishParticipation(commit: ParticipationCommit) {
  if (!participation) return;
  for (const [id, stats] of commit.changes) participation.history.set(id, stats);
  if (commit.window) participation.windowSeq = commit.window.sequence;
  if (commit.settlement) participation.settlementSeq = commit.settlement.sequence;
}

function settlementAt(now: number) {
  if (!participation) throw new Error('Participation scheduler is disabled');
  return { raidId: raidInstanceId, sequence: participation.settlementSeq + 1, stage: state.raid.stage, at: now };
}

function closeWindow(now: number, closedAt: number, reason: 'deadline' | 'shutdown') {
  const closing = window;
  if (!closing) return;
  const ids = new Set<string>();
  const intents = [...closing.intents.values()].filter(({ event }) => {
    if (ids.has(event.id) || store.hasReceipt(event.id)) return false;
    ids.add(event.id);
    return true;
  });
  const step = { kind: 'opportunity' as const, at: now, openedAt: closing.openedAt, deadline: closing.deadline,
    closedAt, reason, intents };
  const windowSeq = (participation?.windowSeq ?? 0) + 1;
  const order = participation && participationOrder(participation.history, windowSeq);
  const result = resolveOpportunityWindow(state, intents, opportunityDebt, now, reason !== 'shutdown', order);
  const executed = new Set([...executedThisRaid, ...result.executed]);
  const terminal = !state.raid.result && !!result.state.raid.result;
  const changes = useDebt && terminal ? settleRankedDebt(opportunityDebt, executed, result.denied) : undefined;
  const windowEligible = new Set([...result.executed, ...result.denied]);
  const eligible = new Set([...eligibleThisRaid, ...windowEligible]);
  let participationCommit: ParticipationCommit | undefined;
  if (participation) {
    const windowChanges = recordParticipationWindow(participation.history, windowEligible, result.executed, windowSeq);
    participationCommit = {
      changes: terminal ? settleParticipationRaid(new Map([...participation.history, ...windowChanges]), eligible, executed) : windowChanges,
      window: { id: raidInstanceId + ':' + windowSeq, sequence: windowSeq, raidId: raidInstanceId },
      settlement: terminal ? settlementAt(now) : undefined,
    };
  }
  const stage = nextRaidStage(result.state);
  try {
    if (!store.commitBatch(result.state.players, intents.map(({ event }) => ({ id: event.id, at: now })),
      stage > nextRaidStage(state) ? stage : undefined, changes, participationCommit)) throw new Error('Duplicate ranked window receipt');
  } catch (error) {
    replay?.record({ ...step, outcome: 'rollback' });
    throw error;
  }
  state = result.state;
  if (changes) publishDebt(changes);
  if (participationCommit) publishParticipation(participationCommit);
  executedThisRaid = terminal ? new Set() : executed;
  if (participation) eligibleThisRaid = terminal ? new Set() : eligible;
  replay?.record({ ...step, outcome: 'committed', terminal });
  window = undefined;
}

function startWindow(at: number) {
  window = openOpportunityWindow(at, firstWindow);
  firstWindow = false;
  return window;
}

function processQueue(now: number, limit: number, shuttingDown = false) {
  for (let i = 0; i < limit && queue.length; i++) {
    const { event, admittedAt } = queue[0];
    if (useRankedScheduler() && event.kind === 'chat' &&
        /^!(skill1|skill2|ult|attack)(?:\s|$)/.test(event.command)) {
      if (window && admittedAt >= window.deadline && !shuttingDown) closeWindow(now, monotonicNow(), 'deadline');
      if (useRankedScheduler() && state.players.some(player => player.id === event.user) && !store.hasReceipt(event.id)) {
        if (!window && canExecuteCombatAction(state, event, now)) startWindow(admittedAt);
        if (window) admitOpportunityIntent(window, { event, admittedAt });
      }
      queue.shift();
      continue;
    }
    const next = structuredClone(state);
    const member = next.players.find(player => player.id === event.user);
    const context: EventContext = {};
    if (event.kind === 'chat') {
      if (event.command.split(/\s+/)[0] === '!join' && !member && next.players.length < 64) context.restored = store.find(event.user);
      if (event.command.split(/\s+/)[0] === '!rank') context.leader = store.leaderboard()[0];
    }
    applyEvent(next, event, now, currentRulesVersion, context);
    const departing = member && !next.players.includes(member) ? [member] : [];
    const nextStage = nextRaidStage(next);
    const unlock = nextStage > nextRaidStage(state) ? nextStage : undefined;
    if (store.commit([...next.players,...departing], event, now, unlock)) {
      state = next;
      replay?.record({ kind: 'event', event, at: now, context });
    }
    queue.shift();
  }
}

function processBossTick(now: number) {
    const draft = structuredClone(state);
    if (tick(draft, now, currentRulesVersion)) {
      const terminal = useRankedScheduler() && !!draft.raid.result;
      const changes = useDebt && terminal ? settleRankedDebt(opportunityDebt, executedThisRaid, new Set()) : undefined;
      const participationCommit = participation && terminal ? {
        changes: settleParticipationRaid(participation.history, eligibleThisRaid, executedThisRaid),
        settlement: settlementAt(now),
      } : undefined;
      if (!store.commitBatch(draft.players, [], undefined, changes, participationCommit)) throw new Error('Duplicate ranked settlement');
      if (terminal) {
        if (changes) publishDebt(changes);
        if (participationCommit) publishParticipation(participationCommit);
        executedThisRaid.clear();
        eligibleThisRaid.clear();
        window = undefined;
      }
      if (draft.effect?.kind === 'boss' && draft.effect.serial !== state.effect?.serial) bossImpactAt = now;
      state = draft;
      replay?.record({ kind: 'tick', at: now });
    }
}

const clock = setInterval(() => {
  if (state.paused) return;
  const now = Date.now();
  if (!queue.length && !window && !autoReady(state, now) && (!activeRaid(state) && state.raid.phase !== 'SPAWN' || now < state.raid.next)) return;
  try {
    processBossTick(now);
    processQueue(now, rankedScheduler ? queue.length : 16);
    if (useRankedScheduler()) {
      const at = monotonicNow();
      if (window && at >= window.deadline) closeWindow(now, at, 'deadline');
      if (useRankedScheduler() && !window && autoReady(state, now)) startWindow(at);
    } else if (autoReady(state, now)) {
      const automatic = structuredClone(state);
      if (autoBattle(automatic, now, currentRulesVersion)) {
        const nextStage = nextRaidStage(automatic);
        store.commit(automatic.players, undefined, now, nextStage > nextRaidStage(state) ? nextStage : undefined);
        state = automatic;
        replay?.record({ kind: 'auto', at: now });
      }
    }
    broadcast();
  } catch {
    applyAdmin(state, 'pause', now, adminClock);
    replay?.record({ kind: 'admin', action: 'pause', at: now });
    queue.length = 0;
    window = undefined;
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
    const boundary = monotonicNow();
    const now = Date.now();
    if (useRankedScheduler()) {
      processBossTick(now);
      processQueue(now, queue.length, true);
      closeWindow(now, boundary, 'shutdown');
    } else processQueue(now, queue.length);
  } catch {
    code = 1;
    console.error('Could not commit pending events during shutdown.');
  }
  if (replay && replayFile && code === 0) {
    try {
      writeFileSync(replayFile, replay.export(), { flag: 'wx' });
    } catch {
      code = 1;
      console.error('Could not create the MOCK shutdown replay file.');
    }
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
