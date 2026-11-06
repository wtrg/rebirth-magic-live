import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 4242, strictPort: true } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: false });
  const size = { width: 1080, height: 1920 };
  const record = process.argv.includes('--record');
  const page = await browser.newPage({ viewport: size, recordVideo: record ? { dir: 'test-results', size } : undefined });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const url = 'http://127.0.0.1:4242/scripts/fixtures/fox-portrait.html';
  await page.goto(url);
  await page.waitForFunction(() => !!window.foxPortrait);
  assert.deepEqual((await page.evaluate(() => window.foxPortrait.clips)).sort(), ['attack', 'idle', 'move']);
  await mkdir('test-results/fox-portrait', { recursive: true });
  for (const [name, fraction] of [['idle', .32], ['move', .35], ['attack', .45]]) {
    await page.evaluate(([clip, time]) => window.foxPortrait.render(clip, time), [name, fraction]);
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'test-results/fox-portrait/' + name + '.png' });
  }
  console.log(await page.locator('canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2');
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  }));
  if (record) {
    await page.reload();
    await page.waitForFunction(() => !!window.foxPortrait);
    await page.evaluate(() => window.foxPortrait.playback());
    await page.context().close();
    await page.video().saveAs('test-results/fox-portrait-playback.webm');
  } else {
    await page.route('**/fire-fox.glb', route => route.fulfill({ status: 404 }));
    await page.reload();
    await page.waitForFunction(() => !!window.foxPortrait);
    assert.equal(await page.evaluate(() => window.foxPortrait.skinned), false);
    assert.equal(await page.locator('canvas[data-models=glb]').count(), 1);
  }
  assert.deepEqual(errors, []);
  console.log(record ? 'PASS: all three poses rendered and playback recorded' :
    'PASS: all three poses rendered and missing Fire Fox GLB left the arena running');
} finally {
  await browser?.close();
  await server.close();
}
