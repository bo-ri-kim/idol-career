import {news,newsAllowed} from './events.js';
import {packNews} from './event-pack.generated.js';
import {getAgency,getContract,getGroup,getProject,getRivals,personAge} from './world.js';
import {random} from './random.js';
const legacyTopics={breath:'practice',dance:'practice',rap:'practice',tired:'health',friend:'relationship',family:'family',mentor:'evaluation',schedule:'practice',room:'equipment',clip:'response',stage:'schedule',broadcast:'schedule',fan:'response',quiet:'response',script:'acting',set:'acting',demo:'production',coaching:'production',school:'social',class:'school',exam:'school','school-friend':'social','home-meal':'family','hobby-day':'interest','school-festival':'school','music-interest':'interest','dance-hobby':'interest','sns-diary':'sns','chance-meeting':'social'};
export const catalogue=[...news.filter(n=>n.trigger!=='scheduled').map(n=>({...n,topic:legacyTopics[n.id],guard:'legacy',weight:2})),...packNews];
export const TOPIC_COOLDOWN=14;
const contacts=(s,n)=>n.guard==='member'?Object.values(s.world.people).filter(p=>getGroup(s)?.memberIds.includes(p.id)):getRivals(s);
function entityEligible(s,n){
 const agency=getAgency(s),contract=getContract(s),project=getProject(s),group=getGroup(s);
 const training=['trainee','debut_candidate'].includes(s.stage)&&agency&&contract?.status==='active'&&project?.status==='preparing'&&project.agencyId===agency.id;
 if(n.guard==='student')return s.stage==='student'&&!s.agency;
 // No invented school-enrolment field: this sample is restricted to the short school-age prologue.
 if(n.guard==='school')return s.stage==='student'&&s.age<=18&&!s.agency;
 if(n.guard==='training'||n.guard==='peer'){
  if(!training)return false;
  if(n.guard==='peer')return contacts(s,n).some(p=>p.agencyId===s.agency&&(!n.id.endsWith('_004')||p.stats.댄스>=55)&&(!n.id.endsWith('_006')||personAge(s,p)>s.age));return true;
 }
 const performing=['idol','solo'].includes(s.stage)&&s.debuted&&agency&&contract?.status==='active'&&(s.stage==='solo'||group?.memberIds.includes('player'));
 if(!performing||s.onBreakUntil>s.day)return false;
 if(n.guard==='group'||n.guard==='member')return s.stage==='idol'&&group?.status==='active'&&contacts(s,{guard:'member'}).length>0&&(n.id!=='news_group_dynamics_009'||contacts(s,n).some(p=>s.relationships[p.id]?.rivalry>=40));
 if(n.guard==='release')return !!s.queue.find(q=>q.type==='release'&&q.epoch===s.epoch&&q.due>s.day)&&(n.id!=='news_comeback_music_012'||s.stage==='idol');
 return false;
}
export function eligibleNews(s,n){
 if(s.stage==='ended'||!n.stages.includes(s.stage))return false;
 if(n.guard==='legacy'){if(s.age>18&&['class','exam','school-friend','school-festival','dance-hobby'].includes(n.id))return false;return newsAllowed(s,n);}
 return entityEligible(s,n);
}
export function ensureNewsMemory(s){
 if(s.newsMemory)return s.newsMemory;
 // Existing 'seen' is lifetime occurrence evidence; never replay those IDs on upgrade.
 const ids={...s.seen};for(const h of s.history){if(h.eventId)ids[h.eventId]=h.day;}
 return s.newsMemory={seen:ids,topics:{},recent:[],rejected:{}};
}
export function selectNews(s){
 const memory=ensureNewsMemory(s),last=memory.recent.at(-1),candidates=[];
 for(const n of catalogue){
  if(Object.hasOwn(memory.seen,n.id))continue;
  if(!eligibleNews(s,n)){if(n.stages.includes(s.stage))memory.rejected[n.id]='현재 소속·계약·프로젝트·멤버·일정 조건 미충족';continue;}
  if(n.topic===last?.topic||s.day-(memory.topics[n.topic]??-Infinity)<TOPIC_COOLDOWN)continue;
  if(memory.recent.slice(-5).some(r=>r.text===n.text))continue;
  const recent=memory.recent.filter(r=>r.topic===n.topic).length;
  candidates.push({n,weight:n.weight/(1+recent*2)});
 }
 if(!candidates.length)return null; // The truthful monthly recap already exists; do not recycle flavour.
 let roll=random(s)*candidates.reduce((v,c)=>v+c.weight,0);
 const n=candidates.find(c=>(roll-=c.weight)<0)?.n||candidates.at(-1).n;
 let person=null,text=n.text;
 if(n.guard==='peer'||n.guard==='member'){
  let pool=contacts(s,n).filter(p=>p.agencyId===s.agency);
  if(n.id==='news_trainee_people_004')pool=pool.filter(p=>p.stats.댄스>=55);
  if(n.id==='news_trainee_people_006')pool=pool.filter(p=>personAge(s,p)>s.age);
  if(n.id==='news_group_dynamics_009')pool=pool.filter(p=>s.relationships[p.id]?.rivalry>=40);
  person=pool[Math.floor(random(s)*pool.length)];
  const narratives={news_trainee_people_004:`${person.name}가 함께 동작을 점검하며 서로의 자세를 봐 주었다.`,news_trainee_people_006:`${person.name}가 먼저 익힌 동선의 요령을 알려 주었다.`,news_trainee_people_008:`${person.name}와 평가 연습 영상을 보고 피드백을 주고받았다.`,news_trainee_people_010:`${person.name}가 스피커 사용 순서를 정하자고 제안했다.`,news_group_dynamics_003:`무대 전 긴장한 ${person.name}에게 멤버들이 격려를 건넸다.`,news_group_dynamics_006:`${person.name}와 동선을 다시 맞췄다. 작은 실수를 짚으며 연습을 이어갔다.`,news_group_dynamics_009:`${person.name}와의 파트 경쟁이 연습 분위기에 남아 있다. 다음 협의에서 서로의 의견을 듣기로 했다.`,news_group_dynamics_014:`정기 회의에서 ${person.name}가 희망하는 개인 활동 방향을 이야기했다.`};text=narratives[n.id];
 }
 memory.seen[n.id]=s.day;memory.topics[n.topic]=s.day;memory.recent.push({id:n.id,topic:n.topic,text:n.text,day:s.day});memory.recent=memory.recent.slice(-8);s.seen[n.id]=s.day;delete memory.rejected[n.id];
 return {...n,text,personId:person?.id};
}
export function validNewsMemory(s){
 const m=s.newsMemory;if(m===undefined)return true;
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),day=n=>Number.isInteger(n)&&n>=0&&n<=s.day;
 return !!(obj(m)&&obj(m.seen)&&obj(m.topics)&&obj(m.rejected)&&Object.values(m.seen).every(day)&&Object.values(m.topics).every(day)&&Object.values(m.rejected).every(r=>typeof r==='string')&&Array.isArray(m.recent)&&m.recent.length<=8&&m.recent.every(r=>typeof r.id==='string'&&typeof r.topic==='string'&&typeof r.text==='string'&&day(r.day)));
}
