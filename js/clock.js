import {config} from './config.js';
import {advanceDay} from './engine.js';
// Browser timestamps stay outside saved game state. Inactive time is never accumulated.
export function createClock(state,step=advanceDay){
 let last=null,visible=true;
 return {
  reset(now=null){last=now;},
  visibility(shown,now){visible=shown;last=now;},
  tick(now){
   if(last===null){last=now;return 0;}
   const elapsed=Math.max(0,now-last);last=now;
   if(!visible||!state.playing||state.pending||state.stage==='ended')return 0;
   state.remainder+=elapsed*state.speed;let days=0;
   while(state.remainder+1e-7>=config.dayMs&&days<config.frameDayBudget){
    state.remainder=Math.max(0,state.remainder-config.dayMs);step(state);days++;
    if(state.pending||!state.playing||state.stage==='ended'){state.remainder=0;break;}
   }
   return days;
  },
 };
}
