import {clamp,integer,chance} from './random.js';
import {stats,stages} from './state.js';
import {events,fallback} from './events.js';
export function probability(s,r){return clamp(r.base+s.stats[r.stat]*r.weight+(r.second?s.stats[r.second]*.003:0)+(r.training||0)*s.training+(s.credits*.003),.05,.95);}
export function finish(s,reason){s.stage='ended';s.ending=reason;s.current=null;return s;}
export function selectEvent(s,rng=Math.random){
 if(s.stage==='ended')return null;
 let e;
 if(s.stage==='entry')e=events[0];
 else if(s.stage==='debut')e=events[1];
 else if(s.stage==='trainee'&&s.turn%3===1)e=events.find(e=>e.id==='training');
 else if(['group','solo'].includes(s.stage)&&s.turn%5===0)e=events[2];
 else {const pool=events.filter(e=>e.stages.includes(s.stage)&&e.id!=='crossroads'&&(!e.when||e.when(s))&&(s.seen[e.id]===undefined||s.turn-s.seen[e.id]>=5));e=pool.length?pool[integer(0,pool.length-1,rng)]:fallback;}
 s.current=e.id;return e;
}
export const getEvent=s=>events.find(e=>e.id===s.current)||fallback;
export function choose(s,id,rng=Math.random){
 if(s.stage==='ended'||!s.current)throw Error('진행할 사건이 없습니다.');
 const e=getEvent(s);if(!e.stages.includes(s.stage))throw Error('현재 단계에서 발생할 수 없는 사건입니다.');const c=e.choices.find(c=>c.id===id);if(!c)throw Error('유효하지 않은 선택입니다.');
 const before={...s.stats,money:s.money,popularity:s.popularity},oldStage=s.stage;
 const ok=!c.roll||chance(probability(s,c.roll),rng);
 const effects={...c.effects,...(c.roll?(ok?c.success:c.failure):{})};
 if(e.id==='debut'&&id==='debut')s.attempts++;
 for(const [key,val] of Object.entries(effects)){if(key==='stage'){if(!stages[val])throw Error('잘못된 단계');s.stage=val;}else if(stats.includes(key))s.stats[key]=clamp(s.stats[key]+val);else if(['money','popularity','training','credits'].includes(key))s[key]+=val;}
 s.money=Math.max(-500,Math.round(s.money));s.popularity=clamp(s.popularity);
 const months=3;s.month+=months;s.age=s.startAge+Math.floor(s.month/12);s.turn++;
 s.seen[e.id]=s.turn;
 // Unselected opportunities expire as time passes; ordinary work and living costs continue.
 s.money+=['group','solo','actor','producer'].includes(s.stage)?Math.round(s.popularity*1.3):-(s.family==='빠듯한 살림'?15:5);
 s.money=Math.max(-500,s.money);
 if(s.stage==='trainee'){s.training++;if(s.training>=3&&s.training%3===0)s.stage='debut';}
 if(['group','solo'].includes(oldStage)&&['actor','producer','ended'].includes(s.stage))s.idolRetired=true;
 if(s.popularity>=80&&['group','solo'].includes(s.stage)&&!s.achievements.includes('글로벌 스타'))s.achievements.push('글로벌 스타');
 if(oldStage==='debut'&&s.stage==='group')s.achievements.push('첫 데뷔');
 if(s.credits>=8&&!s.achievements.includes('창작의 발자취'))s.achievements.push('창작의 발자취');
 s.peak=Math.max(s.peak,s.popularity);
 let text=c.roll?(ok?c.successText:c.failureText):'선택한 방향으로 한 걸음을 내디뎠다.';
 if(s.stage==='entry'&&(s.age>=23||s.turn>=24)){s.stage='actor';text+=' 오랜 도전 끝에 작은 연기 수업에서 새 출발을 택했다.';}
 if(['trainee','debut'].includes(s.stage)&&(s.age>=27||s.attempts>=5)){s.stage='actor';text+=' 데뷔 도전을 정리하고 배우의 길에서 다시 시작한다.';}
 if(s.stage==='ended')finish(s,'스스로 선택한 새로운 일상');
 else if(s.age>=45||s.turn>=128)finish(s,'오랜 활동을 마무리하고 삶의 다음 장으로');
 else if(s.stats.체력<=0||s.stats.멘탈<=0)finish(s,'건강을 지키기 위해 내린 은퇴 결정');
 if(s.stage==='ended'&&['group','solo'].includes(oldStage))s.idolRetired=true;
 const changes=Object.keys(before).map(k=>({key:k,delta:(stats.includes(k)?s.stats[k]:s[k])-before[k]})).filter(x=>x.delta);
 const record={turn:s.turn,age:s.age,month:s.month,title:e.title,choice:c.label,text,success:ok,stage:s.stage,changes};
 s.history.push(record);s.current=null;return record;
}
export function retire(s){if(s.stage==='ended')return;const old=s.stage;if(['group','solo'].includes(old))s.idolRetired=true;finish(s,'스스로 선택한 새로운 일상');s.history.push({turn:s.turn,age:s.age,month:s.month,title:'나의 마지막 인사',choice:'연예계 은퇴',text:'지금까지의 시간을 간직하고 새로운 일상을 선택했다.',stage:'ended',changes:[]});}
