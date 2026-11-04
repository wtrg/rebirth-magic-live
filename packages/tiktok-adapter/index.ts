import type { GameEvent, LiveStatus } from '../shared/index.ts';

export const gifts = new Map([
  ['mock-1', { label: 'Mana Spark', color: '#68efff' }],
  ['mock-5', { label: 'Linh thú hỗ trợ', color: '#86ffbe' }],
  ['mock-10', { label: 'Phép đặc biệt', color: '#ffad73' }],
  ['mock-20', { label: 'Thức tỉnh', color: '#e0a0ff' }],
  ['mock-30', { label: 'Ấn Raid', color: '#ffe194' }],
]);

export interface LiveSource {
  connect(signal: AbortSignal, reportStatus: (status: LiveStatus) => void): AsyncIterable<unknown>;
}

export class LiveAdapter {
  status: LiveStatus = 'unconfigured';

  private readonly onStatus: () => void;

  constructor(onStatus: () => void = () => {}) {
    this.onStatus = onStatus;
  }

  private setStatus(status: LiveStatus) {
    if (this.status === status) return;
    this.status = status;
    this.onStatus();
  }

  async run(source: LiveSource, normalize: (raw: unknown) => GameEvent | null, enqueue: (event: GameEvent) => void, signal: AbortSignal) {
    let delay = 1000;
    while (!signal.aborted) {
      this.setStatus('connecting');
      try {
        for await (const raw of source.connect(signal, status => {
          this.setStatus(status);
          if (status === 'connected') delay = 1000;
        })) {
          if (signal.aborted) break;
          const event = normalize(raw);
          if (event) {
            this.setStatus('connected');
            delay = 1000;
            enqueue(event);
          }
        }
      } catch {
        // Transport details can contain private room information.
      }
      if (this.status === 'rejected') return;
      if (signal.aborted) break;
      this.setStatus('retrying');
      const { setTimeout } = await import('node:timers/promises');
      await setTimeout(delay, undefined, { signal }).catch(() => undefined);
      delay = Math.min(delay * 2, 120000);
    }
    this.setStatus('unconfigured');
  }
}

export function normalizeEvent(raw: unknown): GameEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const event = raw as Record<string, unknown>;
  const validId = (id: unknown): id is string => typeof id === 'string' && /^[\w:-]{1,80}$/.test(id);
  if (!validId(event.id) || !validId(event.user) || typeof event.name !== 'string') return null;
  const base = { id: event.id, user: event.user, name: event.name.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 32).trimEnd() || event.user };
  if (event.kind === 'chat' && typeof event.command === 'string' && event.command.length <= 80) {
    return { ...base, kind: 'chat', command: event.command.trim().toLowerCase() };
  }
  if (event.kind === 'gift' && typeof event.giftId === 'string' && gifts.has(event.giftId) && typeof event.complete === 'boolean') {
    return { ...base, kind: 'gift', giftId: event.giftId, complete: event.complete };
  }
  return null;
}
