import { mkdir, writeFile } from 'node:fs/promises';
import { AnimationClip, Euler, Quaternion, QuaternionKeyframeTrack, Scene } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createModelFactory } from '../apps/game/models.ts';
import { classes, pets, type ClassId } from '../packages/shared/index.ts';

// Three.js binary export needs FileReader's array-buffer path, which Node does not expose.
class BinaryReader {
  result: ArrayBuffer | null = null;
  onloadend?: () => void;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then(result => {
      this.result = result;
      this.onloadend?.();
    });
  }
}
Object.defineProperty(globalThis, 'FileReader', { value: BinaryReader, configurable: true });

const scene = new Scene();
const factory = createModelFactory();
const boss = factory.character('boss');
boss.root.name = 'boss';
boss.weapon.name = 'bossWeapon';
scene.add(boss.root);
for (const id of Object.keys(classes) as ClassId[]) {
  const actor = factory.character(id);
  actor.root.name = id;
  scene.add(actor.root);
}
for (let i = 0; i < pets.length; i++) {
  const pet = factory.pet(i);
  pet.name = 'pet-' + i;
  scene.add(pet);
}

function clip(name: string, duration: number, middle: number, end = 0) {
  const rotations = [0, middle, end].flatMap(angle => new Quaternion().setFromEuler(new Euler(angle, 0, 0)).toArray());
  return new AnimationClip(name, duration, [
    new QuaternionKeyframeTrack('bossWeapon.quaternion', [0, duration / 2, duration], rotations),
  ]);
}

const animations = [clip('Idle', 1.8, 0.12), clip('Run', 0.65, -0.32), clip('Attack', 0.48, -1.3),
  clip('Hit', 0.32, 0.62), clip('Defeat', 0.58, 0.72, 1.4)];
const binary = await new GLTFExporter().parseAsync(scene, { binary: true, trs: true, animations });
if (!(binary instanceof ArrayBuffer)) throw new Error('Expected binary glTF output.');
const output = new URL('../public/models/raid.glb', import.meta.url);
await mkdir(new URL('.', output), { recursive: true });
await writeFile(output, Buffer.from(binary));
console.log('Generated raid.glb (' + binary.byteLength + ' bytes).');
