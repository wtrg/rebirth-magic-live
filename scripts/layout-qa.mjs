import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';
import { applyEvent, newGame } from '../packages/combat/index.ts';
import { classes } from '../packages/shared/index.ts';
import { openStore } from '../apps/server/store.ts';

const root = await mkdtemp(join(tmpdir(),'rebirth-layout-'));
const database = join(root,'layout.sqlite');
const base = 'http://127.0.0.1:4197';
const output = process.env.QA_LAYOUT_OUTPUT ?? 'test-results/layout';
const audit = process.env.QA_LAYOUT_AUDIT === '1';
await mkdir(output,{recursive:true});
const seed = newGame();
for (const [i,classId] of Object.keys(classes).entries()) {
  const event = {id:'seed:'+i,user:i ? 'mock:layout'+i : 'mock:astra',name:i ? 'QA '+classId : 'Astra',kind:'chat'};
  applyEvent(seed,{...event,command:'!join'},1000);
  applyEvent(seed,{...event,command:'!class '+classId},1000);
  Object.assign(seed.players[i],{level:3,owned:3,shards:3,pet:i%3});
}
const store = openStore(database);
store.commit(seed.players,undefined,1000,3);
store.close();
const server = spawn(process.execPath,['apps/server/index.ts'],{
  env:{...process.env,PORT:'4197',DB_PATH:database,REBIRTH_MODE:'mock',REBIRTH_RECORD_REPLAY:'0'},
  stdio:['ignore','pipe','pipe'],
});
const closed = once(server,'close');
let ready = false, errors = '', browser;
server.stdout.on('data',data => { if(String(data).includes('RE:BIRTH MOCK · '+base)) ready = true; });
server.stderr.on('data',data => { errors += String(data); });
async function post(path,body) {
  const response = await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
  assert.ok(response.ok,'HTTP '+response.status);
}
try {
  for(let i=0;!ready && i<100;i++) {
    assert.equal(server.exitCode,null,errors);
    await sleep(50);
  }
  assert.ok(ready,'Own QA server must be ready');
  await Promise.all(seed.players.map((player,i)=>post('/event',{id:'join:'+i,user:player.id,name:player.name,kind:'chat',command:'!join'})));
  await post('/admin','start');
  browser = await chromium.launch({channel:process.env.QA_BROWSER ?? 'chrome'});
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto(base);
  await page.locator('#phase').filter({hasText:'GIAI ĐOẠN I'}).waitFor();
  await Promise.all(seed.players.slice(0,3).map((player,i)=>post('/event',{
    id:'phase-two:'+i,user:player.id,name:player.name,kind:'chat',command:'!ult',
  })));
  await page.locator('#wraith-hp').filter({hasText:'Ảnh Linh trái'}).waitFor();
  await post('/admin','pause');
  await page.locator('#phase').filter({hasText:'TẠM DỪNG'}).waitFor();
  const normalLogs = await page.locator('#logs li').allTextContents();
  const results = [];
  for (const size of [{width:1280,height:900},{width:1366,height:768},{width:1024,height:768},
    {width:1000,height:700},{width:1280,height:640},{width:900,height:600},{width:390,height:844}]) {
    await page.setViewportSize(size);
    await page.evaluate(({size,normalLogs}) => {
      window.scrollTo(0,0);
      document.querySelector('#operator').scrollTop=0;
      const messages = size.width === 1000 ? Array(3).fill('Ｗ'.repeat(32)+' · Bão Lửa + Hỏa Vĩ · CHÍ MẠNG · LAN 1234 · 1234') : normalLogs;
      document.querySelector('#logs').replaceChildren(...messages.map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }));
    },{size,normalLogs});
    await sleep(100);
    const measured = await page.evaluate(() => {
      const rect = selector => {
        const r = document.querySelector(selector).getBoundingClientRect();
        return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};
      };
      const operator = document.querySelector('#operator');
      return {viewport:{width:innerWidth,height:innerHeight},broadcast:rect('#broadcast'),arena:rect('#viewport'),
        party:rect('.party'),footer:rect('footer'),operator:rect('#operator'),
        rootWidth:document.documentElement.scrollWidth,rootHeight:document.documentElement.scrollHeight,
        operatorClientHeight:operator.clientHeight,operatorScrollHeight:operator.scrollHeight};
    });
    assert.ok(measured.rootWidth<=size.width+1,'Horizontal overflow at '+JSON.stringify(size));
    if (!audit && size.width>=1000 && size.height>=700) {
      assert.ok(measured.broadcast.bottom<=size.height+1,'Broadcast exceeds desktop viewport');
      assert.ok(measured.footer.bottom<=size.height+1,'Logs exceed desktop viewport');
      assert.ok(measured.arena.height>=180,'Arena too short');
      assert.ok(measured.operatorScrollHeight>measured.operatorClientHeight,'Expected independent operator scroll');
      const before = await page.locator('#viewport').boundingBox();
      if(size.width === 1000) {
        await page.locator('#logs').focus();
        await page.keyboard.press('End');
        await page.waitForFunction(() => document.querySelector('#logs').scrollTop>0);
        const logScroll = await page.locator('#logs').evaluate(list => ({top:list.scrollTop,max:list.scrollHeight-list.clientHeight}));
        assert.ok(logScroll.top>0 && logScroll.max>0,'Wrapped log must remain keyboard-scrollable');
      }
      await page.locator('#username').focus();
      await page.locator('#low').focus();
      const low = await page.locator('#low').boundingBox();
      assert.ok(low.y>=0 && low.y+low.height<=size.height,'Focused setting must scroll into view: '+JSON.stringify({size,low,measured}));
      assert.deepEqual(await page.locator('#viewport').boundingBox(),before,'Operator focus moved arena');
      const pause = await page.locator('[data-admin="pause"]').boundingBox();
      assert.ok(pause.y>=0 && pause.y+pause.height<=size.height,'Emergency stop must remain visible');
      const exposed = await page.locator('[data-admin="pause"]').evaluate(button => {
        const r=button.getBoundingClientRect();
        return button.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
      });
      assert.equal(exposed,true,'Emergency stop must not be occluded');
      for (const control of await page.locator('#operator button,#operator input,#operator select,#operator a,#operator summary').all()) {
        if (!await control.isVisible() || !await control.isEnabled()) continue;
        await control.focus();
        const exposed = await control.evaluate(element => {
          const r=element.getBoundingClientRect();
          return r.y>=0 && r.bottom<=innerHeight && element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
        });
        assert.equal(exposed,true,'Focused operator control is obscured: '+await control.evaluate(element=>element.id || element.textContent));
      }
      await page.evaluate(() => { document.querySelector('#operator').scrollTop=0; });
    } else if(!audit) {
      await page.locator('[data-admin="pause"]').scrollIntoViewIfNeeded();
      const pause = await page.locator('[data-admin="pause"]').boundingBox();
      assert.ok(pause.y>=0 && pause.y+pause.height<=size.height,'Paged emergency control must be reachable');
      await page.locator('#username').focus();
      await page.locator('#low').focus();
      const low = await page.locator('#low').boundingBox();
      assert.ok(low.y>=0 && low.y+low.height<=size.height,'Paged setting must be reachable');
      await page.evaluate(() => window.scrollTo(0,0));
    }
    await page.screenshot({path:join(output,`${size.width}x${size.height}.png`)});
    results.push(measured);
  }
  await page.setViewportSize({width:540,height:960});
  await page.goto(base+'/?overlay=1');
  await page.locator('canvas').waitFor();
  assert.equal(await page.locator('#operator').isVisible(),false);
  const overlay = await page.locator('#broadcast').boundingBox();
  assert.ok(Math.abs(overlay.width/overlay.height-9/16)<0.005);
  await page.screenshot({path:join(output,'obs-540x960.png')});
  await post('/admin','resume');
  for(let round=0;round<5;round++) {
    if(await page.locator('#raid-result').isVisible()) break;
    await Promise.all(seed.players.map((player,i)=>post('/event',{
      id:'finish:'+round+':'+i,user:player.id,name:player.name,kind:'chat',command:'!attack',
    })));
    await sleep(650);
  }
  await page.locator('#raid-result').waitFor();
  await page.setViewportSize({width:1000,height:700});
  await page.goto(base);
  await page.locator('#raid-result').waitFor();
  await page.locator('#result-contributors li').evaluateAll(items => {
    items.forEach(item => { item.textContent='mock:'+'W'.repeat(75)+' · 123456 sát thương'; });
  });
  const result = await page.locator('#raid-result').boundingBox();
  const arena = await page.locator('#viewport').boundingBox();
  if(!audit) {
    assert.ok(result.y>=arena.y && result.y+result.height<=arena.y+arena.height,'Result panel exceeds arena');
    await page.locator('#result-contributors').focus();
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.querySelector('#result-contributors').scrollTop>0);
  }
  await page.screenshot({path:join(output,'result-1000x700.png')});
  assert.deepEqual(pageErrors,[]);
  await writeFile(join(output,'results.json'),JSON.stringify({
    sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    audit,fixture:'Six synthetic class/pet profiles; real stage-3 wraiths and victory. Boundary logs and result names are DOM text stress fixtures.',
    results,overlay,result,arena,
  },null,2)+'\n');
  console.log(JSON.stringify({audit,desktop:results.slice(0,3),overlay}));
} finally {
  await browser?.close();
  if(server.exitCode===null && server.signalCode===null) server.kill();
  await closed;
  await rm(root,{recursive:true,force:true,maxRetries:5});
}
