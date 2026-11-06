import { activeRaid, applyEvent, autoBattle, currentRulesVersion, tick } from '../../packages/combat/index.ts';
import type { EventContext, GameEvent, GameState } from '../../packages/shared/index.ts';
import { normalizeEvent } from '../../packages/tiktok-adapter/index.ts';
import { applyAdmin, isAdminAction, type AdminAction } from './admin.ts';
import { resolveOpportunityWindow, settleRankedDebt, type OpportunityIntent } from './opportunity.ts';
import { applyParticipationCommit, participationOrder, participationPolicyId, recordParticipationWindow, settleParticipationRaid,
  type Participation, type ParticipationCommit, type ParticipationLedger } from './participation.ts';

type Step = { at: number; raidId?: string; windowSeq?: number; settlementSeq?: number } & (
  { kind: 'event'; event: GameEvent; context?: EventContext } |
  { kind: 'tick' } |
  { kind: 'auto' } |
  { kind: 'opportunity'; openedAt: number; deadline: number; closedAt: number;
    reason: 'deadline' | 'shutdown'; intents: OpportunityIntent[] } &
    ({ outcome: 'committed'; terminal: boolean } | { outcome: 'rollback' }) |
  { kind: 'admin'; action: AdminAction }
);
const limit = 10000;

