import { applyEvent, tick } from '../../packages/combat/index.ts';
import type { GameEvent, GameState } from '../../packages/shared/index.ts';
import { normalizeEvent } from '../../packages/tiktok-adapter/index.ts';
import { applyAdmin, isAdminAction, type AdminAction } from './admin.ts';

type Step = { at: number } & (
  { kind: 'event'; event: GameEvent } |
  { kind: 'tick' } |
  { kind: 'admin'; action: AdminAction }
);
const limit = 10000;

export function createReplay(initial: GameState) {
  const trace = { version: 6, initial: structuredClone(initial), steps: [] as Step[], truncated: false };
  return {
    record(step: Step) {
      if (trace.steps.length === limit) trace.truncated = true;
      else trace.steps.push(step);
    },
    export: () => JSON.stringify(trace),
  };
}

export function playReplay(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid replay');
  const { version, initial, steps } = raw as { version?: unknown; initial?: GameState; steps?: Step[] };
  if ((version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5 && version !== 6) || !initial?.raid || !Array.isArray(initial.players) ||
      !Array.isArray(initial.logs) || !Array.isArray(steps) || steps.length > limit) {
    throw new Error('Invalid replay');
  }
  const state = structuredClone(initial);
  const clock = { pausedAt: 0 };
  for (const step of steps) {
    if (!step || !Number.isSafeInteger(step.at) || step.at < 0) throw new Error('Invalid replay timestamp');
    if (step.kind === 'tick') {
      tick(state, step.at, version);
    } else if (step.kind === 'admin' && isAdminAction(step.action)) {
      if (!applyAdmin(state, step.action, step.at, clock)) throw new Error('Replay admin action rejected');
    } else if (step.kind === 'event') {
      const event = normalizeEvent(step.event);
      if (!event || event.kind === 'gift' && !event.complete) throw new Error('Invalid replay event');
      applyEvent(state, event, step.at, version);
    } else {
      throw new Error('Invalid replay operation');
    }
  }
  return state;
}
