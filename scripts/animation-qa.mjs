import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { classes, pets } from '../packages/shared/index.ts';

const output = 'test-results/animation';
await mkdir(output, {recursive:true});
const server = await createServer({server:{host:'127.0.0.1',port:4193,strictPort:true}});
let browser;
const results = [];
try {
  await server.listen();
  browser = await chromium.launch({channel:process.env.QA_BROWSER ?? 'chrome'});
  for (const fallback of [false, true]) {
    const mode = fallback ? 'procedural' : 'glb';
    const page = await browser.newPage({viewport:{width:1080,height:1500}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (fallback) await page.route('**/models/raid.glb', route => route.fulfill({status:404,body:''}));
    await page.goto('http://127.0.0.1:4193/scripts/fixtures/animation.html');
    await page.waitForFunction(() => !!window.animationQA);
    assert.equal(await page.evaluate(() => window.animationQA.models), mode);
    const renderer = await page.locator('canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2');
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'WebGL2 (unmasked renderer unavailable)';
    });
    const pose = () => page.evaluate(() => window.animationQA.poses());
    const step = ms => page.evaluate(ms => window.animationQA.advance(ms), ms);
    const stage = name => page.evaluate(name => window.animationQA.stage(name), name);
    const capture = async name => {
      await page.screenshot({path:`${output}/${mode}-${name}.png`});
      return pose();
    };
    const idle = await capture('idle');
    assert.equal(idle.length,6);
    assert.equal(new Set(idle.map(actor => actor.classId)).size,6);
    assert.deepEqual([...new Set(idle.map(actor => actor.pet.index))].sort(),[0,1,2]);
    for (const actor of idle) {
      assert.equal(actor.limbs.length,4);
      assert.equal(actor.chestColor,classes[actor.classId].color,`${mode}: rendered class color`);
      if (!fallback) assert.equal(actor.modelName,actor.classId,`${mode}: GLB node identity`);
      assert.equal(actor.pet.color,pets[actor.pet.index].color,`${mode}: rendered pet color`);
      assert.equal(actor.pet.parts.length,actor.pet.index === 1 ? 2 : 4,`${mode}: pet wings/paws`);
    }
    await step(200);
    const idleLater = await pose();
    for (let i = 0; i < 6; i++) {
      assert.notDeepEqual(idleLater[i].limbs,idle[i].limbs,`${mode}: idle limbs ${i}`);
      assert.notDeepEqual(idleLater[i].pet.parts,idle[i].pet.parts,`${mode}: idle pet ${i}`);
    }
    await stage('attack');
    await step(100);
    const attack = await capture('attack');
    for (let i = 0; i < 6; i++) {
      assert.ok(attack[i].position[2] < idle[i].position[2]-0.5,`${mode}: approach ${i}`);
      assert.ok(Math.abs(attack[i].weapon) > 1,`${mode}: weapon ${i}`);
      const legs = attack[i].limbs.filter(limb => limb.kind === 'leg');
      assert.equal(legs.length,2);
      assert.ok(legs.every(limb => Math.abs(limb.x) > 0.025),`${mode}: leg stride ${i}`);
      assert.ok(attack[i].pet.position[2] > 0.4,`${mode}: pet attack ${i}`);
      assert.notDeepEqual(attack[i].pet.parts,idle[i].pet.parts,`${mode}: pet gait ${i}`);
    }
    await step(100);
    const running = await pose();
    for (let i = 0; i < 6; i++) assert.notDeepEqual(running[i].limbs.filter(limb => limb.kind === 'leg'),
      attack[i].limbs.filter(limb => limb.kind === 'leg'),`${mode}: moving legs ${i}`);
    await step(700);
    await stage('hit');
    await step(100);
    const hit = await capture('hit');
    for (const actor of hit) assert.ok(actor.bodyRotation[0] < -0.1,`${mode}: recoil ${actor.classId}`);
    await stage('pause');
    const frozen = await pose();
    const imageBefore = await page.locator('canvas').screenshot();
    await step(1000);
    assert.deepEqual(await pose(),frozen,`${mode}: paused transforms`);
    assert.deepEqual(await page.locator('canvas').screenshot(),imageBefore,`${mode}: paused pixels`);
    await stage('resume');
    await stage('defeat');
    await step(900);
    const defeat = await capture('defeat');
    for (const actor of defeat) assert.ok(actor.rotation[2] > 1.35,`${mode}: collapse ${actor.classId}`);
    await stage('revive');
    await step(900);
    const revived = await capture('revive');
    for (const actor of revived) assert.ok(Math.abs(actor.rotation[2]) < 0.01,`${mode}: revive ${actor.classId}`);
    await page.evaluate(() => {
      const qa = window.animationQA;
      qa.state.players[0].pet = null;
      qa.state.raid.supportPet = {player:qa.state.players[0].id,until:Date.now()+150};
    });
    await step(50);
    assert.equal((await pose())[0].pet.index,0,`${mode}: temporary pet active`);
    await step(200);
    assert.equal((await pose())[0].pet,null,`${mode}: temporary pet expired`);
    await stage('pause');
    await step(500);
    assert.equal((await pose())[0].pet,null,`${mode}: pause cannot resurrect expired pet`);
    await stage('resume');
    await page.evaluate(() => { window.animationQA.state.raid.supportPet.until = Date.now()+150; });
    await step(50);
    await stage('pause');
    await step(1000);
    assert.equal((await pose())[0].pet.index,0,`${mode}: active temporary pet frozen`);
    assert.deepEqual(errors,[]);
    for (const frame of [idle,attack,hit,defeat,revived]) for (const actor of frame) {
      const b = actor.projectedBounds;
      assert.ok(b.maxX > -1 && b.minX < 1 && b.maxY > -1 && b.minY < 1,`${mode}: actor intersects viewport`);
    }
    results.push({mode,renderer,idle,attack,hit,defeat,revived});
    await page.close();
  }
  await writeFile(`${output}/results.json`,JSON.stringify(results,null,2)+'\n');
  await writeFile(`${output}/manifest.json`,JSON.stringify({
    runtimeSourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    fixtureViewport:{width:1080,height:1500}, lowQuality:true,
    scenarios:['idle','attack approach and moving legs','HP recoil','paused transforms and pixels','defeat','revive',
      'temporary pet expiry','expired pet remains hidden while paused','active pet remains visible while paused'],
    modes:results.map(({mode,renderer}) => ({mode,renderer})),
    limitations:['Synthetic snapshots isolate rendering; server combat is covered separately.',
      'Manual animation clock is not an FPS benchmark.',
      'Projected bounding-box intersection does not establish lack of occlusion.',
      'Fixture excludes production HUD; visual and product approval remain pending.'],
  },null,2)+'\n');
  console.log('PASS: six classes / three pets, GLB and 404 fallback, idle, attack approach, recoil, pause, defeat and revival.');
} finally {
  await browser?.close();
  await server.close();
}
