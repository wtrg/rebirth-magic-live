import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';

// Only the authenticated, separately launched QA portable instance is supported.
// This script never starts a stream or controls the owner's installed OBS.
const configPath = resolve('test-results/obs-portable/config/obs-studio/plugin_config/obs-websocket/config.json');
const config = JSON.parse((await readFile(configPath,'utf8')).replace(/^\uFEFF/,''));
assert.equal(config.auth_required,true,'QA OBS must require authentication');
assert.ok(typeof config.server_password === 'string' && config.server_password.length >= 16);
const seconds = Number(process.env.QA_OBS_SECONDS ?? 600);
const pairedPreview = process.env.QA_OBS_P9_PREVIEW === '1';
const port = Number(process.env.QA_OBS_PORT ?? 4193);
assert.ok(Number.isInteger(seconds) && seconds >= 30 && seconds <= 43200);
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535);
const dir = resolve('test-results/obs-current-'+Date.now());
await mkdir(dir,{recursive:true});
const sourceCommit = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const sourceDirty = execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim() !== '';
const base = 'http://127.0.0.1:'+port;
const memory = [];
const telemetry = 'setInterval(()=>console.log("QA_MEMORY "+JSON.stringify(process.memoryUsage())),5000).unref()';
const server = spawn(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(telemetry),'apps/server/index.ts'],{
  env:{...process.env,PORT:String(port),DB_PATH:join(dir,'synthetic.sqlite'),REBIRTH_MODE:'mock',REBIRTH_RECORD_REPLAY:'0'},
  stdio:['ignore','pipe','inherit'],
});
const closed = once(server,'close');
let ready = false, lineBuffer = '';
server.stdout.setEncoding('utf8');
server.stdout.on('data',chunk=>{
  lineBuffer += chunk;
  const lines = lineBuffer.split('\n'); lineBuffer = lines.pop();
  for (const line of lines) {
    if (line.startsWith('QA_MEMORY ')) memory.push({at:Date.now(),...JSON.parse(line.slice(10))});
    if (line.trimEnd()==='RE:BIRTH MOCK · '+base) ready = true;
  }
});
async function waitFor(check,limit=15000) {
  const until=performance.now()+limit;
  while (!await check()) { assert.ok(performance.now()<until,'Timed out waiting for QA state'); await sleep(100); }
}
const obs = new WebSocket('ws://127.0.0.1:'+config.server_port);
const pending = new Map();
let helloResolve, helloReject;
const hello = new Promise((resolve,reject)=>{helloResolve=resolve;helloReject=reject;});
// Connection errors can precede backend readiness. Keep the rejection handled
// until the protected flow awaits it and performs cleanup.
void hello.catch(()=>{});
const helloTimer=setTimeout(()=>helloReject(new Error('OBS handshake timed out')),15000);
let identifyResolve;
const identified = new Promise(resolve=>{identifyResolve=resolve;});
let serial=0, socket, snapshot, updates=0, accepted=0, throttled=0, wins=0, peakQueue=0;
let recording=false, sceneName, oldScene, inputName, outputPath;
const samples=[];
obs.on('error',()=>helloReject(new Error('Isolated QA OBS connection failed')));
obs.on('message',packet=>{
  const message=JSON.parse(String(packet));
  if (message.op===0) { clearTimeout(helloTimer); helloResolve(message.d); }
  if (message.op===2) identifyResolve();
  if (message.op===7) {
    const waiter=pending.get(message.d.requestId);
    if (waiter) { clearTimeout(waiter.timer); pending.delete(message.d.requestId); waiter.resolve(message.d); }
  }
});
async function call(requestType,requestData) {
  assert.equal(obs.readyState,WebSocket.OPEN,'OBS disconnected');
  const requestId=String(++serial);
  const response=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('OBS request timed out: '+requestType));},15000);
    pending.set(requestId,{resolve,timer});
  });
  obs.send(JSON.stringify({op:6,d:{requestType,requestId,requestData}}));
  const result=await response;
  assert.ok(result.requestStatus.result,requestType+' rejected');
  return result.responseData;
}
async function post(path,body) {
  const response=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
  if (path==='/event' && response.status===429) { throttled++; return; }
  assert.ok(response.ok,path+': '+response.status);
  if (path==='/event') accepted++;
}
function command(index,command) {
  return post('/event',{id:'obs-current:'+ ++serial,user:'mock:obs'+index,name:'Synthetic Mage '+index,kind:'chat',command});
}
const wave=commandText=>Promise.all(Array.from({length:32},(_,i)=>command(i+1,typeof commandText==='function'?commandText(i):commandText)));
const hash=value=>createHash('sha256').update(value).digest('base64');
try {
  await waitFor(()=>ready);
  const greeting=await hello;
  assert.ok(greeting.authentication,'Expected isolated authenticated OBS');
  const auth=greeting.authentication;
  obs.send(JSON.stringify({op:1,d:{rpcVersion:1,eventSubscriptions:0,authentication:hash(hash(config.server_password+auth.salt)+auth.challenge)}}));
  await Promise.race([identified,sleep(15000).then(()=>{throw new Error('OBS identification timed out');})]);
  const version=await call('GetVersion');
  const video=await call('GetVideoSettings');
  assert.ok(video.baseWidth===1080 && video.baseHeight===1920 && video.outputWidth===1080 && video.outputHeight===1920 && video.fpsNumerator/video.fpsDenominator===30,'Expected 1080x1920@30');
  assert.equal((await call('GetRecordStatus')).outputActive,false,'Do not interrupt an existing recording');
  assert.equal((await call('GetStreamStatus')).outputActive,false,'QA instance must not be streaming');
  // Refuse desktop/microphone capture or any unexpected source in this QA instance.
  const inputs=(await call('GetInputList')).inputs;
  assert.ok(inputs.every(input=>input.inputKind==='browser_source' && input.inputName.startsWith('Rebirth Browser QA ')),'Unexpected QA OBS input');
  for (const input of inputs) await call('SetInputMute',{inputName:input.inputName,inputMuted:true});
  oldScene=(await call('GetCurrentProgramScene')).currentProgramSceneName;
  sceneName='Rebirth Combined QA '+Date.now();
  await call('CreateScene',{sceneName});
  inputName='Rebirth Browser QA '+Date.now();
  const overlay = new URL('/?overlay=1&audio=1',base);
  if (pairedPreview) {
    overlay.searchParams.set('fire-preview','1');
    overlay.searchParams.set('boss-preview','1');
  }
  await call('CreateInput',{sceneName,inputName,inputKind:'browser_source',inputSettings:{url:overlay.href,width:1080,height:1920,fps:30,fps_custom:true,reroute_audio:true},sceneItemEnabled:true});
  await call('SetInputAudioTracks',{inputName,inputAudioTracks:{'1':true,'2':false,'3':false,'4':false,'5':false,'6':false}});
  await call('SetInputVolume',{inputName,inputVolumeDb:0});
  await call('SetCurrentProgramScene',{sceneName});
  socket=new WebSocket(base.replace('http','ws')+'/state',{origin:base});
  socket.on('message',packet=>{snapshot=JSON.parse(String(packet));updates++;});
  socket.on('error',()=>{});
  await wave('!join');
  await waitFor(()=>snapshot?.players.length===32);
  await sleep(400);
  const classIds=['fire','ice','thunder','knight','healer','summon'];
  await wave(i=>'!class '+classIds[i%6]);
  await sleep(400);
  await wave('!auto on');
  await waitFor(()=>snapshot?.players.every(player=>player.auto));
  await sleep(2000);
  await call('StartRecord'); recording=true;
  // Wait for the muxer to write data and leave a lead-in before starting the workload clock.
  await waitFor(async()=>{
    const status=await call('GetRecordStatus');
    return status.outputActive && status.outputBytes>0 && status.outputDuration>=5000;
  },30000);
  const before=await call('GetStats');
  const measuredFrom=memory.length;
  await post('/admin','start');
  const startedAt=Date.now(), started=performance.now();
  const ingressBefore={accepted,throttled,updates};
  let round=0,lastSample=started;
  while (performance.now()-started<seconds*1000) {
    const at=performance.now();
    if (snapshot?.raid.result) {
      if (snapshot.raid.result==='victory') wins++;
      await wave(i=>'!pet '+(1+i%3));
      await sleep(350);
      await post('/admin','start');
    }
    // No manual basics: enabled server auto supplies the idle battle loop.
    await wave(round%4===0?'!ult':'!skill2');
    if (round++%24===0) await post('/event',{id:'obs-current:'+ ++serial,user:'mock:obs1',name:'Synthetic Mage 1',kind:'gift',giftId:'mock-30',complete:true});
    if (performance.now()-lastSample>=10000) {
      const stats=await call('GetStats');
      const record=await call('GetRecordStatus');
      assert.ok(record.outputActive,'Recording stopped unexpectedly');
      const health=await (await fetch(base+'/health',{signal:AbortSignal.timeout(5000)})).json();
      peakQueue=Math.max(peakQueue,health.queue);
      samples.push({at:Date.now(),stats,record,stage:snapshot.raid.stage});
      lastSample=performance.now();
      console.log('OBS QA',Math.round((lastSample-started)/1000),'s; stage',snapshot.raid.stage);
    }
    await sleep(Math.max(0,800-(performance.now()-at)));
  }
  const measuredSeconds=(performance.now()-started)/1000;
  const endedAt=Date.now(), endState=structuredClone(snapshot);
  const measuredIngress={accepted:accepted-ingressBefore.accepted,throttled:throttled-ingressBefore.throttled,updates:updates-ingressBefore.updates};
  const after=await call('GetStats');
  outputPath=(await call('StopRecord')).outputPath; recording=false;
  const shot=await call('GetSourceScreenshot',{sourceName:sceneName,imageFormat:'png'});
  await writeFile(join(dir,'frame.png'),Buffer.from(shot.imageData.split(',')[1],'base64'));
  assert.equal(socket.readyState,WebSocket.OPEN);
  assert.ok(wins>0 && snapshot.raid.stage>1 && updates>100);
  assert.ok(snapshot.players.every(player=>player.auto));
  const summary={sourceCommit,sourceDirty,pairedPreview,secondsRequested:seconds,measuredSeconds,startedAt,endedAt,obs:version.obsVersion,video,recording:outputPath,driver:'32 server-auto players; manual skill2/ult; host raid restart; ranked cosmetic mock-30 gifts',manualBasicCommands:0,players:32,classes:[...new Set(endState.players.map(player=>player.classId))],petCount:endState.players.filter(player=>player.pet!==null).length,petTypes:[...new Set(endState.players.map(player=>player.pet))],measuredIngress,lifetimeIngress:{accepted,throttled,updates},victoriesRestarted:wins,terminalResultAtEnd:endState.raid.result,stage:endState.raid.stage,sampledPeakQueue:peakQueue,before,after,samples,memory:memory.slice(measuredFrom).filter(sample=>sample.at>=startedAt && sample.at<=endedAt)};
  await writeFile(join(dir,'results.json'),JSON.stringify(summary,null,2)+'\n');
  console.log('Results:',join(dir,'results.json'));
} finally {
  clearTimeout(helloTimer);
  if (recording && obs.readyState===WebSocket.OPEN) await call('StopRecord').catch(()=>{});
  if (oldScene && obs.readyState===WebSocket.OPEN) await call('SetCurrentProgramScene',{sceneName:oldScene}).catch(()=>{});
  if (inputName && obs.readyState===WebSocket.OPEN) await call('RemoveInput',{inputName}).catch(()=>{});
  if (sceneName && obs.readyState===WebSocket.OPEN) await call('RemoveScene',{sceneName}).catch(()=>{});
  obs.terminate(); socket?.terminate();
  if (server.exitCode===null && server.signalCode===null) {
    await post('/admin','shutdown').catch(()=>{});
    await Promise.race([closed,sleep(5000)]);
    if (server.exitCode===null && server.signalCode===null) server.kill();
  }
  await closed;
}
