import * as T from 'three';
import { createArena } from '../../apps/game/scene.ts';
import { loadRaidModels } from '../../apps/game/asset-loader.ts';
import { applyEvent, newGame } from '../../packages/combat/index.ts';
import { classes, maxHp, type GameSnapshot } from '../../packages/shared/index.ts';

// A manual clock controls only this fixture. Production rendering is imported unchanged.
let time = 1000, serial = 0;
const epoch = Date.UTC(2026, 10, 5);
Date.now = () => epoch + time;
const frames = new Map<number, FrameRequestCallback>();
window.requestAnimationFrame = callback => { frames.set(++serial, callback); return serial; };
window.cancelAnimationFrame = id => { frames.delete(id); };
const captured: { scene?: T.Scene; camera?: T.Camera } = {};
const original = T.Scene.prototype.add;
T.Scene.prototype.add = function (...objects) {
  captured.scene = this;
  return original.apply(this, objects);
};
T.Scene.prototype.onBeforeRender = function (_renderer, _scene, camera) { captured.camera = camera; };
const models = await loadRaidModels().catch(() => undefined);
const view = document.getElementById('viewport')!;
const update = createArena(view, () => true, true, models);
const state: GameSnapshot = { ...newGame(), mode: 'mock', live: 'unconfigured' };
for (const [i, id] of Object.keys(classes).entries()) {
  const event = { id:'fixture:'+i, user:'mock:qa'+i, name:'QA '+id, kind:'chat' as const };
  applyEvent(state, { ...event, command:'!join' }, Date.now());
  applyEvent(state, { ...event, command:'!class '+id }, Date.now());
  const player = state.players[i];
  Object.assign(player, { level:3, owned:3, pet:i%3, hp:maxHp({...player, level:3}) });
}
state.raid.phase = 'PHASE_1';
update(state);

function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms;) {
    const step = Math.min(50, ms - elapsed);
    time += step;
    elapsed += step;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(time);
  }
}
function actors() {
  return captured.scene!.children.filter(root => root.visible && root.scale.x === 1 &&
    root.children.some(child => child.userData.part === 'body'));
}
function poses() {
  return actors().map((root, i) => {
    const body = root.children.find(child => child.userData.part === 'body')!;
    const companion = root.children.find(child => child !== body);
    const pet = companion?.children[0];
    const chest = body.children.find(child => child instanceof T.Mesh && Math.abs(child.position.z-0.33) < 0.001) as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;
    const bounds = new T.Box3().setFromObject(root);
    const projected = [];
    for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) {
      projected.push(new T.Vector3(x,y,z).project(captured.camera!));
    }
    const firstPetMesh = pet?.children.find(child => child instanceof T.Mesh) as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial> | undefined;
    return {
      classId:state.players[i].classId, modelName:root.name, chestColor:'#'+chest.material.color.getHexString(),
      projectedBounds:{minX:Math.min(...projected.map(p=>p.x)),maxX:Math.max(...projected.map(p=>p.x)),
        minY:Math.min(...projected.map(p=>p.y)),maxY:Math.max(...projected.map(p=>p.y))},
      position:root.position.toArray(), rotation:root.rotation.toArray().slice(0,3),
      bodyRotation:body.rotation.toArray().slice(0,3),
      limbs:body.children.filter(child => child.userData.limb).map(child => ({
        kind:child.userData.limb as string, side:child.userData.side as number, x:child.rotation.x,
      })),
      weapon:body.children.find(child => child.userData.part === 'weapon')!.rotation.x,
      pet:pet ? { index:pet.userData.index as number, color:'#'+firstPetMesh!.material.color.getHexString(), position:companion!.position.toArray(),
        rotation:companion!.rotation.x,
        parts:pet.children.filter(child => child.userData.motion).map(child => ({
          motion:child.userData.motion as string, rotation:child.rotation.toArray().slice(0,3),
        })) } : null,
    };
  });
}
function stage(name: string) {
  document.getElementById('label')!.textContent = `${models ? 'GLB' : 'PROCEDURAL'} · ${name} · six classes / three pets`;
  if (name === 'attack') for (const player of state.players) player.lastHit = Date.now();
  if (name === 'hit') for (const player of state.players) player.hp -= 20;
  if (name === 'defeat') for (const player of state.players) player.hp = 0;
  if (name === 'revive') for (const player of state.players) player.hp = maxHp(player);
  if (name === 'pause') { state.paused = true; state.pausedAt = Date.now(); }
  if (name === 'resume') { state.paused = false; delete state.pausedAt; }
  update(state);
}
Object.assign(window, { animationQA: { advance, poses, stage, state, models:models ? 'glb' : 'procedural' } });
stage('idle');
advance(200);
