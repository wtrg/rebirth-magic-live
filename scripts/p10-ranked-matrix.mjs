import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { openStore } from '../apps/server/store.ts';
import { playReplayWithDebt } from '../apps/server/replay.ts';
import { applyEvent, beginRaid, damage, newGame } from '../packages/combat/index.ts';
import { attackStats, classes } from '../packages/shared/index.ts';

const ids = Array.from({ length: 32 }, (_, i) => 'mock:matrix' + i);
const rosterPatterns = [
  [ids],
  [ids.slice(0, 24), ids],
  [ids.slice(0, 24), [...ids.slice(0, 16), ...ids.slice(24)], ids],
];
const chat = (user, command, id) => ({ id, user, name: user, kind: 'chat', command });
const sixSlots = process.argv.includes('--six-slots');
const raids = Number(process.env.QA_MATRIX_RAIDS ?? (sixSlots ? 96 : 36));
const mixed = process.argv.includes('--mixed');
const participation = process.argv.includes('--participation');
const classIds = Object.keys(classes);
assert.ok(Number.isInteger(raids) && raids >= 3 && raids <= 96);
assert.ok(!sixSlots || participation && !mixed);

function calibrateSixSlots(store, roster, stage) {
  const players = roster.map(id => store.find(id));
  const fixture = newGame(players, stage);
  assert.ok(beginRaid(fixture, 0));
  const hp = fixture.raid.maxHp;
  const targetHit = hp / 5.5;
  const hits = players.map(player => {
    const basicHit = () => damage(attackStats(player).attack, 1, 5);
    player.level += Math.round((targetHit - basicHit()) / 4);
    return basicHit();
  });
  assert.ok(Math.max(...hits) * 5 < hp && Math.min(...hits) * 6 >= hp);
  assert.ok(store.commit(players));
}

