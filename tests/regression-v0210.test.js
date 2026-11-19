import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,validState,save,readSave} from '../js/state.js';
import {begin,choose,advanceDay,nextDecision} from '../js/engine.js';
import {decisions} from '../js/events.js';

function decide(s){
 const p=s.pending;if(!p)return;
 const preferences={student_activity:'decline',student_showcase:'skip',entry_offer:'apply',contract:'accept',meet_trainee:'befriend',relationship_moment:'boundary',final:'challenge',retry:'retry',health:'rest',career:'renew'};
 let id=p.kind==='contract'&&p.choices.some(c=>c.id==='consult'&&!c.disabled)?'consult':preferences[p.kind];
 if(!p.choices.some(c=>c.id===id&&!c.disabled))id=p.choices.find(c=>!c.disabled)?.id;
 assert(id,`No eligible choice for ${p.kind}`);assert(choose(s,id),`Choice rejected for ${p.kind}`);
}
function trainee(seed=3){
 const s=begin(createState('회귀 검증','여성',seed));
 for(let n=0;n<100&&['student','auditioning'].includes(s.stage);n++){nextDecision(s);if(s.pending)decide(s);}
 assert.equal(s.stage,'trainee');return s;
}
function debuted(seed=1){
 const s=trainee(seed);
 for(let n=0;n<85&&!['idol','ended'].includes(s.stage);n++){nextDecision(s);if(s.pending)decide(s);}
 assert.equal(s.stage,'idol');return s;
}
const store=()=>({items:{},setItem(k,v){this.items[k]=v;},getItem(k){return this.items[k]??null;}});

test('v0.2.10: original trainees, not just the late arrival, receive diverse events',()=>{
 const s=trainee(),original=[...s.rivals];
 for(let day=0;day<205;day++){if(s.pending)decide(s);else advanceDay(s);}
 const rows=s.history.filter(h=>h.peerTopic&&h.personIds?.some(id=>original.includes(id)));
 assert(rows.length>=3);
 assert(new Set(rows.flatMap(h=>h.personIds)).size>=2,'Two or more original trainees must appear');
 assert(new Set(rows.map(h=>h.peerTopic)).size>=2,'Different life situations must occur');
 assert(validState(s));
});
test('v0.2.10: v0.2.9 saved training state without peer queue is repaired',()=>{
 const s=trainee(4);s.queue=s.queue.filter(q=>q.type!=='peer-encounter');
 assert(!s.queue.some(q=>q.type==='peer-encounter'));
 for(let day=0;day<32;day++){if(s.pending)decide(s);else advanceDay(s);}
 assert(s.history.some(h=>h.peerTopic),'New peer event should appear in resumed saves');
 assert(validState(s));
});
test('v0.2.10: comeback is agency-led, without a repeated work-direction prompt',()=>{
 const s=debuted();
 for(let day=0;day<420;day++){
  assert.notEqual(s.pending?.kind,'comeback');
  if(s.pending)decide(s);else advanceDay(s);
 }
 assert(s.history.some(h=>h.title==='소속사의 새 활동 계획'));
 const releases=s.history.filter(h=>h.title==='새 작품 발매');
 assert(releases.length>=1);assert(releases.every(h=>['정규앨범','미니앨범','싱글 앨범','디지털 싱글'].includes(h.releaseType)));
 assert(!s.history.some(h=>h.title==='다음 작품의 방향'));
 assert(validState(s));
});
test('v0.2.10: existing pending comeback choices convert to company activity without wiping history',()=>{
 const s=debuted(1),oldHistory=s.history.length;
 s.pending={...decisions.comeback,id:'legacy-comeback',kind:'comeback',data:{},day:s.day};s.playing=false;
 const storage=store();save(s,storage);
 const restored=readSave(storage);
 assert(restored.state,restored.message);
 assert.equal(restored.state.pending,null);
 assert(restored.state.queue.some(q=>q.type==='comeback'&&q.due===s.day+1));
 assert.equal(restored.state.history.length,oldHistory);
 advanceDay(restored.state);
 assert(restored.state.history.some(h=>h.title==='소속사의 새 활동 계획'));
 assert(validState(restored.state));
});
