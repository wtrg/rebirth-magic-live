import { Mesh, MeshStandardMaterial, type Object3D, type AnimationClip } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { classes, pets } from '../../packages/shared/index.ts';

export type ModelTemplates = { nodes: ReadonlyMap<string, Object3D>; animations: AnimationClip[] };
export type FireMagePreview = { scene: Object3D; animations: AnimationClip[] };

export async function loadFireMagePreview(ice = false): Promise<FireMagePreview> {
  const url = ice ? new URL('../../assets/characters/ice-mage-preview/ice-mage.glb', import.meta.url) : new URL('../../assets/characters/fire-mage-preview/fire-mage.glb', import.meta.url);
  const { scene, animations } = await new GLTFLoader().loadAsync(url.href);
  const names = new Map([['idle', 'Idle'], ['move', 'Run'], ['attack', 'Attack'], ['hit', 'Hit'], ['defeat', 'Defeat']]);
  if (animations.length !== names.size || ![...names.keys()].every(name => animations.some(clip => clip.name === name))) {
    throw new Error('Missing Fire Mage preview clips');
  }
  if (ice) {
    const wool = new Set<MeshStandardMaterial>();
    scene.traverse(node => {
      if (!(node instanceof Mesh)) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        if (material instanceof MeshStandardMaterial && material.name === 'Glacier blue wool') wool.add(material);
      }
    });
    for (const material of wool) material.color.multiplyScalar(1.55);
  }
  return { scene, animations: animations.map(clip => {
    const action = clip.clone();
    action.name = names.get(clip.name)!;
    return action;
  }) };
}

export async function loadVarkhazarPreview() {
  const url = new URL('../../assets/bosses/varkhazar-preview/varkhazar.glb', import.meta.url);
  const { scene, animations } = await new GLTFLoader().loadAsync(url.href);
  const expected = ['idle', 'move', 'telegraph', 'attack', 'hit', 'defeat'];
  if (animations.length !== expected.length || !expected.every(name => animations.some(clip => clip.name === name))) {
    throw new Error('Missing Varkhazar preview clips');
  }
  for (const clip of animations) clip.name = clip.name[0].toUpperCase() + clip.name.slice(1);
  return { scene, animations };
}

export async function loadRaidModels(): Promise<ModelTemplates> {
  const { scene, animations } = await new GLTFLoader().loadAsync('/models/raid.glb');
  const templates = new Map<string, Object3D>();
  const actors = ['boss', ...Object.keys(classes)];
  for (const id of [...actors, ...pets.map((_pet, index) => 'pet-' + index)]) {
    const model = scene.children.find(child => child.name === id);
    if (!model) throw new Error('Missing GLB model ' + id);
    if (actors.includes(id)) {
      const body = model.children.find(child => child.userData.part === 'body');
      if (!body?.children.some(child => child.userData.part === 'weapon')) throw new Error('Missing GLB actor pivots');
    }
    model.traverse(node => {
      if (node instanceof Mesh && node.material instanceof MeshStandardMaterial) node.material.flatShading = true;
    });
    templates.set(id, model);
  }
  return { nodes: templates, animations };
}

export async function loadFoxForQa() {
  const { scene, animations } = await new GLTFLoader().loadAsync(new URL('../../assets/pets/fire-fox-preview/fire-fox.glb', import.meta.url).href);
  const names = new Map([['idle', 'Idle'], ['move', 'Run'], ['attack', 'Attack']]);
  if (animations.length !== names.size || ![...names.keys()].every(name => animations.some(clip => clip.name === name))) {
    throw new Error('Missing Fire Fox QA clips');
  }
  for (const clip of animations) clip.name = names.get(clip.name)!;
  return { scene, animations };
}