export function createReplay(initial: GameState, openingDebt?: ReadonlyMap<string, number>, participation?: ParticipationLedger) {
  const trace = { version: participation ? 14 : openingDebt ? 13 : currentRulesVersion, initial: structuredClone(initial),
    openingDebt: openingDebt ? [...openingDebt] : undefined,
    policyId: participation ? participationPolicyId : undefined,
    openingParticipation: participation ? { ...participation, history: [...participation.history] } : undefined,
    steps: [] as Step[], truncated: false };
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
  const { version, initial, steps, openingDebt, policyId, openingParticipation } = raw as {
    version?: unknown; initial?: GameState; steps?: Step[]; openingDebt?: [string, number][];
    policyId?: string; openingParticipation?: { history: [string, Participation][]; windowSeq: number; settlementSeq: number };
  };
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 14 || !initial?.raid || !Array.isArray(initial.players) ||
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
  const eligible = new Set<string>();
  let raidId: string | undefined;
  let participation: ParticipationLedger | undefined;
  if (version === 14) {
    if (policyId !== participationPolicyId || !openingParticipation || !Array.isArray(openingParticipation.history) ||
        !validCounter(openingParticipation.windowSeq) || !validCounter(openingParticipation.settlementSeq)) {
      throw new Error('Invalid opening participation ledger');
    }
    const history = new Map<string, Participation>();
    for (const entry of openingParticipation.history) {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string' || history.has(entry[0])) throw new Error('Invalid participation identity');
      const stats = entry[1];
      if (!stats || !validCounter(stats.eligibleRaids) || !validCounter(stats.servedRaids) ||
          stats.servedRaids > stats.eligibleRaids || typeof stats.everExecuted !== 'boolean' ||
          !validCounter(stats.firstEligibleSeq) || !stats.firstEligibleSeq || stats.firstEligibleSeq > openingParticipation.windowSeq ||
          (stats.everExecuted ? !validCounter(stats.lastServedSeq) || stats.lastServedSeq < stats.firstEligibleSeq ||
            stats.lastServedSeq > openingParticipation.windowSeq : stats.lastServedSeq !== null || stats.servedRaids !== 0)) {
        throw new Error('Invalid opening participation stats');
      }
      history.set(entry[0], stats);
    }
    participation = { ...openingParticipation, history };
  }
  const raidIds = new Set<string>();
  function validCounter(value: unknown): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  }
  function settlement(step: Step, terminal: boolean): ParticipationCommit['settlement'] {
    if (!participation) return;
    if (!terminal) {
      if (step.settlementSeq !== undefined) throw new Error('Unexpected participation settlement');
      return;
    }
    if (!raidId || step.raidId !== raidId || step.settlementSeq !== participation.settlementSeq + 1) {
      throw new Error('Invalid participation settlement');
    }
    return { raidId, sequence: step.settlementSeq, stage: state.raid.stage, at: step.at };
  }
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
      const settled = settlement(step, !state.raid.practice && !before && !!state.raid.result);
      if (participation && settled) {
        applyParticipationCommit(participation, { changes: settleParticipationRaid(participation.history, eligible, executed), settlement: settled });
        eligible.clear();
        executed.clear();
      }
    } else if (step.kind === 'opportunity' && version >= 13) {
      if (participation && (!raidId || step.raidId !== raidId || state.paused || state.raid.practice || !activeRaid(state))) {
        throw new Error('Participation window outside an active ranked raid');
      }
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
      if (step.outcome === 'rollback') {
        if (participation && (step.windowSeq !== undefined || step.settlementSeq !== undefined)) {
          throw new Error('Rolled back participation window has a commit sequence');
        }
        continue;
      }
      if (step.outcome !== 'committed') throw new Error('Invalid opportunity outcome');
      const before = state.raid.result;
      const order = participation && participationOrder(participation.history, participation.windowSeq + 1);
      const result = resolveOpportunityWindow(state, intents, debt, step.at, step.reason !== 'shutdown', order);
      const terminal = !before && !!result.state.raid.result;
      // Early v13 MOCK captures predate the explicit terminal marker.
      if ((participation || step.terminal !== undefined) && step.terminal !== terminal) throw new Error('Invalid opportunity terminal outcome');
      state = result.state;
      for (const id of result.executed) executed.add(id);
      if (participation) {
        if (!raidId || step.raidId !== raidId || step.windowSeq !== participation.windowSeq + 1) {
          throw new Error('Invalid participation window sequence');
        }
        const windowEligible = new Set([...result.executed, ...result.denied]);
        for (const id of windowEligible) eligible.add(id);
        const changes = recordParticipationWindow(participation.history, windowEligible, result.executed, step.windowSeq);
        const settled = settlement(step, terminal);
        applyParticipationCommit(participation, {
          changes: settled ? settleParticipationRaid(new Map([...participation.history, ...changes]), eligible, executed) : changes,
          window: { raidId, id: raidId + ':' + step.windowSeq, sequence: step.windowSeq },
          settlement: settled,
        });
        if (settled) { eligible.clear(); executed.clear(); }
      } else if (terminal) settle(result.denied);
    } else if (step.kind === 'auto' && version >= 10) {
      if (participation && !state.raid.practice && activeRaid(state)) throw new Error('Ranked auto requires a participation window');
      autoBattle(state, step.at, version);
    } else if (step.kind === 'admin' && isAdminAction(step.action)) {
      if (!applyAdmin(state, step.action, step.at, clock)) throw new Error('Replay admin action rejected');
      if (step.action === 'start' || step.action === 'practice' || step.action === 'clear-roster') {
        executed.clear();
        eligible.clear();
        raidId = undefined;
        if (participation && step.action === 'start') {
          if (typeof step.raidId !== 'string' || !step.raidId || raidIds.has(step.raidId)) throw new Error('Invalid participation raid identity');
          raidIds.add(step.raidId);
          raidId = step.raidId;
        }
      }
    } else if (step.kind === 'event') {
      const event = normalizeEvent(step.event);
      if (!event || event.kind === 'gift' && !event.complete) throw new Error('Invalid replay event');
      if (participation && !state.raid.practice && activeRaid(state) && event.kind === 'chat' &&
          /^!(skill1|skill2|ult|attack)(?:\s|$)/.test(event.command)) {
        throw new Error('Ranked combat command requires a participation window');
      }
      applyEvent(state, event, step.at, version, version >= 9 ? step.context : undefined);
    } else {
      throw new Error('Invalid replay operation');
    }
  }
  return { state, debt, ...(participation ? { participation } : {}) };
}
