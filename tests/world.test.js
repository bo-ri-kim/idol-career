import {chooseWithReview as choose} from './helpers/contract.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,validState,save,readSave,KEY} from '../js/state.js';
import {begin,nextDecision,advanceDay,finish,scheduledAllowed,schedule,transition} from '../js/engine.js';
import {news,newsAllowed,decisionAllowed} from '../js/events.js';
import {getAgency,getProject,getGroup,getContract,getRivals,relationship,followupModel,resolveFollowup,validWorld,personAge,sharesWork,relationshipMoment,resolveRelationshipWork} from '../js/world.js';
import {createClock} from '../js/clock.js';
import {config} from '../js/config.js';
const life=seed=>begin(createState('세계 검증','랜덤',seed));
function select(s,id){assert(choose(s,id));}
function trainee(seed=8){const s=life(seed);for(let n=0;n<80;n++){nextDecision(s);if(s.pending.kind==='entry_offer')select(s,s.pending.data.route==='survival'?'decline':'apply');else if(s.pending.kind==='contract'){select(s,'accept');return s;}else select(s,s.pending.choices[0].id);}throw Error('계약에 도달하지 못함');}
function meeting(seed=8){const s=trainee(seed);nextDecision(s);assert.equal(s.pending.kind,'meet_trainee');return s;}
const days=(s,n)=>{for(let i=0;i<n;i++)assert(advanceDay(s));};
const memory=()=>({data:{},setItem(k,v){this.data[k]=v;},getItem(k){return this.data[k]??null;}});

