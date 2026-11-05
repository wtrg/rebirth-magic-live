import * as T from 'three';
import { createModelFactory } from './models.ts';
import type { ModelTemplates } from './asset-loader.ts';
import { classes, pets, type GameState } from '../../packages/shared/index.ts';

export function createArena(view: HTMLElement, low: () => boolean, portrait: boolean, models?: ModelTemplates) {
  const renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.domElement.setAttribute('aria-label', 'Đấu trường 3D Cổng Hư Vô');
  renderer.domElement.dataset.models = models ? 'glb' : 'procedural';
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
  const factory = createModelFactory();
  const { box, gem, mesh } = factory;
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

  function character(id: keyof typeof classes | 'boss') {
    const template = models?.nodes.get(id);
    if (template) {
      const root = template.clone();
      const body = root.children.find(child => child.userData.part === 'body')!;
      const weapon = body.children.find(child => child.userData.part === 'weapon')!;
      scene.add(root);
      return { root, body, weapon };
    }
    const actor = factory.character(id);
    scene.add(actor.root);
    return actor;
  }

  const boss = character('boss');
  boss.root.scale.setScalar(2.05);
  boss.root.position.z = -1.45;
  const mixer = models?.animations.length ? new T.AnimationMixer(boss.root) : null;
  const actions = new Map(models?.animations.map(clip => [clip.name,mixer!.clipAction(clip)]) ?? []);
  let bossAction: T.AnimationAction | undefined;
  const wraithModels = [-1,1].map(side => {
    const root = new T.Group();
    root.position.set(side*2.75,0,-1.25);
    mesh(root, gem, '#613587', [0,0.73,0], [0.44,0.92,0.37]);
    mesh(root, gem, '#f19fff', [0,1.43,0.06], [0.24,0.32,0.22], true);
    mesh(root, gem, '#cb73ff', [0,0.88,0.34], [0.15,0.22,0.08], true);
    root.visible = false;
    scene.add(root);
    return root;
  });
  const squad = new Map<string, ReturnType<typeof character> & { classId: string; companion: T.Group; lastHit: number; strike: number; hp: number; recoil: number }>();
  const flash = mesh(scene, new T.TorusGeometry(1.8,0.09,4,36), '#ffd3a4', [0,0.08,-1.45], [1,1,1], true);
  flash.rotation.x = -Math.PI/2;
  flash.material = flash.material.clone();
  const sparks = new T.InstancedMesh(gem, new T.MeshBasicMaterial({ color: 0xffffff }), 12);
  sparks.frustumCulled = false;
  scene.add(sparks);
  const spark = new T.Object3D();
  const petModels = pets.map((_pet, index) => models?.nodes.get('pet-' + index) ?? factory.pet(index));
  const preview = character('fire');
  preview.root.position.set(0,0,3.3);
  preview.root.rotation.y = Math.PI;
  let state: GameState | undefined;
  function animateLimbs(body: T.Object3D, stride: number, strike: number, recoil: number) {
    for (const joint of body.children) {
      if (joint.userData.limb === 'leg') joint.rotation.x = stride*joint.userData.side;
      if (joint.userData.limb === 'arm') {
        joint.rotation.x = -stride*joint.userData.side*0.65 - strike*1.1 + recoil*0.4;
      }
    }
  }
  let serial = 0, impact = -1000, previous = 0, motionTime = 0;
  renderer.setAnimationLoop(frameTime => {
    if (frameTime - previous < (low() ? 33 : 16)) return;
    const delta = state?.paused ? 0 : Math.min(0.1, (frameTime - previous) / 1000);
    previous = frameTime;
    motionTime += delta*1000;
    const time = motionTime;
    const scale = low() ? 0.66 : 1;
    const width = Math.max(1, Math.floor(view.clientWidth * scale));
    const height = Math.max(1, Math.floor(view.clientHeight * scale));
    if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
      renderer.setSize(width,height,false);
      camera.aspect = width/height;
      camera.fov = camera.aspect < 0.88 ? 48 : portrait ? 43 : 38;
      camera.updateProjectionMatrix();
    }
    if (state?.effect && state.effect.serial !== serial) {
      serial = state.effect.serial;
      impact = time;
      flash.material.color.set(state.effect.color);
      flash.material.emissive.set(state.effect.color);
      sparks.material.color.set(state.effect.color);
    }
    const kind = state?.effect?.kind;
    const major = kind === 'ultimate' || kind === 'gift';
    const burst = Math.max(0, 1-(time-impact)/(major ? 690 : 420));
    const expanding = 1 - burst;
    const center = kind === 'boss' || kind === 'gift' ? 0 : -1.45;
    flash.visible = burst > 0;
    flash.position.z = center;
    flash.scale.setScalar((major ? 1.3 : 0.8) + expanding);
    sparks.visible = burst > 0 && (major || kind === 'skill');
    if (sparks.visible) {
      sparks.count = low() ? 6 : 12;
      for (let i = 0; i < sparks.count; i++) {
        const angle = i * Math.PI * 2 / sparks.count + expanding * (kind === 'gift' ? 1.4 : 0.3);
        const spread = 0.7 + expanding * (major ? 3.1 : 1.8);
        spark.position.set(Math.cos(angle)*spread, 0.28 + Math.sin(expanding * Math.PI)*(0.7 + (i%3)*0.28), center + Math.sin(angle)*spread);
        spark.scale.setScalar(burst*(major ? 0.19 : 0.13));
        spark.rotation.set(expanding*3, angle, expanding*4);
        spark.updateMatrix();
        sparks.setMatrixAt(i,spark.matrix);
      }
      sparks.instanceMatrix.needsUpdate = true;
    }
    for (const [index, model] of wraithModels.entries()) {
      const hp = state?.raid.wraiths?.[index]?.hp ?? 0;
      model.visible = hp > 0 && state?.raid.phase !== 'RESET';
      if (model.visible) {
        model.position.y = 0.14 + Math.sin(time*0.006+index)*0.12;
        model.rotation.y = Math.sin(time*0.002+index)*0.22;
      }
    }
    portal.rotation.z = time * 0.00015;
    boss.body.position.y = Math.sin(time*0.003)*0.09 + burst*0.17;
    const bossDown = state?.raid.phase === 'DEAD';
    boss.root.rotation.z = T.MathUtils.lerp(boss.root.rotation.z, bossDown ? 1.42 : Math.sin(time*0.002)*0.04, Math.min(1,delta*8));
    animateLimbs(boss.body, Math.sin(time*0.002)*0.035, kind === 'boss' ? burst : 0, kind !== 'boss' ? burst : 0);
    const actionName = state?.raid.phase === 'DEAD' ? 'Defeat' :
      burst > 0 && kind === 'boss' ? 'Attack' :
      burst > 0 && kind && kind !== 'gift' ? 'Hit' : 'Idle';
    const action = actions.get(actionName);
    if (action) {
      if (action !== bossAction) {
        bossAction?.stop();
        action.reset().setLoop(actionName === 'Idle' ? T.LoopRepeat : T.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.play();
        bossAction = action;
      }
      mixer?.update(delta);
    } else {
      bossAction?.stop();
      bossAction = undefined;
      boss.weapon.rotation.x = -burst;
    }
    preview.root.visible = !state?.players.length;
    preview.body.position.y = Math.sin(time*0.004)*0.06;
    animateLimbs(preview.body, Math.sin(time*0.004)*0.025,0,0);
    const players = state?.players.slice(0,low() ? 8 : 12) ?? [];
    const ids = new Set(players.map(player => player.id));
    for (const [id, actor] of squad) if (!ids.has(id)) { actor.root.removeFromParent(); squad.delete(id); }
    players.forEach((player,index) => {
      let actor = squad.get(player.id);
      if (actor?.classId !== player.classId) {
        actor?.root.removeFromParent();
        const model = character(player.classId);
        const companion = new T.Group();
        model.root.add(companion);
        actor = { ...model, classId: player.classId, companion, lastHit: player.lastHit, strike: -1000, hp: player.hp, recoil: -1000 };
        squad.set(player.id, actor);
      }
      if (player.lastHit !== actor.lastHit) { actor.lastHit = player.lastHit; actor.strike = time; }
      if (player.hp < actor.hp) actor.recoil = time;
      actor.hp = player.hp;
      const recoil = Math.max(0,1-(time-actor.recoil)/450);
      const strike = player.hp > 0 ? Math.max(0,1-(time-actor.strike)/520) : 0;
      const arc = (index-(players.length-1)/2)*Math.min(0.55,2.1/players.length);
      actor.root.position.set(Math.sin(arc)*5,0,Math.cos(arc)*4.7-strike*1.15);
      const lean = player.hp <= 0 ? 1.4 : strike*0.14;
      actor.root.rotation.set(0,Math.PI+arc,T.MathUtils.lerp(actor.root.rotation.z,lean,Math.min(1,delta*10)));
      actor.body.rotation.x = -recoil*0.23;
      const stride = Math.sin(time*(strike > 0 ? 0.03 : 0.004)+index)*(strike > 0 ? 0.5*strike : 0.025);
      animateLimbs(actor.body,stride,strike,recoil);
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
        const model = actor.companion.children[0];
        const gait = Math.sin(time*(strike > 0 ? 0.035 : 0.009) + index);
        for (const part of model.children) {
          if (part.userData.motion === 'paw-forward' || part.userData.motion === 'paw-back') {
            part.rotation.z = gait * (strike > 0 ? 0.8 : 0.10) * (part.userData.motion === 'paw-forward' ? 1 : -1);
          }
          if (part.userData.motion === 'wing-right' || part.userData.motion === 'wing-left') {
            part.rotation.x = gait * 0.52 * (part.userData.motion === 'wing-right' ? 1 : -1);
          }
        }
        actor.companion.position.set(-0.9,0.10+Math.abs(gait)*(petIndex === 1 ? 0.22 : 0.07)+strike*0.25,strike*0.8);
        actor.companion.rotation.x = strike * 0.28;
      } else actor.companion.clear();
    });
    renderer.render(scene,camera);
  });
  return (next: GameState) => { state = next; };
}
