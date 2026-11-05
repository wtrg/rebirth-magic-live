import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { Box3, Mesh, SkinnedMesh, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { classes, pets } from '../packages/shared/index.ts';

const source = new URL('../public/models/raid.glb',import.meta.url);
const bytes = await readFile(source);
if (bytes.toString('ascii',0,4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
  throw new Error('Expected a complete glTF 2.0 binary');
}
const jsonLength = bytes.readUInt32LE(12);
if (bytes.toString('ascii',16,20) !== 'JSON') throw new Error('Missing GLB JSON chunk');
const document = JSON.parse(bytes.toString('utf8',20,20+jsonLength));
if ((document.buffers ?? []).some((buffer: {uri?:string}) => buffer.uri) ||
    (document.images ?? []).some((image: {uri?:string}) => image.uri)) throw new Error('External media is outside the offline bundle contract');
const buffer = bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const gltf = await new GLTFLoader().parseAsync(buffer,'');
const expected = ['boss',...Object.keys(classes),...pets.map((_pet,index)=>'pet-'+index)];
const round = (number: number) => Math.round(number*1e6)/1e6;
const vector = (value: Vector3) => value.toArray().map(round);
const models = expected.map(id => {
  const root = gltf.scene.children.find(node=>node.name===id);
  if (!root) throw new Error('Missing model '+id);
  root.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(root,true);
  const geometries = new Set(), materials = new Set(), colors = new Set<string>();
  let meshes = 0, skinnedMeshes = 0, triangles = 0, vertexOccurrences = 0;
  const limbPivots: {limb:string;side:number;position:number[]}[] = [];
  const motionTags: string[] = [];
  const partPivots: {part:string;position:number[]}[] = [];
  root.traverse((node: Object3D) => {
    if (node.userData.limb) limbPivots.push({limb:node.userData.limb,side:node.userData.side,position:vector(node.position)});
    if (node.userData.motion) motionTags.push(node.userData.motion);
    if (node.userData.part) partPivots.push({part:node.userData.part,position:vector(node.position)});
    if (!(node instanceof Mesh)) return;
    meshes++;
    if (node instanceof SkinnedMesh) skinnedMeshes++;
    geometries.add(node.geometry.uuid);
    const vertices = node.geometry.getAttribute('position').count;
    vertexOccurrences += vertices;
    triangles += (node.geometry.index?.count ?? vertices)/3;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material.uuid);
      if ('color' in material && material.color && typeof material.color === 'object' && 'getHexString' in material.color) {
        colors.add('#'+(material.color as {getHexString():string}).getHexString());
      }
    }
  });
  if (id.startsWith('pet-')) {
    if (motionTags.length !== (id==='pet-1' ? 2 : 4)) throw new Error('Invalid pet articulation '+id);
  } else if (limbPivots.length !== 4 || partPivots.length !== 2) throw new Error('Invalid actor pivots '+id);
  return {id,bounds:{min:vector(bounds.min),max:vector(bounds.max),size:vector(bounds.getSize(new Vector3()))},
    meshes,uniqueGeometryObjects:geometries.size,uniqueMaterialObjects:materials.size,triangles,vertexOccurrences,skinnedMeshes,
    materialColors:[...colors].sort(),partPivots,limbPivots,motionTags};
});
const manifest = {
  format:'glTF 2.0 binary',file:'public/models/raid.glb',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,
  authoringSource:'apps/game/models.ts',generator:'node scripts/export-models.ts',inspector:'node scripts/inspect-models.ts',
  provenance:'Original Codex-authored procedural geometry; Gemini report NOT_RECEIVED; Leader review pending.',license:'MIT',
  units:'meters',upAxis:'+Y',actorForward:'+Z',measurement:'Rest-pose local-template bounds, before scene placement/boss scale. Triangle/vertex counts count mesh occurrences, not unique GPU allocations or culled draws.',
  embeddedImages:(document.images ?? []).length,textureDefinitions:(document.textures ?? []).length,
  roots:models,
  clips:gltf.animations.map(clip=>({name:clip.name,durationSeconds:round(clip.duration),tracks:clip.tracks.map(track=>track.name)})),
  proceduralWorldSource:'apps/game/scene.ts',runtimeBossScale:2.05,
};
const destination = new URL('../assets/manifest.json',import.meta.url);
await mkdir(new URL('.',destination),{recursive:true});
await writeFile(destination,JSON.stringify(manifest,null,2)+'\n');
console.log(`Inspected ${models.length} model roots, ${manifest.clips.length} clips and ${bytes.length} bytes → assets/manifest.json`);
