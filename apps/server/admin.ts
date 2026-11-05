import { activeRaid, beginRaid } from '../../packages/combat/index.ts';
import type { GameState } from '../../packages/shared/index.ts';

export type AdminAction = 'start' | 'practice' | 'pause' | 'resume' | 'clear-roster';

export function isAdminAction(action: unknown): action is AdminAction {
  return action === 'start' || action === 'practice' || action === 'pause' || action === 'resume' || action === 'clear-roster';
}

export function applyAdmin(state: GameState, action: AdminAction, now: number, clock: { pausedAt: number }) {
  if (action === 'start' || action === 'practice') return beginRaid(state, now, action === 'practice');
  if (action === 'clear-roster') {
    if (state.paused || activeRaid(state) || state.raid.phase === 'SPAWN') return false;
    state.players.length = 0;
    state.logs.unshift('Đội hình đã giải tán · !join để trở lại');
    state.logs.length = Math.min(12,state.logs.length);
  }
  if (action === 'pause' && !state.paused) {
    clock.pausedAt = now;
    state.paused = true;
  }
  if (action === 'resume' && state.paused) {
    const elapsed = now - clock.pausedAt;
    state.raid.next += elapsed;
    if (state.raid.wardUntil > clock.pausedAt) state.raid.wardUntil += elapsed;
    for (const buff of [state.raid.supportPet, state.raid.awakening]) {
      if (buff && buff.until > clock.pausedAt) buff.until += elapsed;
    }
    for (const player of state.players) player.ready = player.ready.map(time => time > clock.pausedAt ? time + elapsed : time);
    state.paused = false;
  }
  return true;
}
