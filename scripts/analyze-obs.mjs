import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, basename } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const inside=(root,path)=>{const rel=relative(root,path);return rel!=='' && !rel.startsWith('..') && !isAbsolute(rel);};
const root=await realpath('test-results');
const input=await realpath(resolve(process.argv[2] ?? ''));
assert.ok(inside(root,input) && basename(input)==='results.json','Select an isolated OBS results.json under test-results');
const raw=JSON.parse(await readFile(input,'utf8'));
const recording=await realpath(raw.recording);
const recordingsRoot=await realpath(join(root,'obs-portable','recordings'));
assert.ok(inside(recordingsRoot,recording),'Recording must belong to the isolated QA installation');
const dir=dirname(input);
const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels:format=duration,size','-of','json',recording],{encoding:'utf8'}));
const video=probe.streams.find(stream=>stream.codec_type==='video');
const audio=probe.streams.find(stream=>stream.codec_type==='audio');
assert.ok(video?.width===1080 && video.height===1920 && video.r_frame_rate==='30/1','Unexpected encoded video');
assert.ok(audio?.codec_name==='aac' && audio.sample_rate==='48000' && audio.channels===2,'Unexpected encoded audio');
assert.ok(Number(probe.format.duration)>=raw.secondsRequested,'Recording shorter than requested workload');
const rate=48000;
const samplesPerWindow=rate*60;
const db=value=>value===0?null:Math.round(20*Math.log10(value)*100)/100;
const windows=[];
let start=0,count=0,sum=0,peak=0,nonzero=0,clipped=0;
function finishWindow() {
  windows.push({startSeconds:start/rate,seconds:count/rate,rmsDbfs:db(Math.sqrt(sum/count)/32768),
    peakDbfs:db(peak/32768),nonzeroSamples:nonzero,clippedSamples:clipped});
  start+=count;
  count=sum=peak=nonzero=clipped=0;
}
const decoder=spawn('ffmpeg',['-v','error','-i',recording,'-map','0:a:0','-vn','-ac','1','-ar',String(rate),'-f','s16le','pipe:1'],
  {stdio:['ignore','pipe','inherit']});
const decoded=once(decoder,'close');
void decoded.catch(()=>{});
let trailing;
for await (const chunk of decoder.stdout) {
  const bytes=trailing===undefined?chunk:Buffer.concat([Buffer.from([trailing]),chunk]);
  const end=bytes.length-(bytes.length%2);
  trailing=end<bytes.length?bytes[end]:undefined;
  for(let offset=0;offset<end;offset+=2) {
    const sample=bytes.readInt16LE(offset),absolute=Math.abs(sample);
    sum+=sample*sample;
    peak=Math.max(peak,absolute);
    if(sample!==0) nonzero++;
    if(absolute>=32767) clipped++;
    if(++count===samplesPerWindow) finishWindow();
  }
}
const [decodeExit]=await decoded;
assert.equal(decodeExit,0,'FFmpeg audio decoding failed');
assert.equal(trailing,undefined,'Incomplete PCM sample');
assert.ok(start+count>0,'No decoded PCM samples');
if(count) finishWindow();
const range=values=>({min:Math.min(...values),max:Math.max(...values)});
assert.ok(raw.samples.length>0 && raw.memory.length>0,'Missing in-run telemetry');
const {recording: _recording,...measurements}=raw;
void _recording;
const database=await realpath(join(dir,'synthetic.sqlite'));
assert.ok(inside(dir,database),'Expected local synthetic database');
const store=new DatabaseSync(database,{readOnly:true});
let persistence;
try {
  const check=store.prepare('PRAGMA quick_check').get().quick_check;
  assert.equal(check,'ok');
  const players=store.prepare('SELECT profile FROM players').all().map(row=>JSON.parse(row.profile));
  const stage=store.prepare('SELECT stage FROM world_progress WHERE singleton=1').get().stage;
  persistence={integrity:check,profiles:players.length,autoPreferences:players.filter(player=>player.auto).length,equippedPets:players.filter(player=>player.pet!==null).length,wins:range(players.map(player=>player.wins)),scores:range(players.map(player=>player.score)),savedStage:stage};
  assert.equal(players.length,32);assert.equal(persistence.autoPreferences,32);
  assert.ok(stage>=raw.stage,'Expected saved stage progress after shutdown');
} finally {store.close();}
const result={...measurements,recordingFile:basename(recording),encoded:probe,audioAnalysis:{decodedFormat:'mono PCM16 48000 Hz',windows},persistence,derived:{obsFps:range(raw.samples.map(sample=>sample.stats.activeFps)),obsMemoryMiB:range(raw.samples.map(sample=>sample.stats.memoryUsage)),backendRssMiB:range(raw.memory.map(sample=>sample.rss/1048576)),backendHeapMiB:range(raw.memory.map(sample=>sample.heapUsed/1048576)),backendEndMiB:{rss:raw.memory.at(-1).rss/1048576,heap:raw.memory.at(-1).heapUsed/1048576},obsRenderSkippedDelta:raw.after.renderSkippedFrames-raw.before.renderSkippedFrames,obsEncodeSkippedDelta:raw.after.outputSkippedFrames-raw.before.outputSkippedFrames},limits:'Local recording only. OBS counters do not measure unique scene presentation FPS. Backend/OBS memory excludes browser subprocess/GPU bytes. Per-minute audio energy does not rule out brief dropouts or assess mix quality. Upstream LIVE is outside this test.'};
await writeFile(join(dir,'analysis.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({duration:probe.format.duration,video,audio,derived:result.derived,audioWindows:windows.length,clippedSamples:windows.reduce((sum,window)=>sum+window.clippedSamples,0)}));
