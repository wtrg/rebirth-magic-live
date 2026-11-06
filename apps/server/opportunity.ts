import { createHash } from 'node:crypto';
import { canExecuteCombatAction } from '../../packages/combat/index.ts';
import type { GameEvent, GameState } from '../../packages/shared/index.ts';

type ChatEvent = Extract<GameEvent, { kind: 'chat' }>;

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
    slots.push({ playerId: player.id, action, debt: openingDebt.get(player.id) ?? 0, tie });
  }
  return slots.sort((a, b) => b.debt - a.debt ||
    (a.tie < b.tie ? -1 : a.tie > b.tie ? 1 : a.playerId < b.playerId ? -1 : 1));
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
