import { AnimationMixer, LoopOnce, LoopRepeat, type AnimationAction, type AnimationClip, type Object3D } from 'three';
import type { GameSnapshot } from '../../packages/shared/index.ts';

export function createClipPlayer(root: Object3D, clips: AnimationClip[]) {
  const mixer = new AnimationMixer(root);
  const actions = new Map(clips.map(clip => [clip.name, mixer.clipAction(clip)]));
  let current: AnimationAction | undefined;
  let lastTrigger: number | undefined;
  return {
    update(name: string, delta: number, trigger?: number, seek?: number) {
      const action = actions.get(name);
      if (!action) {
        current?.stop();
        current = undefined;
        return;
      }
      const impact = name === 'Hit' || name === 'Attack';
      if (action !== current || impact && trigger !== lastTrigger) {
        current?.stop();
        action.reset().setLoop(name === 'Idle' ? LoopRepeat : LoopOnce, name === 'Idle' ? Infinity : 1);
        action.clampWhenFinished = true;
        action.play();
        current = action;
      }
      lastTrigger = trigger;
      if (seek !== undefined) {
        action.time = Math.min(action.getClip().duration, Math.max(0, seek));
        mixer.update(0);
      } else mixer.update(delta);
      return action;
    },
  };
}

export function hasTemporaryPet(state: Pick<GameSnapshot, 'paused' | 'pausedAt' | 'raid'>, player: string, now = Date.now()) {
  const at = state.paused ? state.pausedAt ?? now : now;
  const support = state.raid.supportPet;
  return support?.player === player && at < support.until;
}
