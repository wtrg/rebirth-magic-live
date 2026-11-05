import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { applyEvent, autoBattle, beginRaid, newGame, tick } from '../packages/combat/index.ts';
import { createReplay, playReplay } from '../apps/server/replay.ts';
import { openStore } from '../apps/server/store.ts';
import type { GameEvent, GameSnapshot, GameState } from '../packages/shared/index.ts';

const event = (command: string, user = 'mock:auto'): GameEvent => ({
  id: 'auto:' + command.replace(/[^a-z0-9]/gi, ''), user, name: user, kind: 'chat', command,
});
const chat = (state: GameState, command: string, now = 1000, version = 10) =>
  applyEvent(state, event(command), now, version);

function active() {
  const state = newGame();
  chat(state, '!join');
  assert.ok(beginRaid(state, 1000));
  tick(state, 1800, 10);
  return state;
}

test('auto is opt-in and shares the manual basic cooldown in both directions', () => {
  const state = active();
  const player = state.players[0];
  const initialHp = state.raid.hp;
  assert.equal(autoBattle(state, 1800), false);
  assert.equal(state.raid.hp, initialHp);
  chat(state, '!auto on', 1800);
  chat(state, '!attack', 1800);
  const afterManual = state.raid.hp;
  assert.ok(afterManual < initialHp);
  assert.equal(autoBattle(state, 1800), false);
  assert.equal(autoBattle(state, 2399), false);
  assert.equal(state.raid.hp, afterManual);
  assert.equal(autoBattle(state, 2400), true);
  const afterAuto = state.raid.hp;
  assert.ok(afterAuto < afterManual);
  chat(state, '!attack', 2400);
  assert.equal(state.raid.hp, afterAuto);
  assert.equal(player.attackCount, 2);
  assert.equal(player.mp, 60);
  assert.deepEqual(player.ready.slice(0, 3), [0, 0, 0]);
  assert.equal(player.ready[3], 3000);
  chat(state, '!auto off', 2500);
  assert.equal(player.auto, false);
  assert.equal(autoBattle(state, 3000), false);
  assert.equal(state.raid.hp, afterAuto);
});

test('auto never attacks while paused, dead, spawning or outside an active raid', () => {
  const state = active();
  chat(state, '!auto on', 1800);
  for (const phase of ['IDLE', 'SPAWN', 'DEAD', 'RESET'] as const) {
    state.raid.phase = phase;
    const before = structuredClone(state);
    assert.equal(autoBattle(state, 2000), false, phase);
    assert.deepEqual(state, before, phase);
  }
  state.raid.phase = 'PHASE_1';
  state.players[0].hp = 0;
  let before = structuredClone(state);
  assert.equal(autoBattle(state, 2000), false);
  assert.deepEqual(state, before);
  state.players[0].hp = 120;
  state.paused = true;
  before = structuredClone(state);
  assert.equal(autoBattle(state, 2000), false);
  assert.deepEqual(state, before);
  state.paused = false;
  assert.equal(autoBattle(state, 2000), true);
});

test('auto finishes a raid and awards progress exactly once', () => {
  const state = active();
  chat(state, '!auto on', 1800);
  state.raid.hp = 1;
  assert.equal(autoBattle(state, 1800), true);
  assert.equal(state.raid.phase, 'DEAD');
  assert.equal(state.raid.result, 'victory');
  const player = state.players[0];
  assert.equal(player.wins, 1);
  assert.equal(player.score, 101);
  assert.equal(player.level, 2);
  assert.equal(player.xp, 20);
  assert.equal(player.shards, 1);
  assert.deepEqual(player.inventory, ['ember']);
  const settled = structuredClone(state);
  for (const now of [1800, 2400, 10000]) {
    assert.equal(autoBattle(state, now), false);
    tick(state, now, 10);
  }
  assert.deepEqual(state, settled);
});

test('legacy version 9 ignores auto commands and rejects auto replay steps', () => {
  const state = active();
  const before = structuredClone(state);
  chat(state, '!auto on', 1800, 9);
  assert.deepEqual(state, before);
  assert.equal(autoBattle(state, 1800, 9), false);
  const legacy = { version: 9, initial: before, steps: [
    { kind: 'event', event: event('!auto on'), at: 1800 },
  ] };
  assert.deepEqual(playReplay(legacy), before);
  assert.throws(() => playReplay({ ...legacy, steps: [{ kind: 'auto', at: 1800 }] }), /Invalid replay/);
});

test('version 10 replays mixed auto, manual and boss ticks deterministically', () => {
  const state = active();
  const replay = createReplay(state);
  const enabled = event('!auto on');
  applyEvent(state, enabled, 1800, 10);
  replay.record({ kind: 'event', event: enabled, at: 1800 });
  for (const now of [1800, 1850, 2400, 6400]) {
    autoBattle(state, now);
    replay.record({ kind: 'auto', at: now });
  }
  const manual = event('!attack');
  applyEvent(state, manual, 6400, 10);
  replay.record({ kind: 'event', event: manual, at: 6400 });
  tick(state, 6400, 10);
  replay.record({ kind: 'tick', at: 6400 });
  const trace = JSON.parse(replay.export());
  assert.equal(trace.version, 10);
  assert.deepEqual(playReplay(trace), state);
  assert.deepEqual(playReplay(trace), state);
});