test('단일 세계: 무소속 학생, 소속사 ID, 계약, 인물, 프로젝트의 정합성',()=>{
 const student=life(1);assert(validWorld(student));assert.equal(Object.keys(student.world.people).length,0);assert.equal(student.contract,null);
 const s=trainee();assert.equal(typeof s.agency,'string');assert.equal(typeof s.project,'string');assert(getAgency(s).traineeIds.includes('player'));assert.equal(getContract(s).agencyId,s.agency);assert.equal(getContract(s).status,'active');assert.equal(getRivals(s).length,3);assert.equal(getProject(s).agencyId,s.agency);assert(getAgency(s).projectIds.includes(s.project));
 for(const person of getRivals(s)){assert.equal(person.agencyId,s.agency);assert(getAgency(s).traineeIds.includes(person.id));assert(person.personality);assert(person.stats.보컬>=0);assert.equal(personAge(s,person),person.initialAge);assert(s.relationships[person.id]);}assert(validState(s));
});
test('연습생 합류 → 첫 선택 → 25일 후 같은 ID의 인물이 재등장',()=>{
 const s=meeting(),personId=s.pending.data.personId,person=s.world.people[personId];assert.equal(getRivals(s).length,4);assert(getProject(s).participantIds.includes(personId));assert(validState(s));
 select(s,'befriend');assert(s.relationships[personId].closeness>=35);assert(s.relationships[personId].trust>=32);assert(s.queue.some(q=>q.type==='relationship-followup'&&q.data.personId===personId));
 const firstHistory=person.history.length;days(s,25);const follow=s.history.find(h=>h.outcome&&h.personIds?.includes(personId));assert(follow);assert(follow.title.includes(person.name));assert(person.history.length>firstHistory);assert(person.history.includes(follow.id));assert(s.relationships[personId].history.includes(follow.id));assert(validState(s));
});
test('친해지기·견제·거리 두기가 독립적인 관계 상태와 갈등 이력에 반영',()=>{
 const base=meeting(),id=base.pending.data.personId,variants={};for(const choice of ['befriend','compete','distance']){const s=structuredClone(base);select(s,choice);variants[choice]=s.relationships[id];assert.equal(s.world.people[id].id,id);assert(validState(s));}
 assert(variants.befriend.closeness>variants.distance.closeness);assert(variants.befriend.trust>variants.compete.trust);assert(variants.compete.rivalry>variants.befriend.rivalry);assert.equal(variants.compete.conflicts.length,1);assert(variants.compete.conflicts[0].eventId);assert.equal(variants.distance.approach,'distance');
});
test('같은 인물·같은 추첨값에서도 이전 선택에 따라 후속 확률과 내용 변화',()=>{
 const base=meeting(),id=base.pending.data.personId;base.world.people[id].personality='신중함';const a=structuredClone(base),b=structuredClone(base);select(a,'befriend');select(b,'compete');
 const pa=followupModel(a,id),pb=followupModel(b,id);assert(pa.cooperation>pb.cooperation);assert(pb.competition>pa.competition);
 const ra=resolveFollowup(a,id,.25),rb=resolveFollowup(b,id,.25);assert.equal(ra.outcome,'cooperation');assert.equal(rb.outcome,'rivalry');assert.notEqual(ra.text,rb.text);assert.equal(ra.personId,rb.personId);
});
test('친밀도가 높아도 경쟁·신뢰·성격에 따라 갈등이나 부담이 가능',()=>{
 const s=meeting(),id=s.pending.data.personId;select(s,'befriend');const r=relationship(s,id);r.closeness=95;r.trust=25;r.rivalry=90;s.world.people[id].personality='야심';const outcome=resolveFollowup(s,id,.8);assert.equal(outcome.outcome,'rivalry');assert(r.conflicts.length>0);
 const other=meeting(),pid=other.pending.data.personId;select(other,'befriend');other.world.people[pid].personality='신중함';assert.equal(resolveFollowup(other,pid,.99).outcome,'pressure');
});
test('학생·무계약·무그룹·미데뷔·은퇴 상태의 사건 제한',()=>{
 const student=life(4);assert(!decisionAllowed(student,'meet_trainee'));assert(!scheduledAllowed(student,'trainee-arrival'));assert(!scheduledAllowed(student,'relationship-followup'));schedule(student,'trainee-arrival',1,{agencyId:'orbit'},'world');days(student,2);assert.equal(Object.keys(student.world.people).length,0);
 const s=meeting();select(s,'distance');const id=s.rivals.at(-1),before=s.world.people[id].history.length;transition(s,'actor');days(s,25);assert.equal(s.world.people[id].history.length,before); // ineligible follow-up is not performed
 const noGroup=life(2);noGroup.stage='idol';noGroup.debuted=true;noGroup.agency='orbit';assert(!scheduledAllowed(noGroup,'release'));assert(!newsAllowed(noGroup,news.find(n=>n.id==='broadcast')));
 finish(s);for(const n of news)assert(!newsAllowed(s,n));for(const kind of ['comeback','career','meet_trainee','acting','production'])assert(!decisionAllowed(s,kind));assert(!advanceDay(s));assert.equal(s.queue.length,0);
});
test('저장·새로고침 복원: 첫 만남 대기와 선택 후 인물·관계·예약·미래 유지',()=>{
 const a=meeting(),id=a.pending.data.personId,store=memory();save(a,store);const pending=readSave(store).state;assert(pending);assert.deepEqual(pending.pending,a.pending);assert.equal(pending.world.people[id].name,a.world.people[id].name);
 select(a,'compete');save(a,store);const b=readSave(store).state;assert(b);assert.deepEqual(b.relationships,a.relationships);assert.deepEqual(b.queue,a.queue);days(a,25);days(b,25);assert.deepEqual(a,b);assert(a.history.some(h=>h.outcome&&h.personIds.includes(id)));
 store.data[KEY]='{broken';assert.equal(readSave(store).state,null);store.data={'idol-career-v03':'{}'};assert.match(readSave(store).message,/세계·인물관계/);
});
test('참조가 끊긴 저장 데이터는 안전하게 거절',()=>{
 const base=meeting(),id=base.pending.data.personId;for(const mutate of [s=>delete s.world.people[id],s=>delete s.world.agencies[s.agency],s=>s.world.projects[s.project].agencyId='missing',s=>s.relationships[id].trust=200,s=>delete s.relationships[id],s=>s.world.contracts[s.contract].agencyId='missing']){const s=structuredClone(base);mutate(s);assert(!validState(s));}
});
test('세계·관계 사건도 배속별 동일 게임 시간에서 동일 결과',()=>{
 const base=trainee(),all=[];for(const speed of config.speeds){const s=structuredClone(base);s.speed=speed;const clock=createClock(s);clock.tick(0);let now=0;while(!s.pending){now+=config.dayMs/speed;clock.tick(now);}assert.equal(s.pending.kind,'meet_trainee');select(s,'befriend');clock.reset(now);for(let i=0;i<25;i++){now+=config.dayMs/speed;clock.tick(now);}s.speed=1;s.remainder=0;all.push(s);}for(const s of all.slice(1))assert.deepEqual(s,all[0]);
});
test('그룹·전향·은퇴 이후에도 과거 인물과 프로젝트·계약 이력은 보존',()=>{
 let s;for(let seed=1;seed<10;seed++){const candidate=trainee(seed);for(let turn=0;turn<50&&candidate.stage!=='idol';turn++){nextDecision(candidate);if(candidate.stage==='ended')break;const p=candidate.pending;const choice=({meet_trainee:'befriend',final:'challenge',retry:'retry',health:'rest',late:'actor',acting:'support',future:'retire'})[p.kind]||p.choices[0].id;select(candidate,choice);}if(candidate.stage==='idol'){s=candidate;break;}}
 assert(s);const group=getGroup(s),agency=getAgency(s),people=Object.keys(s.world.people),groupId=group.id,contractId=s.contract;assert(group.memberIds.includes('player'));assert(agency.groupIds.includes(groupId));assert(group.memberIds.length>=2);assert(group.positions.player);assert.equal(group.status,'active');assert(validState(s));
 transition(s,'solo');assert.equal(s.group,null);assert(s.world.groups[groupId].formerMemberIds.includes('player'));assert(!s.world.groups[groupId].memberIds.includes('player'));assert.deepEqual(Object.keys(s.world.people),people);assert(validState(s));
 finish(s);assert.equal(s.world.contracts[contractId].status,'closed');assert(s.world.groups[groupId]);assert(Object.keys(s.world.projects).length);assert(validState(s));
});

