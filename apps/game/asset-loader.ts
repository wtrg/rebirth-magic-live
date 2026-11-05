import { Mesh, MeshStandardMaterial, type Object3D, type AnimationClip } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { classes, pets } from '../../packages/shared/index.ts';

export type ModelTemplates = { nodes: ReadonlyMap<string, Object3D>; animations: AnimationClip[] };

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
