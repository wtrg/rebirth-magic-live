import { createHash } from 'node:crypto';
import { on } from 'node:events';
import { WebSocket } from 'ws';
import { gifts, normalizeEvent, type LiveSource } from './index.ts';

const record = (input: unknown) => input && typeof input === 'object' ? input as Record<string, unknown> : {};
const numericId = (input: unknown) => {
  if (typeof input === 'number' && Number.isSafeInteger(input)) input = String(input);
  return typeof input === 'string' && /^[1-9]\d{0,29}$/.test(input) ? input : null;
};

export function readGiftMap(json: string) {
  const entries = JSON.parse(json) as unknown;
  if (!entries || Array.isArray(entries) || typeof entries !== 'object') throw new Error('Invalid LIVE gift mapping.');
  const map = new Map<string, string>();
  for (const [id, tier] of Object.entries(entries)) {
    const effect = 'mock-' + String(tier);
    if (!numericId(id) || typeof tier !== 'number' || !gifts.has(effect)) throw new Error('Invalid LIVE gift mapping.');
    map.set(id, effect);
  }
  return map;
}

export function normalizeEulerMessage(raw: unknown, giftMap: ReadonlyMap<string, string>, channel: string) {
  const { type, data } = record(raw);
  const message = record(data);
  const sender = record(message.user);
  const userId = numericId(sender.userId);
  const msgId = numericId(record(message.event).msgId);
  if (!userId || !msgId) return null;
  const name = typeof sender.nickname === 'string' && sender.nickname.trim() ? sender.nickname : sender.uniqueId;
  const user = 'live:' + userId;
  const eventId = (value: string) => 'live:' + createHash('sha256').update(channel + ':' + value).digest('hex');
  if (type === 'WebcastChatMessage') {
    if (typeof message.comment !== 'string' || !message.comment.trimStart().startsWith('!')) return null;
    return normalizeEvent({ kind: 'chat', id: eventId('chat:' + msgId), user, name, command: message.comment });
  }
  if (type !== 'WebcastGiftMessage') return null;
  const upstreamId = numericId(message.giftId);
  const giftId = upstreamId && giftMap.get(upstreamId);
  const giftType = record(message.giftDetails).giftType;
  if (!giftId || typeof giftType !== 'number') return null;
  if (giftType === 1 && message.repeatEnd !== 1) return null;
  const groupId = giftType === 1 ? numericId(message.groupId) : null;
  const id = eventId(groupId ? 'gift:' + upstreamId + ':' + userId + ':' + groupId : 'gift-msg:' + msgId);
  return normalizeEvent({ kind: 'gift', id, user, name, giftId, complete: true });
}

export function eulerUrl(channel: string, key: string) {
  const url = new URL('wss://ws.eulerstream.com');
  url.searchParams.set('uniqueId', channel);
  url.searchParams.set('apiKey', key);
  url.searchParams.set('schemaVersion', 'v1');
  url.searchParams.set('features.bundleEvents', 'true');
  url.searchParams.set('features.rawMessages', 'false');
  url.searchParams.set('features.syntheticPresence', 'false');
  return url;
}

export function eulerSource(url: URL): LiveSource {
  return {
    async *connect(signal, reportStatus) {
      const socket = new WebSocket(url, { handshakeTimeout: 10000, maxPayload: 256 * 1024, perMessageDeflate: false });
      // Keep the listener until close, including termination during handshake.
      socket.on('error', () => {});
      let closeCode = 0;
      socket.once('close', code => { closeCode = code; });
      socket.once('unexpected-response', (_request, response) => {
        if ([400, 401, 403, 429].includes(response.statusCode ?? 0)) reportStatus('rejected');
        response.destroy();
        socket.terminate();
      });
      try {
        const frames = on(socket, 'message', { signal, close: ['close'], highWaterMark: 16, lowWaterMark: 4 });
        for await (const [bytes, isBinary] of frames) {
          if (isBinary || signal.aborted) continue;
          let frame: unknown;
          try { frame = JSON.parse(String(bytes)); } catch { continue; }
          const messages = record(frame).messages;
          for (const message of Array.isArray(messages) ? messages : [frame]) {
            const item = record(message);
            if (item.type === 'room.status') {
              const status = record(item.data).state;
              if (status === 'connected') reportStatus('connected');
              else if (status === 'offline' || status === 'ended' || status === 'reconnecting' || status === 'error') reportStatus('retrying');
            } else {
              yield item;
            }
          }
        }
        if ([4400, 4401, 4403, 4429].includes(closeCode)) reportStatus('rejected');
      } finally {
        socket.terminate();
      }
    },
  };
}
