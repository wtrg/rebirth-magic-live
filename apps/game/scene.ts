import * as T from 'three';
import { classes, pets, type GameState } from '../../packages/shared/index.ts';

export function createArena(view: HTMLElement, low: () => boolean, portrait: boolean) {
  const renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.domElement.setAttribute('aria-label', 'Đấu trường 3D Cổng Hư Vô');
  view.prepend(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color(0x141123);
  scene.fog = new T.FogExp2(0x141123, 0.026);
  const camera = new T.PerspectiveCamera(portrait ? 43 : 38, 1, 0.1, 100);
  camera.position.set(6, 8, portrait ? 20 : 16);
  camera.lookAt(0, 1.2, 0);
  scene.add(new T.HemisphereLight(0xc5c7ff, 0x443053, 2.3));
  const light = new T.DirectionalLight(0xffb99e, 3);
  light.position.set(-4, 8, 3);
  scene.add(light);
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
  mesh(scene, new T.CylinderGeometry(7.7, 8.3, 0.55, 12), '#38344b', [0,-0.34,0], [1,1,1]);
  mesh(scene, new T.CylinderGeometry(6.9, 6.9, 0.08, 32), '#514663', [0,-0.045,0], [1,1,1]);
  function ring(radius: number, color: string, y: number, x = 0, z = 0) {
    mesh(scene, new T.TorusGeometry(radius, 0.026, 4, 48), color, [x,y,z], [1,1,1], true).rotation.x = -Math.PI / 2;
  }
  ring(6.5, '#af79e9', 0.02);
  ring(4.7, '#7353ba', 0.02);
  ring(2.3, '#df8c97', 0.035, 0, -1.4);
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    const x = Math.sin(angle), z = Math.cos(angle);
    mesh(scene, box, '#9366b9', [x*6,0.02,z*6], [0.38,0.025,0.12], true).rotation.y = angle;
    if (i % 2 === 0) {
      const tall = z < 0 ? 2.8 : 1;
      mesh(scene, box, '#3f3658', [x*7.4,tall/2-0.12,z*7.4], [0.58,tall,0.58]).rotation.y = angle;
      mesh(scene, gem, '#cb8bff', [x*7.4,tall+0.35,z*7.4], [0.3,0.64,0.3], true);
    }
  }
  const portal = mesh(scene, new T.TorusGeometry(2, 0.09, 5, 38), '#8559f5', [0,3,-7.4], [1,1.25,1], true);
  for (let i=0; i<24; i++) {
    const angle = i*2.4;
    mesh(scene, gem, i%3 ? '#34304e' : '#614383', [Math.sin(angle)*(9+i%4),Math.sin(i)*2-2,Math.cos(angle)*(9+i%4)], [1,2+i%3,1]).rotation.z = i;
  }

  function character(color: string, monster: boolean) {
    const root = new T.Group();
    scene.add(root);
    const armor = monster ? '#272537' : '#303150';
    const body = new T.Group();
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
    body.add(weapon);
    mesh(weapon, box, '#e8c095', [0,0.15,0], [0.09,1.2,0.09]);
    mesh(weapon, gem, color, [0,0.82,0], [0.18,0.36,0.18], true);
    return { root, body, weapon };
  }

  const boss = character('#ff526d', true);
  boss.root.scale.setScalar(2.05);
  boss.root.position.z = -1.45;
  const squad = new Map<string, ReturnType<typeof character> & { classId: string; companion: T.Group; lastHit: number; strike: number }>();
  const flash = mesh(scene, new T.TorusGeometry(1.8,0.09,4,36), '#ffd3a4', [0,0.08,-1.45], [1,1,1], true);
  flash.rotation.x = -Math.PI/2;
  const petModels = pets.map((pet, index) => {
    const group = new T.Group();
    mesh(group, sphere, pet.color, [0,0.38,0], [0.35,0.22,0.23], true);
    mesh(group, gem, pet.color, [0.26,0.49,0], [0.19,0.24,0.2], true);
    for (const side of [-1,1]) mesh(group, gem, pet.color, [0.24,0.55,side*0.23], [0.13,0.19+index*0.05,0.11], true);
    return group;
  });
  const preview = character('#fe936d', false);
  preview.root.position.set(0,0,3.3);
  preview.root.rotation.y = Math.PI;
  let state: GameState | undefined;
  let serial = 0, impact = -1000, previous = 0;
  renderer.setAnimationLoop(time => {
    if (time - previous < (low() ? 33 : 16)) return;
    previous = time;
    const scale = low() ? 0.66 : 1;
    const width = Math.max(1, Math.floor(view.clientWidth * scale));
    const height = Math.max(1, Math.floor(view.clientHeight * scale));
    if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
      renderer.setSize(width,height,false);
      camera.aspect = width/height;
      camera.fov = camera.aspect < 0.88 ? 48 : portrait ? 43 : 38;
      camera.updateProjectionMatrix();
    }
    if (state?.effect && state.effect.serial !== serial) { serial = state.effect.serial; impact = time; }
    const burst = Math.max(0, 1-(time-impact)/530);
    flash.visible = burst > 0;
    flash.scale.setScalar(1.8 - burst);
    portal.rotation.z = time * 0.00015;
    boss.body.position.y = Math.sin(time*0.003)*0.09 + burst*0.17;
    boss.root.rotation.z = state?.raid.phase === 'DEAD' ? 1.42 : Math.sin(time*0.002)*0.04;
    boss.weapon.rotation.x = -burst;
    preview.root.visible = !state?.players.length;
    preview.body.position.y = Math.sin(time*0.004)*0.06;
    const players = state?.players.slice(0,low() ? 8 : 12) ?? [];
    const ids = new Set(players.map(player => player.id));
    for (const [id, actor] of squad) if (!ids.has(id)) { actor.root.removeFromParent(); squad.delete(id); }
    players.forEach((player,index) => {
      let actor = squad.get(player.id);
      if (actor?.classId !== player.classId) {
        actor?.root.removeFromParent();
        const model = character(classes[player.classId].color, false);
        const companion = new T.Group();
        model.root.add(companion);
        actor = { ...model, classId: player.classId, companion, lastHit: player.lastHit, strike: -1000 };
        squad.set(player.id, actor);
      }
      if (player.lastHit !== actor.lastHit) { actor.lastHit = player.lastHit; actor.strike = time; }
      const strike = player.hp > 0 ? Math.max(0,1-(time-actor.strike)/520) : 0;
      const arc = (index-(players.length-1)/2)*Math.min(0.55,2.1/players.length);
      actor.root.position.set(Math.sin(arc)*5,0,Math.cos(arc)*4.7-strike*1.15);
      actor.root.rotation.set(0,Math.PI+arc,player.hp <= 0 ? 1.4 : strike*0.14);
      actor.body.position.y = Math.sin(time*0.005+index)*0.055 + strike*0.24;
      actor.weapon.rotation.x = -strike*2.1;
      const support = state?.raid.supportPet;
      const temporary = support?.player === player.id && (state?.paused || Date.now() < support.until);
      const petIndex = temporary ? player.pet ?? 0 : player.pet;
      if (petIndex !== null) {
        if (actor.companion.children[0]?.userData.index !== petIndex) {
          actor.companion.clear();
          const model = petModels[petIndex].clone();
          model.userData.index = petIndex;
          actor.companion.add(model);
        }
        actor.companion.position.set(-0.9,0.15+Math.sin(time*0.008)*0.12,strike*0.8);
      } else actor.companion.clear();
    });
    renderer.render(scene,camera);
  });
  return (next: GameState) => { state = next; };
}
