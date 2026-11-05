import assert from 'node:assert/strict';
import { applyEvent, autoBattle, beginRaid, newGame, tick } from '../packages/combat/index.ts';
import { classes, type ClassId } from '../packages/shared/index.ts';

function run(spread:number, mixed:boolean, autoFirst:boolean) {
  const state=newGame(), ids=Array.from({length:32},(_,i)=>'mock:p10'+i);
  const classIds=Object.keys(classes) as ClassId[];
  const send=(user:string,command:string,at:number)=>applyEvent(state,{id:user+command+at,user,name:user,kind:'chat',command},at);
  for(const [index,id] of ids.entries()) {
    send(id,'!join',0);
    Object.assign(state.players.at(-1)!,{level:30,classId:classIds[index%6],auto:mixed && index%2===0});
  }
  let now=1000, preManualKills=0;
  for(let raid=0;raid<100;raid++) {
    assert.ok(beginRaid(state,now));
    now+=800;
    tick(state,now);
    const start=(state.raid.stage-1)%ids.length;
    const rank=(index:number)=>(index-start+ids.length)%ids.length;
    for(let from=0;from<=spread;from+=100) {
      const queued=ids.map((id,index)=>({id,index,at:Math.floor(index*spread/31)}))
        .filter(row=>row.at>=from && row.at<from+100)
        .sort((a,b)=>rank(a.index)-rank(b.index));
      now+=100;
      if(mixed && autoFirst) {
        autoBattle(state,now);
        if(state.raid.result==='victory' && from===0) preManualKills++;
      }
      for(const {id} of queued) send(id,'!ult',now);
      if(mixed && !autoFirst) autoBattle(state,now);
    }
    assert.equal(state.raid.result,'victory');
    now+=100;
  }
  const wins=state.players.map(p=>p.wins);
  return {spread,mixed,autoFirst,min:Math.min(...wins),max:Math.max(...wins),zero:wins.filter(w=>w===0).length,preManualKills};
}
console.table([60,180,350].flatMap(spread=>[[false,false],[true,false],[true,true]].map(([mixed,autoFirst])=>run(spread,mixed,autoFirst))));
