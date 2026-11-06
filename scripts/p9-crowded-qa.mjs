import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';
import { applyEvent, newGame } from '../packages/combat/index.ts';
import { openStore } from '../apps/server/store.ts';

const folder = await mkdtemp(join(tmpdir(), 'rebirth-crowded-'));
const database = join(folder, 'synthetic.sqlite');
const base = 'http://127.0.0.1:4243';
const roster = ['ice', 'fire', 'thunder', 'knight', 'healer', 'summon', 'ice', 'fire'];
const benchmark = process.argv.includes('--benchmark');
const record = process.argv.includes('--record');
assert.ok(!(benchmark && record));
const event = (i, command) => ({ id: 'crowded:' + i + ':' + command.slice(1), user: 'mock:crowded-' + i,
  name: 'QA ' + i, kind: 'chat', command });
const seed = newGame();
for (const [i, classId] of roster.entries()) {
  applyEvent(seed, event(i, '!join'), 1);
  Object.assign(seed.players[i], { classId, owned: 3, pet: i % 3 });
}
const store = openStore(database);
store.commit(seed.players);
store.close();
const server = spawn(process.execPath, ['apps/server/index.ts'], {
  env: { ...process.env, PORT: '4243', DB_PATH: database, REBIRTH_MODE: 'mock' },
  stdio: ['ignore', 'pipe', 'inherit'],
});
const closed = once(server, 'close');
let ready = false, browser;
server.stdout.on('data', chunk => { if (String(chunk).includes(base)) ready = true; });
const post = async (path, body) => {
  const response = await fetch(base + path, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(3000) });
  assert.ok(response.ok);
};
try {
  for (let i = 0; i < 100 && !ready; i++) await sleep(40);
  assert.ok(ready);
  await mkdir('test-results', { recursive: true });
  for (const [i] of roster.entries()) await post('/event', event(i, '!join'));
  await post('/admin', 'start');
  browser = await chromium.launch({ channel: 'chrome', headless: false });
  const modes = record ? ['paired'] : benchmark ? ['default', 'paired', 'paired', 'default'] :
    ['default', 'paired', 'ice-missing', 'fox-missing'];
  for (const mode of modes) {
    const size = { width: 1080, height: 1920 };
    const page = await browser.newPage({ viewport: size, recordVideo: record ? { dir: 'test-results', size } : undefined });
    const errors = [], candidateRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/(ice-mage|fire-fox)-[^/]+\.glb$/.test(request.url())) candidateRequests.push(request.url());
    });
    if (mode === 'ice-missing') await page.route('**/ice-mage-*.glb', route => route.fulfill({ status: 404 }));
    if (mode === 'fox-missing') await page.route('**/fire-fox-*.glb', route => route.fulfill({ status: 404 }));
    if (benchmark) await page.addInitScript(() => {
      let draws = 0;
      const prototype = WebGL2RenderingContext.prototype;
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const draw = prototype[name];
        prototype[name] = function (...args) {
          draws++;
          return draw.apply(this, args);
        };
      }
      const request = window.requestAnimationFrame.bind(window);
      window.qaDraws = [];
      window.requestAnimationFrame = callback => request(time => {
        const before = draws;
        callback(time);
        if (draws > before) window.qaDraws.push([time, draws - before]);
      });
    });
    await page.goto(base + '/?overlay&fire-preview=1&boss-preview=1' + (mode === 'default' ? '' : '&crowded-qa=1'));
    const canvas = page.locator('canvas[data-fire-preview=skinned][data-boss-preview=skinned]');
    await canvas.waitFor();
    await page.waitForFunction(() => document.querySelector('#count')?.textContent === '08');
    assert.equal(await canvas.getAttribute('data-ice-preview'), ['paired', 'fox-missing'].includes(mode) ? 'skinned' : null);
    assert.equal(await canvas.getAttribute('data-fox-preview'), ['paired', 'ice-missing'].includes(mode) ? 'skinned' : null);
    assert.equal(candidateRequests.length, mode === 'default' ? 0 : 2);
    if (benchmark) {
      await page.waitForFunction(() => document.querySelector('#phase')?.textContent === 'GIAI ĐOẠN I');
      await page.evaluate(() => { window.qaDraws.length = 0; });
      await sleep(3000);
      const samples = await page.evaluate(() => window.qaDraws.slice());
      assert.ok(samples.length > 10);
      assert.equal(await page.locator('#phase').textContent(), 'GIAI ĐOẠN I');
      const renderer = await canvas.evaluate(node => {
        const gl = node.getContext('webgl2');
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        return gl.getParameter(info?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
      });
      const gaps = samples.slice(1).map(([time], i) => time - samples[i][0]).sort((a, b) => a - b);
      const draws = samples.map(([, count]) => count).sort((a, b) => a - b);
      console.log(JSON.stringify({ mode, renderer, samples: samples.length, p95Ms: gaps[Math.floor(.95 * (gaps.length - 1))],
        maxGapMs: gaps.at(-1), medianDraws: draws[Math.floor(draws.length / 2)] }));
    } else await page.screenshot({ path: 'test-results/p9-crowded-' + mode + '.png' });
    if (!benchmark && mode === 'paired') {
      await page.waitForFunction(() => document.querySelector('#phase')?.textContent === 'GIAI ĐOẠN I');
      await post('/event', event(0, '!attack'));
      await page.locator('canvas[data-fox-attacking]').waitFor();
      await page.screenshot({ path: 'test-results/p9-crowded-fox-attack.png' });
      await page.locator('canvas[data-fox-attacking]').waitFor({ state: 'detached' });
      if (record) {
        for (const [i] of roster.entries()) {
          await post('/event', event(i, '!skill1'));
          await sleep(110);
        }
        await page.getByText('CHẤN ĐỘNG', { exact: true }).waitFor();
        await sleep(750);
      }
    }
    assert.deepEqual(errors, []);
    if (record) {
      await page.context().close();
      await page.video().saveAs('test-results/p9-crowded-playback.webm');
    } else await page.close();
  }
  if (record) console.log('PASS: eight-player HUD, player skills and boss impact recorded');
  else if (!benchmark) console.log('PASS: eight-player HUD, both opt-in assets and independent fallback');
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) server.kill();
  await closed;
  await rm(folder, { recursive: true, force: true, maxRetries: 5 });
}
