import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import { WebSocketServer } from 'ws';
import { LiveAdapter } from '../packages/tiktok-adapter/index.ts';
import { eulerSource, eulerUrl, normalizeEulerMessage, readGiftMap } from '../packages/tiktok-adapter/euler.ts';
import { applyEvent, newGame } from '../packages/combat/index.ts';
import { openStore } from '../apps/server/store.ts';
import type { GameEvent, LiveStatus } from '../packages/shared/index.ts';

const user = { userId: '9007199254740993123', uniqueId: 'astra', nickname: 'Astra' };
const chat = {
  type: 'WebcastChatMessage',
  data: { user, event: { msgId: '901' }, comment: ' !join ' },
};
const gift = {
  type: 'WebcastGiftMessage',
  data: { user, event: { msgId: '902' }, giftId: 1234, giftDetails: { giftType: 1 }, repeatEnd: 1, groupId: '456' },
};
const giftMap = readGiftMap('{"1234":5}');
const normalize = (raw: unknown) => normalizeEulerMessage(raw, giftMap, 'sample');

test('Euler v1 normalizes stable IDs and only completes known gift streaks', () => {
  const url = eulerUrl('sample', 'placeholder');
  assert.equal(url.origin, 'wss://ws.eulerstream.com');
  assert.equal(url.searchParams.get('schemaVersion'), 'v1');
  assert.equal(url.searchParams.get('uniqueId'), 'sample');
  assert.throws(() => readGiftMap('{"1234":99}'), /Invalid LIVE gift mapping/);
  const join = normalize(chat);
  assert.ok(join?.kind === 'chat');
  assert.equal(join.user, 'live:9007199254740993123');
  assert.equal(join.command, '!join');
  assert.equal(join.username, 'astra');
  assert.equal(normalize({ ...chat, data: { ...chat.data, comment: 'hello' } }), null);
  assert.equal(normalize({ ...gift, data: { ...gift.data, repeatEnd: 0 } }), null);
  assert.equal(normalize({ ...gift, data: { ...gift.data, giftId: 99 } }), null);
  const final = normalize(gift);
  assert.ok(final?.kind === 'gift');
  assert.equal(final.giftId, 'mock-5');
  const duplicate = normalize({ ...gift, data: { ...gift.data, event: { msgId: '903' } } });
  assert.equal(final.id, duplicate?.id);
  const single = normalize({ ...gift, data: { ...gift.data, repeatEnd: 0, giftDetails: { giftType: 2 } } });
  assert.ok(single?.kind === 'gift');
  assert.notEqual(final.id, single.id);
  const db = openStore(':memory:');
  try {
    assert.ok(db.commit([], final));
    assert.equal(db.commit([], duplicate ?? undefined), false);
  } finally {
    db.close();
  }
});

test('WebSocket source reads v1 bundles, reconnects, and stops on provider rejection', { timeout: 10000 }, async () => {
  const upstream = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(upstream, 'listening');
  const address = upstream.address();
  assert.ok(address && typeof address !== 'string');
  const abort = new AbortController();
  const statuses: LiveStatus[] = [];
  const events: GameEvent[] = [];
  const adapter = new LiveAdapter(() => statuses.push(adapter.status));
  let connections = 0;
  upstream.on('connection', socket => {
    connections++;
    if (connections === 1) {
      socket.send('bad-json');
      socket.send(JSON.stringify({ messages: [
        { type: 'room.status', data: { state: 'connected' } },
        chat, { ...gift, data: { ...gift.data, repeatEnd: 0 } }, gift,
      ] }));
      socket.close(1011);
    } else {
      socket.close(4401);
    }
  });
  try {
    await adapter.run(eulerSource(new URL('ws://127.0.0.1:' + address.port)), normalize,
      event => events.push(event), abort.signal);
    assert.deepEqual(events.map(event => event.kind), ['chat', 'gift']);
    assert.deepEqual(statuses, ['connecting', 'connected', 'retrying', 'connecting', 'rejected']);
    assert.equal(connections, 2);
  } finally {
    abort.abort();
    for (const client of upstream.clients) client.terminate();
    await new Promise<void>(resolve => upstream.close(() => resolve()));
  }
});

test('stopping the adapter cancels its retry timer', async () => {
  const abort = new AbortController();
  const adapter = new LiveAdapter(() => {
    if (adapter.status === 'retrying') abort.abort();
  });
  await adapter.run({ async *connect() { await setTimeout(5); yield null; } }, () => null,
    () => assert.fail('Unexpected event'), abort.signal);
  assert.equal(adapter.status, 'unconfigured');
});

test('renamed TikTok profile keeps the stable ID and durable progress', () => {
  const join = normalize(chat);
  assert.ok(join);
  const state = newGame();
  applyEvent(state, join, 1000);
  state.players[0].xp = 74;
  const renamed = normalize({ ...chat, data: { ...chat.data, user: { ...user, uniqueId:'astra.new', nickname:'Astra Nova' },
    event:{ msgId:'911' }, comment:'!stats' } });
  assert.ok(renamed);
  applyEvent(state, renamed, 2000);
  assert.equal(state.players.length, 1);
  assert.equal(state.players[0].id,join.user);
  assert.equal(state.players[0].username,'astra.new');
  assert.equal(state.players[0].name,'Astra Nova');
  assert.match(state.logs[0],/74 EXP.*ATK 29.*DEF 4/);
  const db = openStore(':memory:');
  try {
    assert.ok(db.commit(state.players,renamed));
    assert.equal(db.load()[0].username,'astra.new');
    assert.equal(db.load()[0].xp,74);
  } finally {
    db.close();
  }
});
