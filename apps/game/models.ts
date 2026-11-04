import * as T from 'three';
import { pets } from '../../packages/shared/index.ts';

export function createModelFactory() {
  const box = new T.BoxGeometry(), gem = new T.OctahedronGeometry(1), sphere = new T.IcosahedronGeometry(1, 1);
  const materials = new Map<string, T.MeshStandardMaterial>();
  function mesh(parent: T.Object3D, geo: T.BufferGeometry, color: string, position: number[], scale: number[], glow = false) {
    const key = color + glow;
    let mat = materials.get(key);
    if (!mat) {
      mat = new T.MeshStandardMaterial({ color, roughness: 0.79, flatShading: true, emissive: glow ? color : '#000000', emissiveIntensity: 0.75 });
      materials.set(key, mat);
    }
    const object = new T.Mesh(geo, mat);
    object.position.set(position[0], position[1], position[2]);
    object.scale.set(scale[0], scale[1], scale[2]);
    parent.add(object);
    return object;
  }
  function character(color: string, monster: boolean) {
    const root = new T.Group();
    const armor = monster ? '#272537' : '#303150';
    const body = new T.Group();
    body.userData.part = 'body';
    root.add(body);
    mesh(body, gem, armor, [0,1.05,0], [0.55,0.75,0.36]);
    mesh(body, gem, color, [0,1.13,0.33], [0.23,0.29,0.11], true);
    mesh(body, sphere, monster ? '#3d3248' : '#ffd2bc', [0,1.78,0], [0.34,0.39,0.32]);
    mesh(body, gem, monster ? '#1e1e36' : color, [0,2,-0.06], [0.41,0.37,0.38]);
    for (const side of [-1,1]) {
      mesh(body, box, armor, [side*0.22,0.42,0], [0.25,0.7,0.27]);
      mesh(body, box, '#212038', [side*0.22,0.09,0.1], [0.27,0.17,0.42]);
      mesh(body, gem, color, [side*0.52,1.36,0], [0.31,0.26,0.34]);
      mesh(body, box, armor, [side*0.55,1.04,0.04], [0.2,0.48,0.23]).rotation.z = side*0.18;
      mesh(body, box, monster ? color : '#312541', [side*0.12,1.79,0.29], [0.1,0.04,0.05], monster);
      if (monster) {
        mesh(body, gem, '#ff6887', [side*0.37,2.12,0], [0.16,0.49,0.18], true).rotation.z = -side*0.38;
        mesh(body, gem, '#554264', [side*0.7,1.33,-0.28], [0.63,0.98,0.18]).rotation.z = -side*0.52;
      }
    }
    const weapon = new T.Group();
    weapon.position.set(0.68,0.98,0.12);
    weapon.userData.part = 'weapon';
    body.add(weapon);
    mesh(weapon, box, '#e8c095', [0,0.15,0], [0.09,1.2,0.09]);
    mesh(weapon, gem, color, [0,0.82,0], [0.18,0.36,0.18], true);
    return { root, body, weapon };
  }

  function pet(index: number) {
    const definition = pets[index];
    const group = new T.Group();
    mesh(group, sphere, definition.color, [0,0.38,0], [0.35,0.22,0.23], true);
    mesh(group, gem, definition.color, [0.26,0.49,0], [0.19,0.24,0.2], true);
    for (const side of [-1,1]) {
      if (index === 1) {
        const wing = mesh(group, gem, '#b6eeff', [0,0.45,side*0.25], [0.24,0.07,0.40], true);
        wing.userData.motion = side === 1 ? 'wing-right' : 'wing-left';
      } else {
        mesh(group, gem, definition.color, [0.27,0.64,side*0.13], [0.10,0.13,0.08], true);
        for (const end of [-1,1]) {
          const paw = mesh(group, box, definition.color, [end*0.19,0.19,side*0.14], [0.12,0.24,0.12]);
          paw.userData.motion = side*end === 1 ? 'paw-forward' : 'paw-back';
        }
      }
    }
    const tail = mesh(group, gem, index === 1 ? '#b6eeff' : definition.color, [-0.39,0.45,0], [0.31,0.12,0.12], true);
    tail.rotation.z = index === 2 ? -0.72 : -0.35;
    group.rotation.y = -Math.PI/2;
    return group;
  }
  return { box, gem, mesh, character, pet };
}