function ongoing(){const s=meeting(),id=s.pending.data.personId;select(s,'befriend');nextDecision(s);assert.equal(s.pending.kind,'relationship_moment');assert.equal(s.pending.data.personId,id);return {s,id};}
test('동료의 첫 결정 → 지연 평가 → 다음에는 다른 동료가 등장',()=>{
 const {s,id}=ongoing(),before=s.stats.체력;assert(s.pending.title.includes(s.world.people[id].name));assert(validState(s));select(s,'cooperate');assert.equal(s.stats.체력,before-3);assert(s.queue.some(q=>q.type==='relationship-result'));const day=s.day;days(s,14);const result=s.history.find(h=>h.relationshipResult);assert(result);assert.equal(result.day,day+14);assert(result.personIds.includes(id));assert.notEqual(getProject(s).relationshipScore,0);assert(result.changes);assert(validState(s));nextDecision(s);assert.equal(s.pending.kind,'relationship_moment');assert.notEqual(s.pending.data.personId,id);assert(s.rivals.includes(s.pending.data.personId));
});
test('신뢰·경쟁이 다른 합동 준비는 같은 추첨에서도 성패와 프로젝트 점수를 바꾼다',()=>{
 const {s,id}=ongoing(),a=structuredClone(s),b=structuredClone(s);a.relationships[id].trust=90;a.relationships[id].rivalry=0;b.relationships[id].trust=0;b.relationships[id].rivalry=90;
 const first=resolveRelationshipWork(a,id,'cooperate',.5),second=resolveRelationshipWork(b,id,'cooperate',.5);assert(first.ok);assert(!second.ok);assert(getProject(a).relationshipScore>getProject(b).relationshipScore);
});
test('협력·독점·경계 선택의 비용과 관계 변화, 갈등에 맞는 후속 내용',()=>{
 const {s,id}=ongoing();const a=structuredClone(s),b=structuredClone(s),c=structuredClone(s);select(a,'cooperate');select(b,'compete');select(c,'boundary');assert(a.stats.체력<c.stats.체력);assert(b.relationships[id].rivalry>a.relationships[id].rivalry);assert(b.relationships[id].conflicts.length);assert(c.relationships[id].rivalry<s.relationships[id].rivalry);assert(!c.queue.some(q=>q.type==='relationship-result'));assert.notEqual(relationshipMoment(b,id).topic,'conflict'); // 경쟁 선택만으로 같은 파트 갈등이 확정되지는 않음
});
test('진행 중 평가도 저장 복원되고 v0.2.4 관계도 첫 만남 반복 없이 연결된다',()=>{
 const {s,id}=ongoing();select(s,'compete');const store=memory();save(s,store);const restored=readSave(store).state;assert(restored);days(s,14);days(restored,14);assert.deepEqual(s,restored);
 const old=meeting(),pid=old.pending.data.personId;select(old,'distance');old.queue=old.queue.filter(q=>q.type!=='relationship-followup');delete old.relationships[pid].nextMomentDay;save(old,store);const compatible=readSave(store).state;assert(compatible);nextDecision(compatible);assert.equal(compatible.pending.kind,'relationship_moment');assert.equal(compatible.pending.data.personId,pid);
});
test('공유 프로젝트·그룹이 없으면 반복 관계 사건과 준비 결과는 발생하지 않는다',()=>{
 const student=life(1);assert(!scheduledAllowed(student,'relationship-moment'));assert(!decisionAllowed(student,'relationship_moment'));
 const {s,id}=ongoing();select(s,'cooperate');const count=s.history.length;transition(s,'actor');assert(!sharesWork(s,id));days(s,14);assert(!s.history.slice(count).some(h=>h.relationshipResult));assert(validState(s));finish(s);assert(!scheduledAllowed(s,'relationship-result'));
});

test('같은 그룹으로 데뷔한 인물은 활동 결정과 실제 인기 변화까지 연결',()=>{
 let found;for(let seed=1;seed<=30&&!found;seed++){const s=meeting(seed),id=s.pending.data.personId;select(s,'befriend');for(let turn=0;turn<25&&s.stage!=='ended';turn++){nextDecision(s);if(s.stage==='idol'){if(sharesWork(s,id))found={s,id};break;}if(s.pending)select(s,({final:'challenge',retry:'retry',late:'actor',health:'rest',future:'retire'})[s.pending.kind]||s.pending.choices[0].id);}}
 assert(found);const {s,id}=found;for(let n=0;n<8&&s.pending?.kind!=='relationship_moment';n++){if(s.pending)select(s,s.pending.choices[0].id);nextDecision(s);}assert.equal(s.pending.kind,'relationship_moment');const groupPersonId=s.pending.data.personId;assert(getGroup(s).memberIds.includes(groupPersonId));select(s,'cooperate');const before=s.popularity;for(let day=0;day<14;day++){if(s.pending)select(s,s.pending.choices[0].id);advanceDay(s);}assert(s.history.some(h=>h.relationshipResult&&h.stage==='idol'&&h.personIds.includes(groupPersonId)));assert.notEqual(s.popularity,before);assert(validState(s));
});
