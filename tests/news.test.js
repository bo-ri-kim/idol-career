import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createState,validState,save,readSave} from '../js/state.js';
import {begin,nextDecision,choose,advanceDay,finish,transition,probability} from '../js/engine.js';
import {catalogue,eligibleNews,selectNews,ensureNewsMemory,TOPIC_COOLDOWN} from '../js/news-scheduler.js';
import {packNews,rivalArc} from '../js/event-pack.generated.js';
import {getProject,getGroup} from '../js/world.js';
import {auditNews} from '../scripts/qa-news.mjs';
const choices={entry_offer:'apply',contract:'accept',meet_trainee:'befriend',relationship_moment:'cooperate',final:'challenge',retry:'retry',health:'rest',late:'actor',future:'retire',comeback:'steady',acting:'support'};
const pick=s=>assert(choose(s,choices[s.pending.kind]||s.pending.choices[0].id));
function training(){for(let seed=1;seed<50;seed++){const s=begin(createState('소식 검증','랜덤',seed));for(let i=0;i<30;i++){nextDecision(s);if(s.pending?.kind==='contract'){pick(s);if(s.stage==='trainee')return s;}else if(s.pending)pick(s);if(s.stage==='ended')break;}}throw Error('No training context');}
function idol(){for(let seed=1;seed<20;seed++){const s=begin(createState('소식 검증','랜덤',seed));for(let i=0;i<50;i++){nextDecision(s);if(s.stage==='idol')return s;if(s.pending)pick(s);if(s.stage==='ended')break;}}throw Error('No group context');}

test('원본 300개 중 검토한 48개만 정적 모듈로 연결하며 생성물 일치',()=>{
 assert.equal(packNews.length,48);assert.equal(catalogue.length,77);assert.equal(new Set(catalogue.map(n=>n.id)).size,77);execFileSync(process.execPath,['scripts/build-event-pack.mjs','--check']);assert(!packNews.some(n=>/charts|tour|military/.test(n.id)));
});
test('100명 첫해: 학생·연습생·후보·아이돌, 중복·연속 주제·부적합 사건 0',()=>{
 const a=auditNews(100);assert.equal(a.duplicates,0);assert.equal(a.adjacentSameTopic,0);assert.equal(a.impossible,0);assert.equal(a.uniqueRatio,1);for(const p of ['student','auditioning','trainee','debut_candidate','idol'])assert(a.byStage[p]>0);assert(a.eventIds.length>=60);
});
test('한 커리어에 한 번, 동일 주제 14일 간격과 연속 노출 금지, 고갈 후 월말 진행',()=>{
 const s=createState('학생','여성',1),ids=new Set();for(let day=0;day<1600;day++){s.day=day;const n=selectNews(s);if(n){assert(!ids.has(n.id));ids.add(n.id);const prev=s.newsMemory.recent.at(-2);if(prev)assert.notEqual(prev.topic,n.topic);}}
 assert(ids.size>10);assert.equal(selectNews(s),null);s.queue=[];s.history=[];s.day=1600;s.playing=true;for(let i=0;i<31;i++)advanceDay(s);assert(s.history.some(h=>h.category==='monthly'));assert(s.day>1600);assert.equal(TOPIC_COOLDOWN,14);
});
test('일반 소식은 무관한 능력·재화를 만들거나 팝업을 띄우지 않음',()=>{
 const s=createState('학생','여성',3),before=structuredClone(s.stats),money=s.money;const n=selectNews(s);assert(n);assert.deepEqual(s.stats,before);assert.equal(s.money,money);assert.equal(s.pending,null);assert.equal(s.playing,true);
});
test('새 조건: 무계약·무프로젝트·무그룹·미데뷔·휴식·종료에서 차단',()=>{
 const student=createState('학생','여성',1);for(const n of packNews)if(!n.stages.includes('student'))assert(!eligibleNews(student,n));student.age=22;assert(packNews.filter(n=>n.guard==='school').every(n=>!eligibleNews(student,n)));
 const s=training(),n=packNews.find(n=>n.guard==='training');assert(eligibleNews(s,n));const noContract=structuredClone(s);noContract.contract=null;assert(!eligibleNews(noContract,n));const noProject=structuredClone(s);noProject.project=null;assert(!eligibleNews(noProject,n));
 const g=idol(),schedule=packNews.find(n=>n.guard==='group');assert(eligibleNews(g,schedule));for(const change of [v=>v.group=null,v=>v.debuted=false,v=>v.contract=null,v=>v.onBreakUntil=v.day+30]){const bad=structuredClone(g);change(bad);assert(!eligibleNews(bad,schedule));}finish(g);assert(catalogue.every(n=>!eligibleNews(g,n)));
});
test('새 작품 소식은 실제 현재 발매 예약이 있을 때만 가능',()=>{
 const s=idol(),n=packNews.find(n=>n.guard==='release');s.queue=[];assert(!eligibleNews(s,n));s.queue.push({id:++s.serial,type:'release',due:s.day+30,epoch:s.epoch,data:{release:1}});assert(eligibleNews(s,n));s.queue[0].epoch--;assert(!eligibleNews(s,n));
});
test('기존 저장의 seen 이력 유지, 새 기억·진단 저장 복원과 같은 미래',()=>{
 const a=training();a.seen.breath=0;delete a.newsMemory;const m=ensureNewsMemory(a);assert(Object.hasOwn(m.seen,'breath'));for(let i=0;i<40;i++){if(a.pending)pick(a);advanceDay(a);}const storage={v:null,setItem(k,v){this.v=v;},getItem(){return this.v;}};save(a,storage);const b=readSave(storage).state;assert(b);for(let i=0;i<40;i++){for(const s of [a,b]){if(s.pending)pick(s);advanceDay(s);}}assert.deepEqual(a,b);const broken=structuredClone(a);broken.newsMemory.recent='invalid';assert(!validState(broken));
});
test('검토한 라이벌 아크는 같은 인물·회사·프로젝트로 4단계 순서와 평가 반영',()=>{
 const s=training();for(let i=0;i<15;i++){nextDecision(s);if(s.pending?.kind==='final')break;if(s.pending)pick(s);}
 assert.equal(s.pending.kind,'final');const arc=s.history.filter(h=>h.arcId===rivalArc.id);assert.deepEqual(arc.map(h=>h.arcStage),[1,2,3,4]);assert.deepEqual(arc.map(h=>h.sourceEventId),rivalArc.stageIds);for(const h of arc){assert.deepEqual(h.arcContext,arc[0].arcContext);assert(h.personIds.includes(h.arcContext.personId));}assert.match(arc.at(-1).text,/확정되지/);assert(probability(s,'debut')>0);assert(validState(s));
});
test('다른 기수로 변경되면 이전 프로젝트의 아크를 새 프로젝트에 이어붙이지 않음',()=>{
 const s=training();nextDecision(s);assert.equal(s.pending.kind,'meet_trainee');pick(s);for(let i=0;i<25;i++)advanceDay(s);const first=getProject(s).id; // Replace context before the project cut.
 s.world.projects[first].status='replaced';const next={...structuredClone(getProject(s)),id:'test-project',status:'preparing'};s.world.projects[next.id]=next;s.world.agencies[s.agency].projectIds.push(next.id);s.project=next.id;
 for(let i=0;i<120;i++){if(s.pending)pick(s);advanceDay(s);}assert(s.history.filter(h=>h.arcId===rivalArc.id).every(h=>h.arcStage<=2));
});
