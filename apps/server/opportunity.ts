import { createHash } from 'node:crypto';
import { activeRaid, applyEvent, canExecuteCombatAction } from '../../packages/combat/index.ts';
import type { GameEvent, GameState } from '../../packages/shared/index.ts';

type ChatEvent = Extract<GameEvent, { kind: 'chat' }>;

export type OpportunityIntent = { event: ChatEvent; admittedAt: number };
export type OpportunityWindow = {
  openedAt: number;
  deadline: number;
  intents: Map<string, OpportunityIntent>;
};

export function openOpportunityWindow(openedAt: number, first: boolean): OpportunityWindow {
  return { openedAt, deadline: openedAt + (first ? 400 : 60), intents: new Map() };
}

export function admitOpportunityIntent(window: OpportunityWindow, intent: OpportunityIntent) {
  if (intent.admittedAt < window.openedAt || intent.admittedAt >= window.deadline ||
      window.intents.has(intent.event.user)) return false;
  window.intents.set(intent.event.user, intent);
  return true;
}

export function rankedOpportunitySlots(
  state: GameState,
  manual: ReadonlyMap<string, ChatEvent>,
  openingDebt: ReadonlyMap<string, number>,
  at: number,
) {
  if (state.raid.practice) return [];
  const slots = [];
  for (const player of state.players) {
    const intent = manual.get(player.id);
    const automatic: ChatEvent = {
      id: 'auto:' + player.id + ':' + at, user: player.id, name: player.name, kind: 'chat', command: '!attack',
    };
    const action = intent && canExecuteCombatAction(state, intent, at) ? intent :
      player.auto && canExecuteCombatAction(state, automatic, at) ? automatic : undefined;
    if (!action) continue;
    const tie = createHash('sha256').update(JSON.stringify([state.raid.stage, player.id])).digest('hex');
    slots.push({ playerId: player.id, action, manual: action === intent, debt: openingDebt.get(player.id) ?? 0, tie });
  }
  return slots.sort((a, b) => b.debt - a.debt ||
    (a.tie < b.tie ? -1 : a.tie > b.tie ? 1 : a.playerId < b.playerId ? -1 : 1));
}

export function resolveOpportunityWindow(
  initial: GameState,
  intents: readonly OpportunityIntent[],
  openingDebt: ReadonlyMap<string, number>,
  at: number,
  includeAuto = true,
) {
  let state = initial;
  const manual = new Map(intents.map(intent => [intent.event.user, intent.event]));
  const slots = rankedOpportunitySlots(initial, manual, openingDebt, at)
    .filter(slot => includeAuto || slot.manual);
  const executed = new Set<string>();
  const denied = new Set<string>();
  for (const [index, slot] of slots.entries()) {
    if (!canExecuteCombatAction(state, slot.action, at)) continue;
    const next = structuredClone(state);
    if (!applyEvent(next, slot.action, at)) continue;
    executed.add(slot.playerId);
    if (!activeRaid(next)) {
      for (const remaining of slots.slice(index + 1)) {
        if (canExecuteCombatAction(state, remaining.action, at)) denied.add(remaining.playerId);
      }
      state = next;
      break;
    }
    state = next;
  }
  return { state, eligible: slots.map(slot => slot.playerId), executed, denied };
}

export function settleRankedDebt(
  openingDebt: ReadonlyMap<string, number>,
  executed: ReadonlySet<string>,
  deniedByTerminalAction: ReadonlySet<string>,
) {
  const changes = new Map<string, number>();
  for (const id of executed) {
    const debt = openingDebt.get(id) ?? 0;
    if (debt > 0) changes.set(id, debt - 1);
  }
  for (const id of deniedByTerminalAction) {
    if (executed.has(id)) continue;
    const debt = openingDebt.get(id) ?? 0;
    if (debt < 32) changes.set(id, debt + 1);
  }
  return changes;
}
