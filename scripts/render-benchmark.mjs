import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const seconds = Number(process.env.QA_RENDER_SECONDS ?? 60);
assert.ok(Number.isInteger(seconds) && seconds >= 15 && seconds <= 600);
const output = 'test-results/render-benchmark';
await mkdir(output,{recursive:true});
const server = await createServer({server:{host:'127.0.0.1',port:4196,strictPort:true}});
let browser;
const results = [];
try {
  await server.listen();
  browser = await chromium.launch({channel:process.env.QA_BROWSER ?? 'chrome'});
  for (const fallback of [false,true]) {
    const mode = fallback ? 'procedural' : 'glb';
    const page = await browser.newPage({viewport:{width:1080,height:1500}});
    const errors = [];
    page.on('pageerror',error => errors.push(error.message));
    if (fallback) await page.route('**/models/raid.glb',route => route.fulfill({status:404,body:''}));
    await page.goto('http://127.0.0.1:4196/scripts/fixtures/animation.html?clock=real');
    await page.waitForFunction(() => window.animationQA?.realClock && window.animationQA.poses().length === 8);
    assert.equal(await page.evaluate(() => window.animationQA.models),mode);
    const renderer = await page.locator('canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2');
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'WebGL2 (unmasked renderer unavailable)';
    });
    await sleep(3000);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage');
    const retainedBefore = await cdp.send('Runtime.getHeapUsage');
    await page.evaluate(() => window.animationQA.beginMetrics());
    const started = performance.now();
    let round = 0, lastSample = started;
    const heapSamples = [];
    while (performance.now() - started < seconds*1000) {
      const at = performance.now();
      await page.evaluate(round => {
        const qa = window.animationQA;
        if (round%3 === 0) qa.state.players = qa.state.players.map((p,i) => ({...p,id:'mock:bench:'+round+':'+i}));
        qa.stage('attack');
        qa.state.effect = {serial:round+1,kind:round%4 === 0 ? 'ultimate' : 'boss',label:'Synthetic QA',color:'#d6a6ff'};
        qa.state.raid.phase = round%2 ? 'PHASE_2' : 'ENRAGED';
        qa.state.raid.wraiths = [{hp:70,maxHp:70},{hp:70,maxHp:70}];
      },round++);
      if (at-lastSample >= 5000) {
        heapSamples.push({atSeconds:(at-started)/1000,...await cdp.send('Runtime.getHeapUsage')});
        lastSample = at;
      }
      await sleep(Math.max(0,650-(performance.now()-at)));
    }
    const measured = await page.evaluate(() => window.animationQA.endMetrics());
    await cdp.send('HeapProfiler.collectGarbage');
    const retainedAfter = await cdp.send('Runtime.getHeapUsage');
    await page.screenshot({path:`${output}/${mode}.png`});
    assert.equal(measured.overflow,false);
    assert.equal(measured.players,64);
    assert.equal(measured.visibleActors,8);
    assert.ok(measured.frameTimes.length > 10);
    assert.deepEqual(errors,[]);
    const intervals = measured.frameTimes.slice(1).map((time,i)=>time-measured.frameTimes[i]).sort((a,b)=>a-b);
    const percentile = p => intervals[Math.floor((intervals.length-1)*p)];
    const duration = (measured.ended-measured.began)/1000;
    const summary = {mode,renderer,seconds:duration,renderCalls:measured.frameTimes.length,
      renderCallsPerSecond:measured.frameTimes.length/duration,
      intervalMs:{p50:percentile(0.5),p95:percentile(0.95),p99:percentile(0.99),max:intervals.at(-1)},
      rosterReplacements:Math.ceil(round/3),retainedBefore,retainedAfter,heapSamples,...measured};
    results.push(summary);
    console.log(JSON.stringify({mode,seconds:duration,renderCallsPerSecond:summary.renderCallsPerSecond,intervalMs:summary.intervalMs,
      resourceFirst:measured.resources[0],resourceLast:measured.resources.at(-1),retainedBefore:retainedBefore.usedSize,retainedAfter:retainedAfter.usedSize}));
    await page.close();
  }
  await writeFile(`${output}/results.json`,JSON.stringify({
    sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),secondsPerMode:seconds,
    scope:'Native-clock client render submissions; isolated scene, synthetic snapshots, low quality, 64 simulated/8 visible actors. No server, HUD, OBS or upstream LIVE. Geometry/texture/program counts are not GPU memory bytes. Forced-GC retained JS heap endpoints are separate from normal sampled heap. No presentation-FPS or leak-free claim.',results,
  },null,2)+'\n');
} finally {
  await browser?.close();
  await server.close();
}
