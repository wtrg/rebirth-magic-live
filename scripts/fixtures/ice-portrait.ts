import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createArena } from '../../apps/game/scene.ts';
import { loadRaidModels } from '../../apps/game/asset-loader.ts';

const view = document.getElementById('viewport')!;
const modelUrl = new URL('../../assets/characters/ice-mage-preview/ice-mage.glb', import.meta.url);
const asset = await new GLTFLoader().loadAsync(modelUrl.href).catch(() => undefined);
const models = await loadRaidModels();
const original = T.Scene.prototype.add;
const captured: { arena?: T.Scene } = {};
T.Scene.prototype.add = function (...objects) {
  captured.arena = this;
  return original.apply(this, objects);
};
try {
  createArena(view, () => true, true, models);
} finally {
  T.Scene.prototype.add = original;
}
const { arena } = captured;
if (!arena) throw new Error('Missing arena');
const actor = asset?.scene ?? models.nodes.get('ice')!.clone(true);
actor.position.z = 4.7;
actor.position.x = 1.6;
actor.rotation.y = Math.PI;
arena.add(actor);
const mixer = new T.AnimationMixer(actor);
const pose = (name: string) => {
  mixer.stopAllAction();
  document.getElementById('pose')!.textContent = name;
  const clip = asset?.animations.find(clip => clip.name === name);
  if (!clip) return 0;
  const action = mixer.clipAction(clip);
  action.setLoop(T.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.reset().play();
  return clip.duration;
};
const render = (name: string, fraction: number) => mixer.setTime(pose(name) * fraction);
async function playback() {
  for (const name of ['idle', 'move', 'attack', 'hit', 'defeat']) {
    const duration = pose(name);
    const started = performance.now();
    await new Promise<void>(resolve => {
      const frame = (now: number) => {
        const elapsed = Math.max(0, (now - started) / 1000);
        mixer.setTime(Math.min(elapsed, duration));
        if (elapsed < duration) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  }

}
Object.assign(window, { icePortrait: { render, playback, skinned: !!asset, clips: asset?.animations.map(clip => clip.name) ?? [] } });
