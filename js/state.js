import {validAgencyState,migrateAgencyState} from './agency.js';
import {createStudentLife,ensureStudentLife,validStudentLife,evidenceRequired} from './student-life.js';
import {validNewsMemory} from './news-scheduler.js';
import {integer,random} from './random.js';
import {policyIds,policies} from './config.js';
import {decisions,decisionAllowed} from './events.js';
import {entryRoutes,routeDecision} from './entry.js';
import {createWorld,validWorld,getAgency,getProject} from './world.js';
export const stats=['보컬','댄스','랩','연기','스타성','멘탈','체력'];
export const stages={student:'일반 학생',auditioning:'진입 심사 중',trainee:'연습생',debut_candidate:'데뷔조 후보',idol:'아이돌 · 그룹 활동',solo:'솔로 활동',actor:'배우 활동',producer:'제작자 활동',ended:'커리어 종료'};
export const randomName=(rng=Math.random)=>['하린','시온','유진','서우','지안','도윤','수빈','이든'][integer(0,7,rng)];
export function createState(name='',gender='랜덤',seed=Math.floor(Math.random()*4294967296)){
 const s={version:4,rng:seed>>>0,day:0,remainder:0,speed:1,playing:true,stage:'student',policy:'school',
  currentOfferId:null,careerPriority:'training',residence:'family_home',studentLife:createStudentLife(),world:createWorld(),relationships:{},contract:null,agency:null,group:null,rivals:[],project:null,projectSerial:0,epoch:0,queue:[],serial:0,pending:null,
  history:[],milestones:[],seen:{},training:0,attempts:0,credits:0,popularity:0,peak:0,peakDay:0,
  idolRetired:false,debuted:false,entryRoute:null,lastEntryRoute:null,entryAttempts:0,routeHistory:[],interest:0,snsActivity:0,schoolParticipation:0,social:0,achievements:[],ending:null,releaseSerial:0,decisionCount:0,
  support:false,reviewScore:0,healthWarning:false,lastMonthStats:null};
 const rng=()=>random(s);s.name=name.trim().slice(0,16)||randomName(rng);s.gender=gender==='랜덤'?['남성','여성'][integer(0,1,rng)]:gender;
 s.startAge=integer(13,18,rng);s.age=s.startAge;s.stats=Object.fromEntries(stats.map(k=>[k,integer(k==='멘탈'||k==='체력'?60:18,k==='멘탈'||k==='체력'?85:58,rng)]));
 s.appearance=integer(15,95,rng);s.family=['빠듯한 살림','평범한 가정','여유 있는 가정'][integer(0,2,rng)];s.money=integer(0,s.family==='여유 있는 가정'?30:s.family==='평범한 가정'?10:3,rng);s.interest=integer(0,100,rng);s.snsActivity=integer(0,20,rng);s.schoolParticipation=integer(20,80,rng);s.social=integer(20,80,rng);s.lastMonthStats={...s.stats};return s;
}
export const KEY='idol-career-v04';
export function save(s,storage=globalThis.localStorage){try{storage.setItem(KEY,JSON.stringify(s));return true;}catch{return false;}}
const queuedTypes=new Set(['opportunity','audition-result','project-announce','project-candidates','project-cut','project-final','debut-result','retry','comeback','career','release','reaction','return','acting','acting-result','production','production-result','future','health-return','student-future','trainee-arrival','relationship-followup','relationship-moment','relationship-result','peer-encounter','student-activity-offer','student-activity-rehearsal','student-showcase','student-performance','student-post-exposure','offer-review','offer-return']);
export function validState(s){
 try {
  if(!s||s.version!==4||!stages[s.stage]||!Number.isInteger(s.day)||s.day<0||s.day>366*33||!Number.isInteger(s.startAge)||s.startAge<13||s.startAge>18)return false;
  if(!Number.isInteger(s.rng)||s.rng<0||s.rng>4294967295||!Number.isFinite(s.money)||!Number.isFinite(s.popularity)||!Number.isFinite(s.remainder)||s.remainder<0)return false;
  if(typeof s.name!=='string'||!['남성','여성'].includes(s.gender)||typeof s.playing!=='boolean'||![1,2,4,8].includes(s.speed)||!policyIds(s.stage).includes(s.policy)||!policies[s.policy])return false;
  if(!s.stats||!stats.every(k=>Number.isFinite(s.stats[k])&&s.stats[k]>=0&&s.stats[k]<=100)||!s.lastMonthStats||!stats.every(k=>Number.isFinite(s.lastMonthStats[k])))return false;
  if(!['age','epoch','serial','training','attempts','credits','peak','peakDay','projectSerial','releaseSerial','reviewScore','decisionCount','interest','snsActivity','schoolParticipation','social','entryAttempts'].every(k=>Number.isFinite(s[k])))return false;
  if(!Array.isArray(s.history)||!s.history.every((h,i)=>Number.isInteger(h.day)&&h.day>=0&&h.day<=s.day&&(!i||h.day>=s.history[i-1].day)&&typeof h.title==='string'&&typeof h.text==='string')||!Array.isArray(s.milestones))return false;
  if(!Array.isArray(s.queue)||!s.queue.every(q=>Number.isInteger(q.id)&&Number.isInteger(q.due)&&q.due>=0&&queuedTypes.has(q.type)&&q.data&&typeof q.data==='object'&&(q.epoch===null||Number.isInteger(q.epoch))))return false;
  if(!Array.isArray(s.rivals)||!s.rivals.every(id=>typeof id==='string')||!Array.isArray(s.achievements)||!s.seen||typeof s.seen!=='object')return false;
  if(!validStudentLife(s))return false;
  if(!validNewsMemory(s))return false;
  if(!validAgencyState(s))return false;
  if(!validWorld(s))return false;
  if(['trainee','debut_candidate'].includes(s.stage)&&(!getAgency(s)||!getProject(s)||!Number.isFinite(getProject(s).slots)||typeof getProject(s).phase!=='string'))return false;
  if(!Array.isArray(s.routeHistory)||typeof s.debuted!=='boolean')return false;
  if(['student','auditioning'].includes(s.stage)&&(s.agency||s.group||s.project||s.debuted||s.rivals.length))return false;
  if(s.stage==='auditioning'&&!entryRoutes[s.entryRoute])return false;
  if(['idol','solo'].includes(s.stage)&&(!s.agency||!s.debuted||(s.stage==='idol'&&!s.group)))return false;
  if(s.pending){if(!decisionAllowed(s,s.pending.kind))return false;const d=s.pending.kind==='entry_offer'&&entryRoutes[s.pending.data?.route]?routeDecision(s.pending.data.route):decisions[s.pending.kind];if(!d||s.playing||typeof s.pending.id!=='string'||!s.pending.data||typeof s.pending.title!=='string'||!Array.isArray(s.pending.choices)||s.pending.choices.length<2||!s.pending.choices.every(c=>d.choices.some(known=>known.id===c.id)&&typeof c.label==='string'))return false;}
  if(s.stage==='ended'&&(s.playing||s.pending||s.queue.length||typeof s.ending!=='string'))return false;
  return true;
 }catch{return false;}
}
export function readSave(storage=globalThis.localStorage){try{const raw=storage.getItem(KEY);if(raw){const s=JSON.parse(raw);let message='';
 // A pending v0.2.9 comeback prompt is obsolete; preserve history and replace it with an agency event.
 if(s.pending?.kind==='comeback'){
  s.pending=null;s.playing=true;s.remainder=0;
  s.queue.push({id:++s.serial,type:'comeback',due:s.day+1,data:{},epoch:s.epoch});
  s.queue.sort((a,b)=>a.due-b.due||a.id-b.id);
  message='이전 버전의 다음 작품 선택을 회사 주도 활동으로 전환했습니다. 기존 기록은 유지됩니다.';
 }if(validState(s)&&s.studentLife===undefined){ensureStudentLife(s);if((s.pending?.kind==='entry_offer'&&evidenceRequired(s.pending.data.route))||(s.stage==='auditioning'&&evidenceRequired(s.entryRoute))){s.pending=null;s.stage='student';s.entryRoute=null;s.epoch++;s.queue=s.queue.filter(q=>q.epoch===null);s.playing=false;message='이전 버전의 공개 활동 근거가 없는 제안은 보류했습니다. 기존 경력은 보존하며 다른 기회를 기다릴 수 있습니다.';}if(s.stage==='student'){s.queue.push({id:++s.serial,type:'student-activity-offer',due:s.day+14,data:{},epoch:null});if(!s.queue.some(q=>q.type==='opportunity'))s.queue.push({id:++s.serial,type:'opportunity',due:s.day+21,data:{},epoch:s.epoch});s.queue.sort((a,b)=>a.due-b.due||a.id-b.id);}}if(validState(s)){const notice=migrateAgencyState(s);if(notice)message=[message,notice].filter(Boolean).join(' ');}return validState(s)?{state:s,message}:{state:null,message:'저장 데이터를 읽을 수 없습니다. 새 게임을 시작해 주세요.'};}if(storage.getItem('idol-career-v03'))return {state:null,message:'세계·인물관계 저장 구조가 바뀌었습니다. 이전 이야기는 보관되며 새 게임을 시작해 주세요.'};if(storage.getItem('idol-career-v02'))return {state:null,message:'학생부터 시작하는 새 버전입니다. 이전 v0.2 저장은 보관되며 새 게임을 시작해 주세요.'};if(storage.getItem('idol-career-v01'))return {state:null,message:'v0.2는 시간이 흐르는 방식이 바뀌었습니다. v0.1 저장 대신 새 게임을 시작해 주세요.'};return {state:null,message:''};}catch(error){return {state:null,message:error?.message?.startsWith('이전 계약 제안')?error.message:'저장 공간에 접근할 수 없거나 데이터가 손상됐습니다. 새 게임은 시작할 수 있습니다.'};}}
export const load=(storage=globalThis.localStorage)=>readSave(storage).state;
export function clear(storage=globalThis.localStorage){try{storage.removeItem(KEY);storage.removeItem('idol-career-v01');storage.removeItem('idol-career-v02');storage.removeItem('idol-career-v03');return true;}catch{return false;}}
