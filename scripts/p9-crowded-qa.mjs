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
  await Promise.all(roster.map((_, i) => post('/event', event(i, '!join'))));
  await post('/admin', 'start');
  browser = await chromium.launch({ channel: 'chrome', headless: false });
  for (const mode of ['default', 'paired', 'ice-missing', 'fox-missing']) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    const errors = [], candidateRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/(ice-mage|fire-fox)-[^/]+\.glb$/.test(request.url())) candidateRequests.push(request.url());
    });
    if (mode === 'ice-missing') await page.route('**/ice-mage-*.glb', route => route.fulfill({ status: 404 }));
    if (mode === 'fox-missing') await page.route('**/fire-fox-*.glb', route => route.fulfill({ status: 404 }));
    await page.goto(base + '/?overlay&fire-preview=1&boss-preview=1' + (mode === 'default' ? '' : '&crowded-qa=1'));
    const canvas = page.locator('canvas[data-fire-preview=skinned][data-boss-preview=skinned]');
    await canvas.waitFor();
    await page.waitForFunction(() => document.querySelector('#count')?.textContent === '08');
    assert.equal(await canvas.getAttribute('data-ice-preview'), ['paired', 'fox-missing'].includes(mode) ? 'skinned' : null);
    assert.equal(await canvas.getAttribute('data-fox-preview'), ['paired', 'ice-missing'].includes(mode) ? 'skinned' : null);
    assert.equal(candidateRequests.length, mode === 'default' ? 0 : 2);
    await page.screenshot({ path: 'test-results/p9-crowded-' + mode + '.png' });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('PASS: eight-player HUD, both opt-in assets and independent fallback');
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) server.kill();
  await closed;
  await rm(folder, { recursive: true, force: true, maxRetries: 5 });
}
