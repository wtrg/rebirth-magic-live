import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';

const root = await mkdtemp(join(tmpdir(),'rebirth-qa-'));
const base = 'http://127.0.0.1:4178';
let server, browser;
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
async function start() {
  server = spawn(process.execPath,['apps/server/index.ts'], { stdio: 'inherit', env: { ...process.env, PORT:'4178', DB_PATH:join(root,'test.sqlite') } });
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error('QA server exited early');
    if (await fetch(base + '/health').then(res => res.ok).catch(() => false)) return;
    await sleep(100);
  }
  throw new Error('QA server did not respond');
}
async function stop() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const closed = once(server,'close');
  server.kill();
  await closed;
}
async function waitForText(page, selector, text) {
  await page.locator(selector).filter({ hasText:text }).waitFor();
}
try {
  await start();
  const send = (path,body,origin = base) => fetch(base+path,{ method:'POST', headers: { Origin:origin, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
  assert.equal((await send('/admin','pause','http://example.test')).status,403);
  assert.equal((await send('/event',{ kind:'chat' })).status,400);
  browser = await chromium.launch({ channel:process.env.QA_BROWSER ?? 'chrome', args:['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1280,height:900} });
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  await page.goto(base);
  await waitForText(page,'#mode','OFFLINE');
  await page.getByRole('button',{ name:'Tham gia' }).click();
  await waitForText(page,'#party','Astra');
  await sleep(230);
  await page.locator('#class').selectOption('thunder');
  await waitForText(page,'#party','Lôi Pháp Sư');
  await page.getByRole('button',{ name:'Bắt đầu Raid' }).click();
  await waitForText(page,'#phase','GIAI ĐOẠN I');
  const overlay = await browser.newPage({ viewport:{width:540,height:960} });
  overlay.on('pageerror',error => errors.push(error.message));
  await overlay.goto(base+'/?overlay=1');
  await waitForText(overlay,'#party','Astra');
  assert.equal(await overlay.locator('#operator').isVisible(),false);
  const canvas = overlay.locator('canvas');
  await canvas.waitFor();
  const dimensions = await overlay.locator('#broadcast').boundingBox();
  assert.ok(Math.abs(dimensions.width/dimensions.height-9/16) < 0.005);
  const renderer = await canvas.evaluate(element => {
    const gl = element.getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable';
  });
  await page.getByRole('button',{ name:'Dừng khẩn cấp' }).click();
  await waitForText(page,'#phase','TẠM DỪNG');
  const pausedHp = await page.locator('#boss-value').textContent();
  await page.getByRole('button',{ name:'Tấn công',exact:true }).click();
  await waitForText(page,'#feedback','Đang dừng');
  assert.equal(await page.locator('#boss-value').textContent(),pausedHp);
  await page.getByRole('button',{ name:'Tiếp tục',exact:true }).click();
  await page.locator('#auto').check();
  await mkdir('docs/reports/evidence',{recursive:true});
  await overlay.screenshot({path:'docs/reports/evidence/portrait-raid.png'});
  await overlay.locator('#phase').filter({hasText:'CHIẾN THẮNG'}).waitFor({timeout:45000});
  await page.locator('#auto').uncheck();
  await waitForText(page,'#party','Lv.2');
  await overlay.screenshot({path:'docs/reports/evidence/portrait-victory.png'});
  await sleep(250);
  await page.getByRole('button',{ name:'Gọi Pet' }).click();
  await waitForText(page,'#party','Hỏa Hồ');
  await sleep(250);
  const gift = { id:'qa-gift',user:'mock:astra',name:'Astra',kind:'gift',giftId:'mock-5',complete:false };
  assert.equal((await send('/event',gift)).status,202);
  await sleep(250);
  assert.equal((await send('/event',{...gift,complete:true})).status,202);
  await waitForText(page,'#logs','Linh thú hỗ trợ');
  await sleep(250);
  assert.equal((await send('/event',{...gift,complete:true})).status,202);
  await sleep(250);
  assert.equal(await page.locator('#logs li').filter({hasText:'Linh thú hỗ trợ'}).count(),1);
  await stop();
  await waitForText(page,'#mode','KẾT NỐI LẠI');
  await start();
  await waitForText(page,'#mode','OFFLINE');
  await waitForText(page,'#party','Hỏa Hồ');
  await waitForText(page,'#party','Lv.2');
  assert.match(await page.locator('#ranking').textContent(),/Astra · [1-9]\d* điểm/);
  assert.deepEqual(errors,[]);
  console.log('PASS: 3D portrait, boss victory, pause/resume, security, gift deduplication, persistence, reconnect.');
  console.log('WebGL renderer:',renderer);
} finally {
  await browser?.close();
  await stop();
  await rm(root,{recursive:true,force:true,maxRetries:5});
}
