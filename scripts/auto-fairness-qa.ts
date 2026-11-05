import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { applyEvent, autoBattle, beginRaid, newGame, tick } from '../packages/combat/index.ts';
import { classes, maxHp, type ClassId } from '../packages/shared/index.ts';

// Independent pure-auto career comparison: no browser, manual FIFO waves,
// pet selection or equipment changes. It is not a throughput/FPS benchmark.
function career(rulesVersion: number, reversed: boolean, mixed: boolean) {
  const state = newGame();
  const classIds = Object.keys(classes) as ClassId[];
  for (let i=0;i<32;i++) {
    applyEvent(state,{id:'fairness-join-'+i,user:'mock:fairness'+i,name:'Synthetic '+i,
      kind:'chat',command:'!join'},0,rulesVersion);
    const player = state.players.at(-1)!;
    Object.assign(player,{level:30,auto:true,classId:mixed ? classIds[i%classIds.length] : 'fire'});
    player.hp = maxHp(player);
  }
  if (reversed) state.players.reverse();
  const initialOrder = state.players.map(player=>player.id);
  let now = 1000;
  for (let raid=0;raid<322;raid++) {
    assert.ok(beginRaid(state,now));
    const deadline=now+120000;
    now+=800;
    while (state.raid.result===null && now<=deadline) {
      tick(state,now,rulesVersion);
      autoBattle(state,now,rulesVersion);
      now+=50;
    }
    assert.equal(state.raid.result,'victory','Fixture must finish each raid');
    now+=200;
  }
  assert.deepEqual(state.players.map(player=>player.id),initialOrder,'Scheduler must not reorder roster');
  const range=(values:number[])=>({min:Math.min(...values),max:Math.max(...values)});
  return {rulesVersion,reversed,classes:mixed?'six-class':'identical-fire',raids:322,stage:state.raid.stage,
    wins:range(state.players.map(player=>player.wins)),levels:range(state.players.map(player=>player.level)),
    scores:range(state.players.map(player=>player.score)),
    profiles:state.players.map(player=>({id:player.id,classId:player.classId,wins:player.wins,level:player.level,score:player.score}))};
}

console.log(JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceDirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim() !== '',
  scope:'322 synthetic sequential ranked raids; fixed roster; initial level30; pure basic auto; no gear/pet selection; no timing-performance claim',
  cohorts:[10,11].flatMap(version=>[false,true].flatMap(reversed=>[false,true].map(mixed=>career(version,reversed,mixed))))},null,2));
