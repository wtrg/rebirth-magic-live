import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 4241, strictPort: true } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: false });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = 'http://127.0.0.1:4241/scripts/fixtures/ice-portrait.html';
  await page.goto(url);
  await page.waitForFunction(() => !!window.icePortrait);
  assert.deepEqual((await page.evaluate(() => window.icePortrait.clips)).sort(), ['attack', 'defeat', 'hit', 'idle', 'move']);
  await mkdir('test-results/ice-portrait', { recursive: true });
  for (const [name, fraction] of [['idle', .32], ['move', .35], ['attack', .45], ['hit', .3], ['defeat', .95]]) {
    await page.evaluate(([clip, time]) => window.icePortrait.render(clip, time), [name, fraction]);
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'test-results/ice-portrait/' + name + '.png' });
  }
  console.log(await page.locator('canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2');
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  }));
  await page.route('**/ice-mage.glb', route => route.fulfill({ status: 404 }));
  await page.reload();
  await page.waitForFunction(() => !!window.icePortrait);
  assert.equal(await page.evaluate(() => window.icePortrait.skinned), false);
  assert.equal(await page.locator('canvas[data-models=glb]').count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS: all five poses rendered and missing Ice GLB left the arena running');
} finally {
  await browser?.close();
  await server.close();
}
