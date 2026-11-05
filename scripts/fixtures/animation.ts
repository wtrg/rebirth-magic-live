import * as T from 'three';
import { createArena } from '../../apps/game/scene.ts';
import { loadRaidModels, loadVarkhazarPreview } from '../../apps/game/asset-loader.ts';
import { applyEvent, newGame } from '../../packages/combat/index.ts';
import { classes, maxHp, type GameSnapshot } from '../../packages/shared/index.ts';

// Production rendering is imported unchanged. Action QA uses a manual clock;
// the render benchmark explicitly selects native browser time instead.
const realClock = new URLSearchParams(location.search).get('clock') === 'real';
let time = 1000, serial = 0;
const epoch = Date.UTC(2026, 10, 5);
const frames = new Map<number, FrameRequestCallback>();
if (!realClock) {
  Date.now = () => epoch + time;
  window.requestAnimationFrame = callback => { frames.set(++serial, callback); return serial; };
  window.cancelAnimationFrame = id => { frames.delete(id); };
}
const captured: { scene?: T.Scene; camera?: T.Camera } = {};
const original = T.Scene.prototype.add;
T.Scene.prototype.add = function (...objects) {
  captured.scene = this;
  return original.apply(this, objects);
};
T.Scene.prototype.onBeforeRender = function (_renderer, _scene, camera) { captured.camera = camera; };
let measuring = false, overflow = false, began = 0, sampledAt = 0;
const frameTimes: number[] = [];
const resources: { at:number; geometries:number; textures:number; programs:number; calls:number; triangles:number; width:number; height:number }[] = [];
T.Scene.prototype.onAfterRender = function (renderer) {
  if (!realClock || !measuring) return;
  const at = performance.now();
  if (frameTimes.length >= 40000) { overflow = true; return; }
  frameTimes.push(at);
  if (at - sampledAt >= 1000) {
    sampledAt = at;
    const size = renderer.getDrawingBufferSize(new T.Vector2());
    resources.push({ at, ...renderer.info.memory, programs:renderer.info.programs?.length ?? 0,
      calls:renderer.info.render.calls, triangles:renderer.info.render.triangles, width:size.x, height:size.y });
  }
};
const models = await loadRaidModels().catch(() => undefined);
const varkhazar = new URLSearchParams(location.search).has('boss-preview') ? await loadVarkhazarPreview() : undefined;
const view = document.getElementById('viewport')!;
const update = createArena(view, () => true, true, models, varkhazar);
const state: GameSnapshot = { ...newGame(), mode: 'mock', live: 'unconfigured' };
const classIds = Object.keys(classes);
for (let i = 0; i < (realClock ? 64 : classIds.length); i++) {
  const id = classIds[i%classIds.length];
  const event = { id:'fixture:'+i, user:'mock:qa'+i, name:'QA '+id, kind:'chat' as const };
  applyEvent(state, { ...event, command:'!join' }, Date.now());
  applyEvent(state, { ...event, command:'!class '+id }, Date.now());
  const player = state.players[i];
  Object.assign(player, { level:3, owned:3, pet:i%3, hp:maxHp({...player, level:3}) });
}
state.raid.phase = 'PHASE_1';
update(state);

function advance(ms: number) {
  if (realClock) throw new Error('Manual time is disabled in the native-clock benchmark');
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
  if (!captured.camera) return [];
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
function beginMetrics() {
  if (!realClock) throw new Error('Metrics require the native browser clock');
  frameTimes.length = 0;
  resources.length = 0;
  sampledAt = 0;
  overflow = false;
  began = performance.now();
  measuring = true;
}
function endMetrics() {
  measuring = false;
  return {began,ended:performance.now(),frameTimes,resources,overflow,visibleActors:actors().length,players:state.players.length};
}
function bossPose() {
  const rig = captured.scene?.getObjectByName('Varkhazar_Rig');
  return rig?.getObjectByName('ArmR')?.quaternion.toArray();
}
Object.assign(window, { animationQA: { advance, poses, stage, state, beginMetrics, endMetrics, bossPose, realClock, models:models ? 'glb' : 'procedural' } });
stage('idle');
if (!realClock) advance(200);
