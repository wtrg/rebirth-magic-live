import assert from 'node:assert/strict';
import { applyEvent, beginRaid, newGame, tick } from '../packages/combat/index.ts';

function simulate(reverse:boolean, windowSize:number, rotate:boolean) {
  const state=newGame();
  const ids=Array.from({length:32},(_,i)=>'mock:p10'+i);
  const send=(user:string,command:string,at:number)=>applyEvent(state,{id:user+command+at,user,name:user,kind:'chat',command},at);
  for(const id of ids) {
    send(id,'!join',0);
    state.players.at(-1)!.level=30;
  }
  const ingress=reverse?[...ids].reverse():ids;
  let now=1000;
  for(let raid=0;raid<100;raid++) {
    assert.ok(beginRaid(state,now));
    now+=800;
    tick(state,now);
    const offset=(state.raid.stage-1)%ids.length;
    const rank=new Map([...ids.slice(offset),...ids.slice(0,offset)].map((id,index)=>[id,index]));
    for(let cursor=0;cursor<ingress.length;cursor+=windowSize) {
      const window=ingress.slice(cursor,cursor+windowSize);
      if(rotate)window.sort((a,b)=>rank.get(a)!-rank.get(b)!);
      for(const id of window)send(id,'!ult',now);
      now+=50;
    }
    assert.equal(state.raid.result,'victory');
    now+=100;
  }
  const wins=state.players.map(p=>p.wins);
  const opportunities=wins.reduce((sum,w)=>sum+w,0);
  return {reverse,windowSize,rotate,minimum:Math.min(...wins),maximum:Math.max(...wins),zero:wins.filter(w=>!w).length,opportunities};
}
console.table([false,true].flatMap(reverse=>[16,32].flatMap(size=>[false,true].map(rotate=>simulate(reverse,size,rotate)))));
