import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { WebSocket } from 'ws';
import { openStore } from '../apps/server/store.ts';
import { playReplay } from '../apps/server/replay.ts';

const root = await mkdtemp(join(tmpdir(),'rebirth-qa-'));
const base = 'http://127.0.0.1:4178';
let server, browser;
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
async function start(dbPath = join(root,'test.sqlite')) {
  server = spawn(process.execPath,['apps/server/index.ts'], { stdio: ['ignore','pipe','inherit'], env: { ...process.env, PORT:'4178', REBIRTH_MODE:'mock', REBIRTH_RECORD_REPLAY:'1', DB_PATH:dbPath } });
  let ready = false, output = '';
  server.stdout.on('data', bytes => {
    output += String(bytes);
    if (output.includes('RE:BIRTH MOCK · ' + base)) ready = true;
  });
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error('QA server exited early');
    if (ready && await fetch(base + '/health').then(res => res.ok).catch(() => false)) return;
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
async function verifyReplay() {
  const response = await fetch(base + '/replay');
  assert.equal(response.status, 200);
  const trace = await response.json();
  assert.equal(trace.truncated, false);
  const socket = new WebSocket(base.replace('http:', 'ws:') + '/state', { origin: base });
  try {
    const [data] = await once(socket, 'message');
    const { mode, live, leaderboard, pausedAt, ...snapshot } = JSON.parse(String(data));
    assert.equal(mode, 'mock');
    assert.equal(live, 'unconfigured');
    assert.ok(Array.isArray(leaderboard));
    assert.equal(typeof pausedAt, snapshot.paused ? 'number' : 'undefined');
    assert.deepEqual(playReplay(trace), snapshot);
  } finally {
    socket.terminate();
  }
  return trace;
}

async function waitForText(page, selector, text) {
  await page.locator(selector).filter({ hasText:text }).waitFor();
}
try {
  await start();
  const send = (path,body,origin = base) => fetch(base+path,{ method:'POST', headers: { Origin:origin, 'Content-Type':'application/json' }, body:JSON.stringify(body) });
  assert.equal((await send('/admin','pause','http://example.test')).status,403);
  assert.equal((await send('/event',{ kind:'chat' })).status,400);
  assert.equal((await send('/event',{ id:'spoof', user:'live:123', name:'Fake', username:'fake', kind:'chat', command:'!join' })).status,400);
  browser = await chromium.launch({ channel:process.env.QA_BROWSER ?? 'chrome', args:['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport:{width:1280,height:900} });
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  await page.addInitScript(() => {
    window.qaOscillators = 0;
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      window.qaOscillators++;
      return create.call(this);
    };
  });
  await page.goto(base);
  await waitForText(page,'#mode','OFFLINE');
  await page.getByRole('button',{ name:'Tham gia' }).click();
  await waitForText(page,'#party','Astra');
  await sleep(230);
  await page.locator('#class').selectOption('thunder');
  await waitForText(page,'#party','Lôi Pháp Sư');
  await page.locator('#audio-toggle').click();
  await page.getByRole('button',{ name:'Tắt âm thanh' }).waitFor();
  await page.getByRole('button',{ name:'Bắt đầu Raid' }).click();
  await page.locator('#boss-intro').waitFor({state:'visible'});
  await page.waitForFunction(() => window.qaOscillators > 0);
  await waitForText(page,'#phase','GIAI ĐOẠN I');
  const overlay = await browser.newPage({ viewport:{width:540,height:960} });
  overlay.on('pageerror',error => errors.push(error.message));
  await overlay.goto(base+'/?overlay=1');
  await waitForText(overlay,'#party','Astra');
  assert.equal(await overlay.locator('#operator').isVisible(),false);
  const canvas = overlay.locator('canvas');
  await canvas.waitFor();
  assert.equal(await canvas.getAttribute('data-models'),'glb');
  const model = await overlay.request.get(base+'/models/raid.glb');
  assert.equal(model.headers()['content-type'],'model/gltf-binary');
  assert.equal((await model.body()).toString('ascii',0,4),'glTF');
  const fallback = await browser.newPage({viewport:{width:540,height:960}});
  await fallback.route('**/models/raid.glb', route => route.fulfill({status:404,body:''}));
  await fallback.goto(base+'/?overlay=1');
  await fallback.locator('canvas[data-models="procedural"]').waitFor();
  await fallback.close();
  const dimensions = await overlay.locator('#broadcast').boundingBox();
  assert.ok(Math.abs(dimensions.width/dimensions.height-9/16) < 0.005);
  const renderer = await canvas.evaluate(element => {
    const gl = element.getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable';
  });
  await page.getByRole('button',{ name:'Dừng khẩn cấp' }).click();
  await waitForText(page,'#phase','TẠM DỪNG');
  await sleep(250);
  const pausedCanvas = await canvas.screenshot();
  await sleep(400);
  assert.deepEqual(await canvas.screenshot(),pausedCanvas,'3D motion must freeze while paused');
  const pausedHp = await page.locator('#boss-value').textContent();
  await page.getByRole('button',{ name:'Tấn công',exact:true }).click();
  await waitForText(page,'#feedback','Đang dừng');
  assert.equal(await page.locator('#boss-value').textContent(),pausedHp);
  await page.getByRole('button',{ name:'Tiếp tục',exact:true }).click();
  await page.locator('#auto').check();
  const evidence = process.env.QA_EVIDENCE_DIR ?? 'test-results';
  await mkdir(evidence,{recursive:true});
  await overlay.screenshot({path:join(evidence,'portrait-raid.png')});
  await overlay.locator('#phase').filter({hasText:'CHIẾN THẮNG'}).waitFor({timeout:45000});
  await page.locator('#auto').uncheck();
  await waitForText(page,'#party','Lv.2');
  await waitForText(overlay,'#result-title','Chiến thắng');
  await waitForText(overlay,'#result-reward','120 EXP');
  await waitForText(overlay,'#result-contributors','Astra');
  await overlay.screenshot({path:join(evidence,'portrait-victory.png')});
  await sleep(250);
  await page.locator('#pet-list').selectOption('1');
  await waitForText(page,'#party','Hỏa Hồ');
  await sleep(250);
  await page.locator('#inventory').selectOption('ember');
  await page.waitForFunction(() => document.querySelector('#inventory option[value="ember"]')?.textContent.includes('Đang dùng'));
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
  await page.getByRole('button',{ name:'Dừng khẩn cấp' }).click();
  await waitForText(page,'#phase','TẠM DỪNG');
  const firstTrace = await verifyReplay();
  assert.equal(firstTrace.steps.filter(step => step.kind === 'event' && step.event.id === 'qa-gift').length, 1);
  const copy = promisify(execFile);
  const backup = join(root,'backup.sqlite');
  const restored = join(root,'restored.sqlite');
  await copy(process.execPath,['scripts/backup.ts',join(root,'test.sqlite'),backup]);
  await assert.rejects(copy(process.execPath,['scripts/backup.ts',join(root,'test.sqlite'),backup]), /EEXIST/);
  await stop();
  await waitForText(page,'#mode','KẾT NỐI LẠI');
  await copy(process.execPath,['scripts/backup.ts',backup,restored]);
  await start(restored);
  await waitForText(page,'#mode','OFFLINE');
  await waitForText(page,'#count','00');
  await page.getByRole('button',{name:'Tham gia',exact:true}).click();
  await waitForText(page,'#party','Hỏa Hồ');
  await waitForText(page,'#party','Lv.2');
  assert.match(await page.locator('#ranking').textContent(),/Astra · [1-9]\d* điểm/);
  await waitForText(page,'#stage','PHỤ BẢN 02');
  await page.locator('#profile-achievements summary').click();
  await waitForText(page,'#achievements','Hạ Boss đầu tiên');
  assert.equal(await page.locator('#achievement-count').textContent(),'1/6');
  await waitForText(page,'#profile-stats','ATK 46');
  await waitForText(page,'#profile-stats','DEF 3');
  await waitForText(overlay,'#party','Hỏa Hồ Lv.1');
  await overlay.screenshot({path:join(evidence,'portrait-pet.png')});
  await page.waitForFunction(() => document.querySelector('#inventory option[value="ember"]')?.textContent.includes('Đang dùng'));
  assert.equal((await send('/event',{...gift,complete:true})).status,202);
  await sleep(250);
  assert.equal(await page.locator('#logs li').filter({hasText:'Linh thú hỗ trợ'}).count(),0);
  await page.getByRole('button',{ name:'Raid luyện tập',exact:true }).click();
  await waitForText(page,'#phase','GIAI ĐOẠN I · LUYỆN TẬP');
  assert.equal(await overlay.locator('#raid-result').isVisible(),false);
  await waitForText(page,'#skill-status','Sẵn sàng');
  await page.getByRole('button',{ name:'10 xu',exact:true }).click();
  await waitForText(page,'#boss-value','480 / 520');
  await waitForText(page,'#phase','CÓ HỖ TRỢ');
  await waitForText(page,'#logs','Astra · Phép đặc biệt · -40');
  assert.equal(await page.locator('#effect').getAttribute('data-kind'),'gift');
  await page.getByRole('button',{ name:'Dừng khẩn cấp' }).click();
  await waitForText(page,'#phase','TẠM DỪNG');
  await verifyReplay();
  await stop();
  const encounterPath = join(root,'encounter.sqlite');
  const encounter = openStore(encounterPath);
  encounter.commit([],undefined,Date.now(),3);
  encounter.close();
  await start(encounterPath);
  const classIds = ['fire','ice','thunder','knight','healer','summon'];
  for (const id of classIds) {
    assert.equal((await send('/event',{id:'class-join:'+id,user:'qa:'+id,name:id,kind:'chat',command:'!join'})).status,202);
  }
  await waitForText(overlay,'#count','06');
  await sleep(250);
  for (const id of classIds) {
    assert.equal((await send('/event',{id:'class-select:'+id,user:'qa:'+id,name:id,kind:'chat',command:'!class '+id})).status,202);
  }
  await waitForText(overlay,'#party','Triệu Hồi Sư');
  assert.equal(await canvas.getAttribute('data-models'),'glb');
  await overlay.screenshot({path:join(evidence,'portrait-six-classes.png')});
  assert.equal((await send('/admin','start')).status,204);
  await waitForText(overlay,'#phase','GIAI ĐOẠN I');
  for (let wave = 0; wave < 7 && !(await overlay.locator('#wraith-hp').isVisible()); wave++) {
    for (const id of classIds) {
      assert.equal((await send('/event',{id:'hit:'+wave+':'+id,user:'qa:'+id,name:id,kind:'chat',command:'!attack'})).status,202);
    }
    await sleep(650);
  }
  await waitForText(overlay,'#wraith-hp','Ảnh Linh trái · 70/70');
  assert.equal((await send('/event',{id:'fire-splash',user:'qa:fire',name:'fire',kind:'chat',command:'!skill2'})).status,202);
  await waitForText(overlay,'#wraith-hp','Ảnh Linh trái · 49/70');
  await waitForText(overlay,'#wraith-hp','Ảnh Linh phải · 49/70');
  await overlay.screenshot({path:join(evidence,'portrait-wraiths.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: 3D portrait, boss victory, pause/resume, security, gift deduplication, online backup, restore, stage progression, reconnect, deterministic event replay.');
  console.log('WebGL renderer:',renderer);
} finally {
  await browser?.close();
  await stop();
  await rm(root,{recursive:true,force:true,maxRetries:5});
}