async function cohort(pattern, spread, index) {
  const directory = await mkdtemp(join(tmpdir(), 'rebirth-ranked-matrix-'));
  const database = join(directory, 'synthetic.sqlite');
  const port = 4230 + index;
  const base = 'http://127.0.0.1:' + port;
  const seed = newGame();
  for (const [i, id] of ids.entries()) {
    applyEvent(seed, chat(id, '!join', 'seed-' + i), 1);
    Object.assign(seed.players.at(-1), { level: mixed || sixSlots ? 30 : 1100,
      classId: mixed || sixSlots ? classIds[Math.floor(i / 2) % classIds.length] : 'fire', auto: i % 2 === 0 });
  }
  const initial = openStore(database);
  initial.commit(seed.players);
  initial.close();
  const server = spawn(process.execPath, ['apps/server/index.ts'], {
    env: { ...process.env, PORT: String(port), DB_PATH: database, REBIRTH_MODE: 'mock',
      REBIRTH_RANKED_SCHEDULER: participation ? 'ranked-participation-v1' : '1',
      REBIRTH_RECORD_REPLAY: '1', REBIRTH_MOCK_REPLAY_FILE: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(server, 'close');
  let output = '', errors = '', state, socket;
  server.stdout.on('data', data => { output += String(data); });
  server.stderr.on('data', data => { errors += String(data); });
  async function until(predicate) {
    for (let i = 0; i < 300; i++) {
      if (predicate()) return;
      assert.equal(server.exitCode, null, errors);
      await sleep(15);
    }
    assert.fail('Timed out in ' + index + ': ' + JSON.stringify(state?.raid));
  }
  async function post(path, value) {
    const result = await fetch(base + path, {
      method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify(value), signal: AbortSignal.timeout(5000),
    });
    assert.ok(result.ok, path + ' HTTP ' + result.status);
  }
  const wins = new Map(ids.map(id => [id, 0]));
  const firstSlots = [];
  const contributorCounts = [];
  try {
    await until(() => output.includes(base));
    socket = new WebSocket(base.replace('http:', 'ws:') + '/state', { origin: base });
    socket.on('message', data => { state = JSON.parse(String(data)); });
    for (let n = 0; n < raids; n++) {
      const roster = pattern[n % pattern.length];
      if (n) await post('/admin', 'clear-roster');
      if (sixSlots) {
        const fixtureStore = openStore(database);
        try { calibrateSixSlots(fixtureStore, roster, n + 1); } finally { fixtureStore.close(); }
      }
      const order = n % 2 ? [...roster].reverse() : roster;
      await Promise.all(order.map(id => post('/event', chat(id, '!join', 'join-' + n + '-' + id))));
      await until(() => state?.players.length === roster.length);
      await post('/admin', 'start');
      await until(() => state?.raid.stage === n + 1 && state.raid.phase === 'PHASE_1');
      const manual = order.filter(id => ids.indexOf(id) % 2 === 1);
      await Promise.all(manual.map(async (id, i) => {
        await sleep(Math.round(spread * i / (manual.length - 1)));
        const command = sixSlots ? '!attack' : '!ult';
        await post('/event', chat(id, command, command.slice(1) + '-' + n + '-' + id));
      }));
      await until(() => state?.raid.result === 'victory');
      const credited = state.players.filter(player => player.contribution > 0);
      if (sixSlots) {
        assert.equal(credited.length, 6);
        if (n >= 2) assert.ok(state.raid.wraiths, 'The six-hit raid must cross the wraith phase');
      } else if (mixed) assert.ok(credited.length > 1);
      else assert.equal(credited.length, 1);
      for (const player of credited) wins.set(player.id, wins.get(player.id) + 1);
      contributorCounts.push(credited.length);
      if (!mixed && !sixSlots) firstSlots.push(credited[0].id);
      if (n + 1 < raids) await sleep(210);
    }
    const { raid, players, logs, paused, effect } = state;
    const response = await fetch(base + '/replay', { signal: AbortSignal.timeout(5000) });
    const trace = await response.json();
    assert.equal(trace.version, participation ? 14 : 13);
    assert.equal(trace.truncated, false);
    const executedSlots = new Map();
    const terminalDeniedSlots = new Map();
    const deniedWindows = new Map();
    const currentWait = new Map();
    const maxWait = new Map();
    const replay = playReplayWithDebt(trace, ({ executed, denied, stage, windowSeq, firstService }) => {
      if (sixSlots) assert.equal(executed.size, 6, 'Expected six distinct executions in the terminal window');
      for (const id of executed) {
        executedSlots.set(id, (executedSlots.get(id) ?? 0) + 1);
        currentWait.set(id, 0);
      }
      for (const id of denied) {
        const wait = (currentWait.get(id) ?? 0) + 1;
        currentWait.set(id, wait);
        maxWait.set(id, Math.max(wait, maxWait.get(id) ?? 0));
        terminalDeniedSlots.set(id, (terminalDeniedSlots.get(id) ?? 0) + 1);
        const evidence = deniedWindows.get(id) ?? [];
        evidence.push({ stage, windowSeq, availableSlots: executed.size, higherPriorityFirstService: firstService,
          residualSlots: executed.size - firstService.length });
        deniedWindows.set(id, evidence);
      }
    });
    assert.deepEqual(replay.state, { raid, players, logs, paused, effect });
    const windows = trace.steps.filter(step => step.kind === 'opportunity');
    if (sixSlots) assert.equal(windows.length, raids);
    const scheduledManual = windows.reduce((sum, step) => sum + step.intents.length, 0);
    const waits = windows.flatMap(step => step.intents.map(intent => step.closedAt - intent.admittedAt)).sort((a, b) => a - b);
    assert.ok(waits.length > 0 && waits[0] >= 0);
    const windowWaitMs = { p50: waits[Math.floor(.50 * (waits.length - 1))],
      p95: waits[Math.floor(.95 * (waits.length - 1))], max: waits.at(-1) };
    const offeredManual = Array.from({ length: raids }, (_, n) =>
      pattern[n % pattern.length].filter(id => ids.indexOf(id) % 2 === 1).length).reduce((a, b) => a + b, 0);
    await post('/admin', 'shutdown');
    assert.equal((await exited)[0], 0, errors);
    const saved = openStore(database, participation);
    try {
      assert.deepEqual(saved.loadOpportunityDebt(), replay.debt);
      if (participation) assert.deepEqual(saved.loadParticipation(), replay.participation);
      assert.equal(saved.loadStage(), raids + 1);
      for (const [id, count] of wins) assert.equal(saved.find(id).wins, count, id);
      const players = participation ? ids.map(id => {
        const offered = Array.from({ length: raids }, (_, n) => pattern[n % pattern.length])
          .filter(roster => roster.includes(id)).length;
        const manual = ids.indexOf(id) % 2 === 1;
        const admittedManual = windows.filter(step => step.intents.some(intent => intent.event.user === id)).length;
        const stats = replay.participation.history.get(id);
        if (sixSlots) {
          assert.equal(stats?.eligibleRaids, offered, id + ' eligible appearances');
          assert.equal(admittedManual, manual ? offered : 0, id + ' manual admission');
        }
        return { id, wins: wins.get(id), offeredManual: manual ? offered : 0, admittedManual,
          unrecordedManual: manual ? offered - admittedManual : 0,
          executedSlots: executedSlots.get(id) ?? 0, terminalDeniedSlots: terminalDeniedSlots.get(id) ?? 0,
          ...(sixSlots ? { maxEligibleWait: maxWait.get(id) ?? 0 } : {}),
          ...stats };
      }) : undefined;
      const firstServiceAudit = players?.filter(player => player.eligibleRaids > 0 && !player.everExecuted)
        .map(({ id, eligibleRaids, firstEligibleSeq }) => {
          const opportunities = deniedWindows.get(id) ?? [];
          assert.equal(new Set(opportunities.map(window => window.stage)).size, eligibleRaids);
          return { id, eligibleRaids, firstEligibleSeq, opportunities,
            reason: opportunities.every(window => window.residualSlots === 0) ? 'capacity-exhausted' : 'available-slot-missed' };
        });
      let sixSlotMetrics;
      if (sixSlots) {
        const rates = players.map(player => player.servedRaids / player.eligibleRaids);
        const minRate = Math.min(...rates), maxRate = Math.max(...rates);
        const maxEligibleWait = Math.max(...maxWait.values());
        assert.ok(100 * (maxRate - minRate) <= 3, 'Participation rates differ by more than 3 percentage points');
        assert.ok(maxEligibleWait <= 6, 'An ID missed more than six consecutive eligible raids');
        sixSlotMetrics = { slots: 6, minRate, maxRate, maxEligibleWait };
      }
      return { roster: pattern.map(group => group.length), spread, raids, offeredManual, scheduledManual, contributorCounts, windowWaitMs, players,
        ...sixSlotMetrics,
        firstServiceAudit,
        latestAdmissionMs: Math.max(0, ...windows.flatMap(step => step.intents.map(intent => intent.admittedAt - step.openedAt))),
        firstSlots, wins: [...wins.values()], replayAndSqlite: 'pass' };
    } finally { saved.close(); }
  } finally {
    socket?.terminate();
    if (server.exitCode === null && server.signalCode === null) server.kill();
    await exited;
    await rm(directory, { recursive: true, force: true, maxRetries: 5 });
  }
}

const scenarios = sixSlots ? [{ pattern: rosterPatterns[1], spread: 180 }] :
  rosterPatterns.flatMap(pattern => [60, 180, 350].map(spread => ({ pattern, spread })));
let missedFirstService = false;
for (let i = 0; i < scenarios.length; i += 3) {
  const batch = await Promise.allSettled(scenarios.slice(i, i + 3).map(({ pattern, spread }, j) => cohort(pattern, spread, i + j)));
  for (const result of batch) {
    if (result.status === 'rejected') throw result.reason;
    console.log(JSON.stringify(result.value));
    missedFirstService ||= result.value.firstServiceAudit?.some(player => player.reason === 'available-slot-missed') ?? false;
  }
}
assert.equal(missedFirstService, false, 'A never-served ID missed an available ranked slot');
