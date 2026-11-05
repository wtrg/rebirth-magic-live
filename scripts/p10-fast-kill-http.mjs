import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { openStore } from '../apps/server/store.ts';
import { playReplay } from '../apps/server/replay.ts';
import { applyEvent, newGame } from '../packages/combat/index.ts';

const count=32, raids=12, base='http://127.0.0.1:4217';
const ids=Array.from({length:count},(_,i)=>'mock:p10http'+i);
async function cohort(reverse) {
  const dir=await mkdtemp(join(tmpdir(),'rebirth-p10-'));
  const db=join(dir,'synthetic.sqlite');
  const seed=newGame();
  for (const [i,user] of ids.entries()) {
    applyEvent(seed,{id:'seed'+i,user,name:'P10 '+i,kind:'chat',command:'!join'},1000);
    seed.players.at(-1).level=30;
  }
  const seeded=openStore(db);
  seeded.commit(seed.players);
  seeded.close();
  const server=spawn(process.execPath,['apps/server/index.ts'],{env:{...process.env,PORT:'4217',DB_PATH:db,REBIRTH_MODE:'mock',REBIRTH_RECORD_REPLAY:'1'},stdio:['ignore','pipe','pipe']});
  const exited=once(server,'close');
  let state, ws, ready=false, errors='';
  server.stdout.on('data',data=>{if(String(data).includes('RE:BIRTH MOCK · '+base))ready=true;});
  server.stderr.on('data',data=>{errors+=String(data);});
  async function until(check) {
    for(let tries=0;tries<300;tries++){
      if(await check())return;
      assert.equal(server.exitCode,null,errors);
      await sleep(20);
    }
    assert.fail('QA condition timed out');
  }
  async function post(path,body) {
    const result=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(3000)});
    assert.ok(result.ok,path+' HTTP '+result.status);
  }
  const queueEmpty=async()=> (await (await fetch(base+'/health')).json()).queue===0;
  try {
    await until(()=>ready);
    ws=new WebSocket(base.replace('http','ws')+'/state',{origin:base});
    ws.on('message',packet=>{state=JSON.parse(String(packet));});
    for(const [i,user] of ids.entries()) await post('/event',{id:'join'+i,user,name:'P10 '+i,kind:'chat',command:'!join'});
    await until(()=>state?.players.length===count);
    assert.deepEqual(state.players.map(p=>p.id),ids);
    const ingress=reverse?[...ids].reverse():ids;
    for(let raid=1;raid<=raids;raid++){
      await post('/admin','start');
      await until(()=>state?.raid.stage===raid && state.raid.phase==='PHASE_1');
      for(const [i,user] of ingress.entries()) await post('/event',{id:'ult'+raid+'-'+i,user,name:'P10',kind:'chat',command:'!ult'});
      await until(async()=>state?.raid.result==='victory' && await queueEmpty());
    }
    const {raid,players,logs,paused,effect}=state;
    const trace=await (await fetch(base+'/replay')).json();
    assert.deepEqual(playReplay(trace),{raid,players,logs,paused,effect});
    await post('/admin','shutdown');
    assert.equal((await exited)[0],0,errors);
    const stored=openStore(db);
    try {
      assert.equal(stored.loadStage(),raids+1);
      const wins=ids.map(id=>stored.find(id).wins);
      assert.deepEqual(wins,players.map(p=>p.wins));
      return {reverse,raids,stage:stored.loadStage(),wins,replayVersion:trace.version};
    } finally {stored.close();}
  } finally {
    ws?.terminate();
    if(server.exitCode===null && server.signalCode===null){server.kill();await exited;}
  }
}
const first=await cohort(false), second=await cohort(true);
assert.deepEqual(first.wins,[...second.wins].reverse());
assert.ok(first.wins.includes(0) && first.wins.includes(raids));
console.log(JSON.stringify([first,second],null,2));