test('auto preference persists through archive and restored join', () => {
  const store = openStore(':memory:');
  try {
    const state = newGame();
    chat(state, '!join');
    chat(state, '!auto on');
    assert.equal(state.players[0].auto, true);
    store.commit(state.players);
    const restored = store.find('mock:auto');
    assert.equal(restored?.auto, true);
    chat(state, '!leave');
    assert.equal(state.players.length, 0);
    applyEvent(state, event('!join'), 2000, 10, { restored });
    assert.equal(state.players[0].auto, true);
    assert.ok(beginRaid(state, 2000));
    tick(state, 2800, 10);
    assert.equal(autoBattle(state, 2800), true);
    chat(state, '!auto off', 2800);
    store.commit(state.players);
    assert.equal(store.find('mock:auto')?.auto, false);
  } finally { store.close(); }
});

test('browserless server auto pauses, replays and commits one victory with stage progress', { timeout: 15000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rebirth-auto-'));
  const database = join(directory, 'auto.sqlite');
  const base = 'http://127.0.0.1:4194';
  const seed = newGame();
  chat(seed, '!join');
  Object.assign(seed.players[0], { level: 30, auto: false });
  const initialStore = openStore(database);
  initialStore.commit(seed.players);
  initialStore.close();
  const server = spawn(process.execPath, ['apps/server/index.ts'], {
    env: { ...process.env, PORT: '4194', DB_PATH: database, REBIRTH_MODE: 'mock', REBIRTH_RECORD_REPLAY: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const closed = once(server, 'close');
  let output = '', errors = '', serial = 0;
  let socket: WebSocket | undefined;
  let state: GameSnapshot | undefined;
  server.stdout.on('data', data => { output += String(data); });
  server.stderr.on('data', data => { errors += String(data); });
  async function until(check: () => boolean) {
    for (let i = 0; i < 200; i++) {
      if (check()) return;
      assert.equal(server.exitCode, null, errors);
      await sleep(25);
    }
    assert.fail('Timed out waiting for server auto state');
  }
  async function post(path: string, body: unknown) {
    const response = await fetch(base + path, {
      method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(3000),
    });
    assert.ok(response.ok, 'Unexpected HTTP ' + response.status);
  }
  const send = (command: string) => post('/event', { ...event(command), id: 'http-auto:' + ++serial });
  try {
    await until(() => output.includes('RE:BIRTH MOCK · ' + base));
    socket = new WebSocket(base.replace('http:', 'ws:') + '/state', { origin: base });
    socket.on('message', data => { state = JSON.parse(String(data)) as GameSnapshot; });
    await until(() => !!state);
    await send('!join');
    await until(() => state?.players.length === 1);
    assert.equal(state!.players[0].auto, false);
    await sleep(220);
    await send('!auto on');
    await until(() => state?.players[0].auto === true);
    await post('/admin', 'start');
    await until(() => (state?.players[0].contribution ?? 0) > 0);
    assert.equal(state!.raid.result, null);
    assert.equal(state!.players[0].ready.slice(0, 3).every(time => time === 0), true);
    await post('/admin', 'pause');
    await until(() => state?.paused === true);
    const paused = structuredClone(state!);
    await sleep(800);
    assert.equal(state!.raid.hp, paused.raid.hp);
    assert.equal(state!.players[0].hp, paused.players[0].hp);
    assert.equal(state!.players[0].contribution, paused.players[0].contribution);
    await post('/admin', 'resume');
    await until(() => state?.raid.result === 'victory');
    assert.equal(state!.players[0].wins, 1);
    assert.equal(state!.players[0].shards, 1);
    assert.equal(state!.players[0].xp, 120);
    const trace = await (await fetch(base + '/replay', { signal: AbortSignal.timeout(3000) })).json();
    assert.equal(trace.version, 10);
    assert.ok(trace.steps.some((step: { kind: string }) => step.kind === 'auto'));
    const game: GameState = {
      raid: state!.raid, players: state!.players, logs: state!.logs, paused: state!.paused, effect: state!.effect,
    };
    assert.deepEqual(playReplay(trace), game);
    await post('/admin', 'shutdown');
    assert.equal((await closed)[0], 0, errors);
    const saved = openStore(database);
    try {
      assert.equal(saved.loadStage(), 2);
      const profile = saved.find('mock:auto');
      assert.equal(profile?.auto, true);
      assert.equal(profile?.wins, 1);
      assert.equal(profile?.shards, 1);
      assert.equal(profile?.score, game.players[0].score);
    } finally { saved.close(); }
  } finally {
    socket?.terminate();
    if (server.exitCode === null) { server.kill(); await closed; }
    await rm(directory, { recursive: true, force: true });
  }
});
