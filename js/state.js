import {integer,random} from './random.js';
import {policyIds,policies} from './config.js';
import {decisions} from './events.js';
export const stats=['보컬','댄스','랩','연기','스타성','멘탈','체력'];
export const stages={entry:'아이돌 준비',trainee:'연습생',debut:'데뷔 준비',group:'그룹 활동',solo:'솔로 활동',actor:'배우 활동',producer:'제작자 활동',ended:'커리어 종료'};
export const randomName=(rng=Math.random)=>['하린','시온','유진','서우','지안','도윤','수빈','이든'][integer(0,7,rng)];
export function createState(name='',gender='랜덤',seed=Math.floor(Math.random()*4294967296)){
 const s={version:2,rng:seed>>>0,day:0,remainder:0,speed:1,playing:true,stage:'entry',policy:'balanced',
  agency:null,group:null,rivals:[],project:null,projectSerial:0,epoch:0,queue:[],serial:0,pending:null,
  history:[],milestones:[],seen:{},training:0,attempts:0,credits:0,popularity:0,peak:0,peakDay:0,
  idolRetired:false,achievements:[],ending:null,releaseSerial:0,decisionCount:0,
  support:false,reviewScore:0,healthWarning:false,lastMonthStats:null};
 const rng=()=>random(s);s.name=name.trim().slice(0,16)||randomName(rng);s.gender=gender==='랜덤'?['남성','여성'][integer(0,1,rng)]:gender;
 s.startAge=integer(13,18,rng);s.age=s.startAge;s.stats=Object.fromEntries(stats.map(k=>[k,integer(k==='멘탈'||k==='체력'?60:18,k==='멘탈'||k==='체력'?85:58,rng)]));
 s.appearance=integer(15,95,rng);s.family=['빠듯한 살림','평범한 가정','여유 있는 가정'][integer(0,2,rng)];s.money=integer(0,300,rng);s.lastMonthStats={...s.stats};return s;
}
export const KEY='idol-career-v02';
export function save(s,storage=globalThis.localStorage){try{storage.setItem(KEY,JSON.stringify(s));return true;}catch{return false;}}
const queuedTypes=new Set(['opportunity','audition-result','project-announce','project-candidates','project-cut','project-final','debut-result','retry','comeback','career','release','reaction','return','acting','acting-result','production','production-result','future','health-return']);
export function validState(s){
 try {
  if(!s||s.version!==2||!stages[s.stage]||!Number.isInteger(s.day)||s.day<0||s.day>366*33||!Number.isInteger(s.startAge)||s.startAge<13||s.startAge>18)return false;
  if(!Number.isInteger(s.rng)||s.rng<0||s.rng>4294967295||!Number.isFinite(s.money)||!Number.isFinite(s.popularity)||!Number.isFinite(s.remainder)||s.remainder<0)return false;
  if(typeof s.name!=='string'||!['남성','여성'].includes(s.gender)||typeof s.playing!=='boolean'||![1,2,4,8].includes(s.speed)||!policyIds(s.stage).includes(s.policy)||!policies[s.policy])return false;
  if(!s.stats||!stats.every(k=>Number.isFinite(s.stats[k])&&s.stats[k]>=0&&s.stats[k]<=100)||!s.lastMonthStats||!stats.every(k=>Number.isFinite(s.lastMonthStats[k])))return false;
  if(!['age','epoch','serial','training','attempts','credits','peak','peakDay','projectSerial','releaseSerial','reviewScore','decisionCount'].every(k=>Number.isFinite(s[k])))return false;
  if(!Array.isArray(s.history)||!s.history.every((h,i)=>Number.isInteger(h.day)&&h.day>=0&&h.day<=s.day&&(!i||h.day>=s.history[i-1].day)&&typeof h.title==='string'&&typeof h.text==='string')||!Array.isArray(s.milestones))return false;
  if(!Array.isArray(s.queue)||!s.queue.every(q=>Number.isInteger(q.id)&&Number.isInteger(q.due)&&q.due>=0&&queuedTypes.has(q.type)&&q.data&&typeof q.data==='object'&&(q.epoch===null||Number.isInteger(q.epoch))))return false;
  if(!Array.isArray(s.rivals)||!s.rivals.every(r=>typeof r.name==='string'&&Number.isFinite(r.score))||!Array.isArray(s.achievements)||!s.seen||typeof s.seen!=='object')return false;
  if(s.agency!==null&&(!s.agency||typeof s.agency.name!=='string'||!Number.isFinite(s.agency.changes)))return false;
  if(['trainee','debut'].includes(s.stage)&&(!s.agency||!s.project||!Number.isInteger(s.project.id)||!Number.isFinite(s.project.slots)||typeof s.project.phase!=='string'))return false;
  if(s.pending){const d=decisions[s.pending.kind];if(!d||s.playing||typeof s.pending.id!=='string'||!s.pending.data||typeof s.pending.title!=='string'||!Array.isArray(s.pending.choices)||s.pending.choices.length<2||!s.pending.choices.every(c=>d.choices.some(known=>known.id===c.id)&&typeof c.label==='string'))return false;}
  if(s.stage==='ended'&&(s.playing||s.pending||s.queue.length||typeof s.ending!=='string'))return false;
  return true;
 }catch{return false;}
}
export function readSave(storage=globalThis.localStorage){try{const raw=storage.getItem(KEY);if(raw){const s=JSON.parse(raw);return validState(s)?{state:s,message:''}:{state:null,message:'저장 데이터를 읽을 수 없습니다. 새 게임을 시작해 주세요.'};}if(storage.getItem('idol-career-v01'))return {state:null,message:'v0.2는 시간이 흐르는 방식이 바뀌었습니다. v0.1 저장 대신 새 게임을 시작해 주세요.'};return {state:null,message:''};}catch{return {state:null,message:'저장 공간에 접근할 수 없거나 데이터가 손상됐습니다. 새 게임은 시작할 수 있습니다.'};}}
export const load=(storage=globalThis.localStorage)=>readSave(storage).state;
export function clear(storage=globalThis.localStorage){try{storage.removeItem(KEY);storage.removeItem('idol-career-v01');return true;}catch{return false;}}
