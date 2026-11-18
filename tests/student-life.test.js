import {chooseWithReview as choose} from './helpers/contract.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,validState,save,readSave,KEY} from '../js/state.js';
import {begin,advanceDay,nextDecision,schedule,record,finish} from '../js/engine.js';
import {entryRoutes,eligibleRoutes} from '../js/entry.js';
import {news,newsAllowed} from '../js/events.js';
import {entryEvidence,validStudentLife} from '../js/student-life.js';
import {studentChoice,auditStudentLife} from '../scripts/qa-student-life.mjs';
import {createClock} from '../js/clock.js';
import {config} from '../js/config.js';
function chain(kind='video',visibility='public',seed=1,target=90){const s=begin(createState('원인 검증','랜덤',seed));while(s.day<target){if(s.pending)studentChoice(s,kind,visibility,false);else advanceDay(s);}return s;}
function qualified(){for(let seed=1;seed<=20;seed++){const s=chain('video','public',seed);if(entryEvidence(s,'sns'))return s;}throw Error('No qualifying real upload');}
const storage=()=>({data:{},setItem(k,v){this.data[k]=v;},getItem(k){return this.data[k]??null;}});

test('P0-1: 가족과 동거하는 학생·연습생은 외부 거주 연락 소식 불가',()=>{
 const family=news.find(n=>n.id==='family'),home=news.find(n=>n.id==='home-meal');for(let seed=1;seed<=100;seed++){const s=begin(createState('가족','랜덤',seed));assert.equal(s.residence,'family_home');for(const stage of ['student','auditioning','trainee','idol']){s.stage=stage;assert(!newsAllowed(s,family));assert(newsAllowed(s,home));}s.residence='dorm';assert(newsAllowed(s,family));assert(!newsAllowed(s,home));}
});
test('P0-2: 친숙도·열람·집에서의 연습·초안은 게시물/노출/발탁 근거가 아님',()=>{
 for(let seed=1;seed<=100;seed++){const s=chain('decline','skip',seed);s.snsActivity=100;s.day=180;for(const action of ['browse','private_practice','draft'])record(s,'비공개 행동','외부에 공개하지 않음','daily',false,{studentAction:action});assert(!entryRoutes.sns.when(s));assert(!eligibleRoutes(s).includes('sns'));assert.equal(Object.keys(s.studentLife.posts).length,0);assert(!entryRoutes.festival.when(s));assert(!entryRoutes.busking.when(s));}
});
test('P0-2: 공개 게시만 하고 노출 집계 전이면 발탁 불가, 근거 있는 노출 뒤만 후보',()=>{
 const s=chain('video','public',1,70),p=Object.values(s.studentLife.posts)[0];assert(p);assert.equal(p.views,0);assert(!entryEvidence(s,'sns'));const ready=qualified(),post=entryEvidence(ready,'sns');assert(post);assert(post.views>=200);assert(post.uploadEventId);assert(post.exposureHistory.length);const exposure=ready.history.find(h=>h.id===post.exposureHistory[0].eventId);assert(exposure.causeIds.includes(post.uploadEventId));assert(validState(ready));
});
test('P0-2: 친구 전용·비공개·가짜 조회·끊긴 원인 참조 차단',()=>{
 const friends=chain('video','friends');assert.equal(Object.values(friends.studentLife.posts)[0].visibility,'friends');assert(!entryEvidence(friends,'sns'));assert.equal(Object.values(friends.studentLife.posts)[0].exposureHistory.length,0);
 const s=qualified(),id=Object.keys(s.studentLife.posts)[0];for(const mutate of [v=>v.studentLife.posts[id].visibility='friends',v=>v.studentLife.posts[id].uploadEventId=-1,v=>v.studentLife.posts[id].exposureHistory[0].eventId=-1,v=>v.studentLife.posts[id].views=999999]){const bad=structuredClone(s);mutate(bad);assert(!validStudentLife(bad));}
});
test('P0-3: 댄스→교내 공연, 음악→거리 공연, 영상→공개 게시의 3개 실상태 체인',()=>{
 for(const [kind,route] of [['dance','festival'],['music','busking'],['video','sns']]){const s=kind==='video'?qualified():chain(kind);assert.equal(s.studentLife.activity.kind,kind);assert.equal(s.studentLife.activity.practiceEventIds.length,2);assert(entryEvidence(s,route));assert(validState(s));const rows=s.history.filter(h=>h.studentAction);assert(rows.find(h=>h.studentAction==='join'));assert(rows.some(h=>h.studentAction==='rehearsal'));for(const h of rows.filter(h=>['join','rehearsal','performance','post','exposure'].includes(h.studentAction))){assert(h.causeIds.length);for(const id of h.causeIds)assert(s.history.find(r=>r.id===id).resultIds.includes(h.id));}}
});
test('P0-3: 미가입·발표 거절·친구 전용에서는 공연 발탁과 SNS 후속이 없음',()=>{
 for(const kind of ['decline','dance','music','video']){const s=chain(kind,'skip');assert.equal(Object.keys(s.studentLife.performances).length,0);assert.equal(Object.keys(s.studentLife.posts).length,0);assert(!entryEvidence(s,'sns'));assert(!entryEvidence(s,'festival'));assert(!entryEvidence(s,'busking'));}
 for(const kind of ['dance','music']){const s=chain(kind,'friends');assert(Object.values(s.studentLife.performances).every(p=>p.visibility==='friends'&&p.observers===0));assert(!entryEvidence(s,kind==='dance'?'festival':'busking'));}
});
test('실제 공개 영상에서 제안→심사→확률 결과, 출처 ID와 조회 근거 보존',()=>{
 let success=false;for(let seed=1;seed<=100&&!success;seed++){const s=chain('video','public',seed,90);for(let turn=0;turn<12;turn++){nextDecision(s);if(s.pending?.kind==='entry_offer'&&s.pending.data.route==='sns'){const id=s.pending.data.sourceId;assert(entryEvidence(s,'sns',id));assert.match(s.pending.body,/누적 조회/);assert(s.pending.data.causeIds.length);choose(s,'apply');assert.equal(s.entrySourceId,id);while(s.stage==='auditioning'&&!s.pending)advanceDay(s);const result=s.routeHistory.at(-1);if(result.result==='passed'){assert.equal(s.pending.kind,'contract');choose(s,'accept');assert.equal(s.stage,'trainee');success=true;}break;}if(s.pending)studentChoice(s,'video','public',false);if(s.day>300)break;}}
 assert(success);
});
test('가입하지 않은 상태의 강제 예약, 진로 종료 이후의 후속은 조용히 무효화',()=>{
 const s=begin(createState('무효 예약','여성',1));s.queue=[];schedule(s,'student-activity-rehearsal',1,{activityId:'missing'},'world');schedule(s,'student-performance',2,{activityId:'missing'},'world');schedule(s,'student-post-exposure',3,{postId:'missing'},'world');for(let i=0;i<4;i++)advanceDay(s);assert.equal(s.studentLife.actions.length,0);finish(s);assert(!advanceDay(s));assert(!s.queue.length);
});
test('학생 활동·게시·노출 저장 복원 및 잘못된 저장 거부',()=>{
 const s=chain('video','public',1,70),store=storage();save(s,store);const b=readSave(store).state;assert(b);for(let i=0;i<20;i++){for(const v of [s,b]){if(v.pending)studentChoice(v,'video','public',false);advanceDay(v);}}assert.deepEqual(s,b);const bad=structuredClone(s);bad.studentLife.posts[Object.keys(bad.studentLife.posts)[0]].uploadEventId=-1;save(bad,store);assert.equal(readSave(store).state,null);
});
test('v0.2.6 저장은 게시물을 소급 생성하지 않고 근거 없는 대기 제안만 보류',()=>{
 const s=begin(createState('이전 저장','여성',1));s.day=50;s.snsActivity=100;delete s.studentLife;delete s.residence;s.pending={kind:'entry_offer',id:'legacy',day:50,data:{route:'sns'},title:entryRoutes.sns.title,choices:[{id:'apply',label:'지원'},{id:'decline',label:'거절'}]};s.playing=false;const store=storage();store.setItem(KEY,JSON.stringify(s));const migrated=readSave(store);assert(migrated.state);assert.equal(migrated.state.pending,null);assert.equal(migrated.state.residence,'family_home');assert.deepEqual(migrated.state.studentLife.posts,{});assert.match(migrated.message,/근거/);assert(validState(migrated.state));
});
test('같은 학생 선택은 ×1·×8·스킵에서 인과·게시·노출·날짜까지 동일',()=>{
 const results=[];for(const speed of [1,8]){const s=begin(createState('속도 검증','여성',4));s.speed=speed;const clock=createClock(s);let now=0;clock.tick(now);for(let guard=0;guard<2000;guard++){if(s.pending){if(s.day>=120&&s.pending.kind==='entry_offer')break;studentChoice(s,'video','public',false);clock.reset(now);}else{now+=config.dayMs/speed;clock.tick(now);}}s.speed=1;s.remainder=0;results.push(s);}
 const skipped=begin(createState('속도 검증','여성',4));for(let guard=0;guard<30;guard++){nextDecision(skipped);if(skipped.day>=120&&skipped.pending?.kind==='entry_offer')break;studentChoice(skipped,'video','public',false);}
 assert(results[0].day>=120);assert.deepEqual(results[0],results[1]);assert.deepEqual(skipped,results[0]);
});
test('100개 시드 × 4학생 정책에서 원인 없는 기회·자택 연락·미가입 후속 0',()=>{
 const report=auditStudentLife(100,false);assert(Object.values(report.violations).every(n=>n===0));for(const kind of ['dance','music','video']){const r=report.scenarios[kind];assert(r.practiced===100);assert(r.sourceOffers>0);assert(r.contracted>0);}assert.equal(report.scenarios.decline.publicPosts,0);assert(report.scenarios.video.noIndustryContact>0);
});

test('공개 활동의 연락 후보 기간은 180일, 이미 진행 중인 심사의 원본은 보존',()=>{
 const s=qualified(),p=entryEvidence(s,'sns');assert.equal(p.expiresAt,p.uploadedAt+180);s.day=p.expiresAt+1;assert(!entryEvidence(s,'sns'));assert(!eligibleRoutes(s).includes('sns'));assert(entryEvidence(s,'sns',p.id,true));
 const old=begin(createState('지난 경력','여성',5));finish(old,'이전 커리어 결산');delete old.studentLife;delete old.residence;const store=storage();save(old,store);const restored=readSave(store).state;assert(restored);assert.equal(restored.ending,'이전 커리어 결산');assert.equal(restored.stage,'ended');assert(!restored.queue.length);
});
