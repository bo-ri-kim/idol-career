import {random} from './random.js';
export const clubs={dance:{name:'댄스 동아리',skill:'댄스',outlet:'school',show:'교내 발표회'},music:{name:'음악 방과후 활동',skill:'보컬',outlet:'busking',show:'지도자와 함께하는 거리 공연'},video:{name:'영상 동아리',skill:'연기',outlet:'sns',show:'동아리 연습 영상'}};
export const createStudentLife=()=>({offeredAt:null,activity:null,posts:{},performances:{},actions:[]});
export function ensureStudentLife(s){s.residence??='family_home';return s.studentLife??(s.studentLife=createStudentLife());}
const sourceRow=(s,id,type,key,value)=>s.history.find(h=>h.id===id&&h.studentAction===type&&h[key]===value);
const rowExists=(s,id,type)=>s.history.some(h=>h.id===id&&(!type||h.studentAction===type));
export function entryEvidence(s,route,sourceId=null,allowExpired=false){
 const life=s.studentLife;if(!life)return null;
 if(route==='sns')return Object.values(life.posts).find(p=>(!sourceId||p.id===sourceId)&&p.visibility==='public'&&p.kind==='video'&&p.uploadedAt<=s.day&&(allowExpired||s.day<=(p.expiresAt??p.uploadedAt+180))&&sourceRow(s,p.uploadEventId,'post','postId',p.id)&&p.views>=200&&p.exposureHistory.some(x=>x.views>=200&&x.day<=s.day&&sourceRow(s,x.eventId,'exposure','postId',p.id)?.observedViews===x.views))||null;
 if(route==='festival'||route==='busking')return Object.values(life.performances).find(p=>(!sourceId||p.id===sourceId)&&p.kind===(route==='festival'?'school':'busking')&&p.visibility==='public'&&p.performedAt<=s.day&&(allowExpired||s.day<=(p.expiresAt??p.performedAt+180))&&p.observers>=15&&p.practiceEventIds.length>=2&&p.practiceEventIds.every(id=>rowExists(s,id,'rehearsal'))&&sourceRow(s,p.eventId,'performance','performanceId',p.id))||null;
 return null;
}
export const evidenceRequired=route=>['sns','festival','busking'].includes(route);
export const evidenceEventId=e=>e?.exposureHistory?.at(-1)?.eventId??e?.eventId??null;
export function growExposure(s,post){
 // Fictional in-game exposure, derived only after an actual public upload.
 const skill=(s.stats.댄스+s.stats.보컬+s.stats.연기)/3;
 return post.visibility==='public'?Math.floor(20+skill*2+random(s)*300):0;
}
export function studentAction(s,row,type){const life=ensureStudentLife(s);row.studentAction=type;life.actions.push({eventId:row.id,type,day:s.day});return row;}
export function closeStudentActivity(s){const a=s.studentLife?.activity;if(a&&['active','preparing'].includes(a.status))a.status='closed';s.queue=s.queue.filter(q=>!q.type.startsWith('student-activity')&&!['student-showcase','student-performance','student-post-exposure'].includes(q.type));}
export function validStudentLife(s){
 try{
  if(s.studentLife===undefined)return s.residence===undefined||['family_home','dorm','independent'].includes(s.residence);
  const life=s.studentLife;if(!['family_home','dorm','independent'].includes(s.residence)||!life||!life.posts||!life.performances||!Array.isArray(life.actions))return false;
  const date=n=>Number.isInteger(n)&&n>=0&&n<=s.day,vis=v=>['public','friends','private'].includes(v);
  if(life.offeredAt!==null&&!date(life.offeredAt))return false;
  if(life.actions.some(a=>!date(a.day)||!rowExists(s,a.eventId,a.type)))return false;
  const a=life.activity;if(a&&(!clubs[a.kind]||typeof a.id!=='string'||!rowExists(s,a.joinEventId,'join')||!['active','preparing','completed','closed'].includes(a.status)||!Array.isArray(a.practiceEventIds)||a.practiceEventIds.some(id=>!rowExists(s,id,'rehearsal'))))return false;
  for(const [id,p] of Object.entries(life.posts)){if(p.id!==id||!vis(p.visibility)||p.kind!=='video'||(p.expiresAt!==undefined&&(!Number.isInteger(p.expiresAt)||p.expiresAt<p.uploadedAt))||!date(p.uploadedAt)||!sourceRow(s,p.uploadEventId,'post','postId',p.id)||!Number.isInteger(p.views)||p.views<0||sourceRow(s,p.uploadEventId,'post','postId',p.id)?.day!==p.uploadedAt||p.views!==(p.exposureHistory?.at(-1)?.views||0)||!Array.isArray(p.exposureHistory)||p.exposureHistory.some(x=>!date(x.day)||!Number.isInteger(x.views)||x.views<0||sourceRow(s,x.eventId,'exposure','postId',p.id)?.observedViews!==x.views)||(!['public'].includes(p.visibility)&&p.exposureHistory.length))return false;}
  for(const [id,p] of Object.entries(life.performances)){if(p.id!==id||!['school','busking'].includes(p.kind)||!vis(p.visibility)||(p.expiresAt!==undefined&&(!Number.isInteger(p.expiresAt)||p.expiresAt<p.performedAt))||!date(p.performedAt)||!sourceRow(s,p.eventId,'performance','performanceId',p.id)||!Number.isInteger(p.observers)||p.observers<0||sourceRow(s,p.eventId,'performance','performanceId',p.id)?.observedAudience!==p.observers||sourceRow(s,p.eventId,'performance','performanceId',p.id)?.day!==p.performedAt||!Array.isArray(p.practiceEventIds)||p.practiceEventIds.length<2||p.practiceEventIds.some(id=>!rowExists(s,id,'rehearsal')))return false;}
  const ids=new Set(s.history.map(h=>h.id));for(const h of s.history){if(h.causeIds&&(!Array.isArray(h.causeIds)||h.causeIds.some(id=>!ids.has(id)||id>=h.id)))return false;if(h.resultIds&&(!Array.isArray(h.resultIds)||h.resultIds.some(id=>!ids.has(id)||id<=h.id)))return false;}
  if(s.pending?.kind==='student_showcase'&&(!a||a.status!=='active'||a.practiceEventIds.length<2||s.pending.data.activityId!==a.id))return false;
  if(s.pending?.kind==='entry_offer'&&evidenceRequired(s.pending.data.route)&&(typeof s.pending.data.sourceId!=='string'||!entryEvidence(s,s.pending.data.route,s.pending.data.sourceId)))return false;
  return true;
 }catch{return false;}
}
