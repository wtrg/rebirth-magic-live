import { applyEvent, autoBattle, currentRulesVersion, tick } from '../../packages/combat/index.ts';
import type { EventContext, GameEvent, GameState } from '../../packages/shared/index.ts';
import { normalizeEvent } from '../../packages/tiktok-adapter/index.ts';
import { applyAdmin, isAdminAction, type AdminAction } from './admin.ts';
import { resolveOpportunityWindow, settleRankedDebt, type OpportunityIntent } from './opportunity.ts';

type Step = { at: number } & (
  { kind: 'event'; event: GameEvent; context?: EventContext } |
  { kind: 'tick' } |
  { kind: 'auto' } |
  { kind: 'opportunity'; openedAt: number; deadline: number; closedAt: number;
    reason: 'deadline' | 'shutdown'; outcome: 'committed' | 'rollback'; intents: OpportunityIntent[] } |
  { kind: 'admin'; action: AdminAction }
);
const limit = 10000;

export function createReplay(initial: GameState, openingDebt?: ReadonlyMap<string, number>) {
  const trace = { version: openingDebt ? 13 : currentRulesVersion, initial: structuredClone(initial),
    openingDebt: openingDebt ? [...openingDebt] : undefined, steps: [] as Step[], truncated: false };
  return {
    record(step: Step) {
      if (trace.steps.length === limit) trace.truncated = true;
      else trace.steps.push(step);
    },
    export: () => JSON.stringify(trace),
  };
}

export function playReplay(raw: unknown): GameState {
  return playReplayWithDebt(raw).state;
}

export function playReplayWithDebt(raw: unknown) {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid replay');
  const { version, initial, steps, openingDebt } = raw as { version?: unknown; initial?: GameState; steps?: Step[]; openingDebt?: [string, number][] };
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 13 || !initial?.raid || !Array.isArray(initial.players) ||
      !Array.isArray(initial.logs) || !Array.isArray(steps) || steps.length > limit) {
    throw new Error('Invalid replay');
  }
  let state = structuredClone(initial);
  const debt = new Map<string, number>();
  if (version === 13) {
    if (!Array.isArray(openingDebt)) throw new Error('Invalid opening debt');
    for (const entry of openingDebt) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !Number.isInteger(entry[1]) ||
          entry[1] < 0 || entry[1] > 32 || debt.has(entry[0])) throw new Error('Invalid opening debt');
      debt.set(entry[0], entry[1]);
    }
  }
  const executed = new Set<string>();
  const settle = (denied = new Set<string>()) => {
    for (const [id, value] of settleRankedDebt(debt, executed, denied)) {
      if (value) debt.set(id, value);
      else debt.delete(id);
    }
    executed.clear();
  };
  const clock = { pausedAt: 0 };
  for (const step of steps) {
    if (!step || !Number.isSafeInteger(step.at) || step.at < 0) throw new Error('Invalid replay timestamp');
    if (step.kind === 'tick') {
      const before = state.raid.result;
      tick(state, step.at, version);
      if (version === 13 && !state.raid.practice && !before && state.raid.result) settle();
    } else if (step.kind === 'opportunity' && version === 13) {
      if (!Number.isFinite(step.openedAt) || !Number.isFinite(step.deadline) || !Number.isFinite(step.closedAt) ||
          ![60, 400].includes(step.deadline - step.openedAt) || step.closedAt < step.openedAt ||
          (step.reason !== 'deadline' && step.reason !== 'shutdown') ||
          (step.reason === 'deadline' && step.closedAt < step.deadline) ||
          !Array.isArray(step.intents) || step.intents.length > 64) throw new Error('Invalid opportunity window');
      const users = new Set<string>();
      const intents: OpportunityIntent[] = [];
      for (const intent of step.intents) {
        const event = normalizeEvent(intent?.event);
        if (event?.kind !== 'chat' || !Number.isFinite(intent.admittedAt) || intent.admittedAt < step.openedAt ||
            intent.admittedAt >= step.deadline || intent.admittedAt > step.closedAt || users.has(event.user)) {
          throw new Error('Invalid opportunity intent');
        }
        users.add(event.user);
        intents.push({ event, admittedAt: intent.admittedAt });
      }
      if (step.outcome === 'rollback') continue;
      if (step.outcome !== 'committed') throw new Error('Invalid opportunity outcome');
      const before = state.raid.result;
      const result = resolveOpportunityWindow(state, intents, debt, step.at, step.reason !== 'shutdown');
      state = result.state;
      for (const id of result.executed) executed.add(id);
      if (!before && state.raid.result) settle(result.denied);
    } else if (step.kind === 'auto' && version >= 10) {
      autoBattle(state, step.at, version);
    } else if (step.kind === 'admin' && isAdminAction(step.action)) {
      if (!applyAdmin(state, step.action, step.at, clock)) throw new Error('Replay admin action rejected');
      if (step.action === 'start' || step.action === 'practice' || step.action === 'clear-roster') executed.clear();
    } else if (step.kind === 'event') {
      const event = normalizeEvent(step.event);
      if (!event || event.kind === 'gift' && !event.complete) throw new Error('Invalid replay event');
      applyEvent(state, event, step.at, version, version >= 9 ? step.context : undefined);
    } else {
      throw new Error('Invalid replay operation');
    }
  }
  return { state, debt };
}
