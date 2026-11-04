import type { EffectKind } from '../../packages/shared/index.ts';

type Cue = EffectKind | 'spawn' | 'victory' | 'defeat';
const tones: Record<Cue, [number, number, OscillatorType, number]> = {
  strike: [190, 85, 'triangle', 0.10],
  skill: [380, 175, 'triangle', 0.16],
  ultimate: [520, 105, 'sawtooth', 0.24],
  boss: [105, 42, 'triangle', 0.24],
  gift: [520, 1040, 'sine', 0.24],
  spawn: [68, 137, 'triangle', 0.55],
  victory: [392, 784, 'sine', 0.45],
  defeat: [220, 82, 'triangle', 0.46],
};

export function createCombatAudio() {
  let context: AudioContext | undefined;
  let enabled = false;
  let lastCue = -1;

  return {
    async enable() {
      try {
        context ??= new AudioContext();
        await context.resume();
        enabled = context.state === 'running';
      } catch {
        enabled = false;
      }
      return enabled;
    },
    disable() {
      enabled = false;
      if (context?.state === 'running') void context.suspend().catch(() => {});
    },
    play(cue: Cue) {
      if (!enabled || context?.state !== 'running') return;
      const at = context.currentTime;
      if (at - lastCue < 0.10 && cue !== 'spawn' && cue !== 'victory' && cue !== 'defeat') return;
      lastCue = at;
      const [from, to, wave, duration] = tones[cue];
      const note = context.createOscillator();
      const volume = context.createGain();
      note.type = wave;
      note.frequency.setValueAtTime(from, at);
      note.frequency.exponentialRampToValueAtTime(to, at + duration);
      volume.gain.setValueAtTime(0.001, at);
      volume.gain.linearRampToValueAtTime(wave === 'sawtooth' ? 0.035 : 0.075, at + 0.015);
      volume.gain.exponentialRampToValueAtTime(0.001, at + duration);
      note.connect(volume).connect(context.destination);
      note.start(at);
      note.stop(at + duration);
      note.onended = () => { note.disconnect(); volume.disconnect(); };
    },
  };
}
