import {createOffer,getOffer,offerOpen,canSignOffer,contractDecision,priorities,trainingFactor,competitionFactor} from './agency.js';
import {clubs,ensureStudentLife,studentAction,entryEvidence,evidenceRequired,evidenceEventId,growExposure,closeStudentActivity} from './student-life.js';
import {selectNews} from './news-scheduler.js';
import {rivalArc} from './event-pack.generated.js';
import {clamp,random} from './random.js';
import {stats,stages} from './state.js';
import {config,policies,policyIds} from './config.js';
import {dateAt,START_YEAR,dateLabel} from './calendar.js';
import {decisions,decisionAllowed} from './events.js';
import {entryRoutes,pickRoute,entryProbability,routeDecision} from './entry.js';
import {getAgency,getGroup,getProject,getRivals,getContract,signContract,createPerson,createProject,createGroup,syncCareerWorld,renewContract,linkPeople,relationship,relationshipChoice,resolveFollowup,relationshipEvaluation,sharesWork,relationshipMoment,chooseRelationshipMoment,resolveRelationshipWork} from './world.js';
const active=s=>['idol','solo','actor','producer'].includes(s.stage);
export function record(s,title,text,category='career',important=false,extra={}){
 const row={id:++s.serial,day:s.day,date:dateLabel(s.day),stage:s.stage,title,text,category,important,...extra};s.history.push(row);for(const id of row.causeIds||[]){const cause=s.history.find(h=>h.id===id);if(cause){cause.resultIds??=[];if(!cause.resultIds.includes(row.id))cause.resultIds.push(row.id);}}const informal={'sns-diary':'draft','news_school_music_016':'browse','news_school_music_007':'private_practice','dance-hobby':'private_practice'};if(informal[row.eventId])studentAction(s,row,informal[row.eventId]);linkPeople(s,row);
 if(important)s.milestones.push({day:s.day,title,text,stage:s.stage});return row;
}
// Map one reviewed pack arc onto real existing events; no second parallel story engine.
function rivalArcStep(s,stage,personId=null){
 const prior=s.history.filter(h=>h.arcId===rivalArc.id);
 if(stage===1){if(prior.length)return {};return {arcId:rivalArc.id,arcStage:1,sourceEventId:rivalArc.stageIds[0],arcContext:{agencyId:s.agency,projectId:s.project,personId}};}
 const last=prior.at(-1),context=last?.arcContext;
 if(last?.arcStage!==stage-1||context.agencyId!==s.agency||context.projectId!==s.project||!s.rivals.includes(context.personId)||(personId&&context.personId!==personId))return {};
 return {arcId:rivalArc.id,arcStage:stage,sourceEventId:rivalArc.stageIds[stage-1],arcContext:context,personIds:[context.personId]};
}
export function effects(s,values={}){for(const [k,v] of Object.entries(values)){if(stats.includes(k))s.stats[k]=clamp(s.stats[k]+v);else if(['money','popularity','credits'].includes(k))s[k]+=v;}s.money=Math.max(-5000,s.money);s.popularity=clamp(s.popularity);if(s.popularity>s.peak){s.peak=s.popularity;s.peakDay=s.day;}if(s.peak>=80&&!s.achievements.includes('글로벌 스타')&&['idol','solo'].includes(s.stage)){s.achievements.push('글로벌 스타');record(s,'국경을 넘은 이름','해외 팬들의 호응이 이어지며 글로벌 스타로 기록됐다.','career',true);}}
export function schedule(s,type,delay,data={},scope='career'){
 const item={id:++s.serial,type,due:s.day+delay,data,epoch:scope==='career'?s.epoch:null};
 s.queue.push(item);s.queue.sort((a,b)=>a.due-b.due||a.id-b.id);return item;
}
export function begin(s){ensureStudentLife(s);if(!s.history.length){record(s,'평범한 하루의 시작',`${s.name}, ${s.age}세. 학교와 집을 오가며 친구, 가족과 일상을 보낸다. 어떤 꿈을 갖게 될지는 아직 모른다.`,'daily',true);planStudent(s,true);schedule(s,'student-activity-offer',31,{},'world');}return s;}
const preparing=s=>['trainee','debut_candidate'].includes(s.stage);
const schoolLife=s=>['student','auditioning'].includes(s.stage);
function planStudent(s,first=false){
 schedule(s,'opportunity',(first?35:30)+Math.floor(random(s)*31));
 if(!s.queue.some(q=>q.type==='student-future'))schedule(s,'student-future',Math.max(1,(s.studentReviewDay??540)-s.day));
}
const transitions={student:['auditioning'],auditioning:['student','trainee','debut_candidate'],trainee:['debut_candidate','actor','producer'],debut_candidate:['trainee','idol','actor','producer'],idol:['solo','actor','producer'],solo:['actor','producer'],actor:['producer'],producer:[]};
export function transition(s,to,{preserveQueue=false}={}){
 if(s.stage===to)return;
 if(!transitions[s.stage]?.includes(to))throw Error(`불가능한 전환: ${s.stage} → ${to}`);
 if(['trainee','debut_candidate'].includes(to)&&!getAgency(s))throw Error('소속사 계약이 필요합니다.');
 if(['idol','solo'].includes(to)&&(!s.debuted||(to==='idol'&&!getGroup(s))))throw Error('실제 데뷔와 그룹 정보가 필요합니다.');
 const from=s.stage;if(['idol','solo'].includes(from)&&['actor','producer'].includes(to))s.idolRetired=true;
 if(!['student','auditioning'].includes(to))closeStudentActivity(s);
 syncCareerWorld(s,from,to);
 s.stage=to;s.epoch++;
 if(preserveQueue)s.queue.forEach(q=>{if(q.epoch!==null)q.epoch=s.epoch;});else s.queue=s.queue.filter(q=>q.epoch===null);
 s.pending=null;
 if(!policyIds(to).includes(s.policy))s.policy=schoolLife(s)?'school':to==='trainee'||to==='debut_candidate'?'balanced':'craft';
 if(!preparing(s)){s.project=null;s.rivals=[];}
 record(s,stages[to],`${stages[from]}에서 ${stages[to]}으로 생활의 방향이 바뀌었다.`,'career',true);
}
function prompt(s,kind,data={}){
 if(s.pending||s.stage==='ended'||!decisionAllowed(s,kind))return false;
 let d=kind==='entry_offer'?routeDecision(data.route,s,data.sourceId):decisions[kind];if(kind==='contract'){d=contractDecision(s);data={...data,offerId:getOffer(s)?.id,agencyId:getOffer(s)?.agencyId};}if(!d)return false;if(kind==='meet_trainee'){const person=s.world.people[data.personId];d={...d,title:`새 연습생 ${person.name}`,body:`${getAgency(s).name}에 ${person.name}가 합류했다. ${person.personality} 성향의 동료에게 어떻게 다가갈까?`};}if(kind==='student_showcase'){const a=s.studentLife.activity;d={...d,title:`${clubs[a.kind].show}, 공개할까?`,body:`${clubs[a.kind].name}에서 합동 연습 ${a.practiceEventIds.length}회를 마쳤다. 공개 공연/영상의 원인이 되는 활동은 실제 기록으로 남는다. 공개 범위는 직접 정할 수 있다.`};}if(kind==='relationship_moment')d=relationshipMoment(s,data.personId,data.topic);s.pending={...d,choices:d.choices.filter(c=>!(kind==='career'&&s.stage==='solo'&&c.id==='solo')).map(c=>({...c})),kind,data,id:`decision-${++s.serial}`,day:s.day};s.playing=false;s.remainder=0;
 record(s,d.title,'결정이 필요한 순간이다. 선택할 때까지 시간은 멈춘다.','decision',true,{...(data.offerId?{offerId:data.offerId,agencyId:data.agencyId}:{}),...(data.personId?{personIds:[data.personId]}:{}),...(data.causeIds?{causeIds:data.causeIds,actorIds:['player'],resultIds:[],expiresAt:data.expiresAt??null}:{} )});return true;
}
export function setCareerPriority(s,id){
 if(!priorities[id]||s.pending?.kind!=='contract'||!offerOpen(s))return false;
 s.careerPriority=id;getOffer(s).preference=id;return true;
}
export function setPolicy(s,id){if(!policyIds(s.stage).includes(id)||s.stage==='ended'||s.pending)return false;s.policy=id;return true;}
export function finish(s,reason='스스로 선택한 새로운 일상'){
 if(s.stage==='ended')return;
 if(['idol','solo'].includes(s.stage))s.idolRetired=true;
 if(getOffer(s)&&getOffer(s).status!=='signed'){getOffer(s).status='expired';s.currentOfferId=null;}closeStudentActivity(s);syncCareerWorld(s,s.stage,'ended');s.project=null;s.rivals=[];s.stage='ended';if(!policyIds('ended').includes(s.policy))s.policy='balanced';s.playing=false;s.pending=null;s.queue=[];s.remainder=0;s.ending=reason;
 record(s,s.debuted||s.agency?'나의 마지막 인사':'또 다른 일상으로',reason,'career',true);
}
function startProject(s,delay=0){
 const project=createProject(s),id=project.id;s.support=false;const agency=getAgency(s);if(s.stage==='trainee'&&!agency.arrivalScheduled){agency.arrivalScheduled=true;schedule(s,'trainee-arrival',12,{agencyId:agency.id},'world');}
 for(const [type,days] of Object.entries(config.project)){if(type==='result')continue;schedule(s,`project-${type}`,days+delay,{projectId:id});}
 schedule(s,'peer-encounter',9+Math.floor(random(s)*6),{contextId:id});
}
function startCareer(s){
 if(['idol','solo'].includes(s.stage)){schedule(s,'comeback',90);schedule(s,'career',720);if(s.stage==='idol')schedule(s,'peer-encounter',12,{contextId:s.group});}
 if(s.stage==='actor')schedule(s,'acting',75);
 if(s.stage==='producer')schedule(s,'production',75);
 if(['actor','producer'].includes(s.stage))schedule(s,'future',540);
}
// All original teammates take part in non-blocking encounters, not only the late arrival.
function peerEncounter(s,contextId){
 const group=s.stage==='idol',current=group?s.group:s.project;
 if(!current||current!==contextId)return;
 const peers=(group?(getGroup(s)?.memberIds||[]).filter(id=>id!=='player').map(id=>s.world.people[id]):getRivals(s)).filter(p=>p?.agencyId===s.agency);
 if(!peers.length)return;
 const previous=s.history.filter(h=>h.peerContextId===contextId);
 const last=previous.at(-1)?.personIds?.[0];
 let candidates=peers.filter(p=>p.id!==last);if(!candidates.length)candidates=peers;
 const count=p=>previous.filter(h=>h.personIds?.includes(p.id)).length;
 const least=Math.min(...candidates.map(count));candidates=candidates.filter(p=>count(p)===least);
 const person=candidates[Math.floor(random(s)*candidates.length)],r=relationship(s,person.id);
 const scenes=[
 ['practice',group?'무대 연습 뒤 함께 동선을 다시 맞추며 작은 실수를 바로잡았다.':'합동 연습에서 서로 놓친 동작을 짚어 주었다.',1,1],
 ['snack','연습을 마치고 편의점에서 간단한 간식을 고르며 근황을 나눴다.',2,0],
 ['tip','어려운 동작에 대한 요령을 알려 주었다. 나도 내가 익힌 부분을 설명했다.',1,2],
 ['mishap','연습 중 박자를 놓치는 바람에 둘 다 웃음을 터뜨리고 다시 시작했다.',1,0],
 ['reflection',group?'지난 활동 영상을 돌려보며 다음 무대에서 고칠 부분을 이야기했다.':'서로의 평가 준비를 보며 다른 훈련 방법을 발견했다.',0,2],
 ['quiet','같은 연습실에서 각자의 과제를 하며 조용히 하루를 보냈다.',0,0],
 ['support','긴 연습 끝에 오늘도 수고했다는 짧은 격려를 건넸다.',1,1],
 ['schedule','연습실 사용 시간이 겹쳤지만 대화로 일정을 조정했다.',0,1]
 ];
 const recent=previous.slice(-4).map(h=>h.peerTopic);
 const available=scenes.filter(([t])=>!recent.includes(t)),pool=available.length?available:scenes;
 const [topic,detail,closeness,trust]=pool[Math.floor(random(s)*pool.length)];
 r.closeness=clamp(r.closeness+closeness);r.trust=clamp(r.trust+trust);
 const titles={practice:'함께 맞춘 동작',snack:'연습 후의 편의점',tip:'서로 배우는 시간',mishap:'연습실의 작은 실수',reflection:'서로의 피드백',quiet:'조용한 연습실',support:'짧은 격려',schedule:'일정을 맞추며'};
 record(s,titles[topic],`${person.name}와 ${detail}`,'relationship',false,{personIds:[person.id],peerTopic:topic,peerContextId:contextId});
 schedule(s,'peer-encounter',22+Math.floor(random(s)*28),{contextId});
}
// Releases are planned by a fictional agency, not chosen by a newly debuted idol.
function companyPlansComeback(s){
 const agency=getAgency(s);if(!agency)return;
 if(s.onBreakUntil>s.day){schedule(s,'comeback',s.onBreakUntil-s.day+12);return;}
 const roll=random(s),type=roll<.09&&s.releaseSerial>=2?'정규앨범':roll<.66?'미니앨범':roll<.86?'싱글 앨범':'디지털 싱글';
 const concept=agency.tendency==='퍼포먼스'?'퍼포먼스를 강조한 곡':agency.tendency==='창작'?'보컬과 표현을 강조한 곡':'방송 무대를 고려한 곡';
 const delay=45+Math.floor(random(s)*60),artist=s.stage==='idol'?(getGroup(s)?.name||'그룹'):s.name;
 const plan=record(s,'소속사의 새 활동 계획',`${agency.name}이 ${artist}의 ${type} 제작을 추진한다. ${concept}으로 약 ${delay}일간 준비하며, 나는 현재 연습 방침에 맞춰 참여한다.`,'career',true,{agencyId:s.agency,releaseType:type,groupId:s.group});
 schedule(s,'release',delay,{managed:true,releaseType:type,agencyId:s.agency,planEventId:plan.id});
}

function changeCareer(s,to){transition(s,to);s.onBreakUntil=null;startCareer(s);}
export function probability(s,type,mode=''){
 const p=config.probability;
 if(type==='audition')return entryRoutes[mode]?entryProbability(s,mode):0;
 if(type==='debut'){const skill=(s.stats.보컬+s.stats.댄스+s.stats.스타성)/3;
 const rivals=getRivals(s).length?getRivals(s).reduce((a,r)=>a+r.score,0)/getRivals(s).length:50;
 return clamp(p.debutBase+relationshipEvaluation(s)+(getProject(s)?.teamwork||0)*.002+(getProject(s)?.relationshipScore||0)*.008+skill*p.skillWeight+Math.min(24,s.training)*p.trainingWeight+(s.reviewScore-rivals)*p.rivalWeight+((s.support||getProject(s)?.candidate)?p.supportBonus:0),p.min,p.max);}
 return clamp(.12+s.stats.연기*.008+s.credits*.004,.05,.95);
}
export function choose(s,id,decisionId=s.pending?.id){
 const p=s.pending;if(!p||p.id!==decisionId||s.stage==='ended'||!decisionAllowed(s,p.kind))return false;
 const c=p.choices.find(c=>c.id===id);if(!c||c.disabled)return false;if(p.kind==='contract'&&(!offerOpen(s)||p.data.offerId!==getOffer(s).id||p.data.agencyId!==getOffer(s).agencyId||(id==='accept'&&!canSignOffer(s))||(id==='hold'&&getOffer(s).holdCount>=1)||(id==='consult'&&getOffer(s).consulted)))return false;if(p.kind==='entry_offer'&&evidenceRequired(p.data.route)&&!entryEvidence(s,p.data.route,p.data.sourceId))return false;
 s.pending=null;s.decisionCount++;
 const choiceRecord=record(s,p.title,`선택: ${c.label}`,'decision',true,{choice:id,...(p.kind==='contract'?{offerId:p.data.offerId,agencyId:getOffer(s).agencyId}:{}),causeIds:p.data.causeIds||[],actorIds:['player'],resultIds:[],...(p.data.personId?{personIds:[p.data.personId]}:{})});
 switch(p.kind){
 case 'student_activity':{
  const life=ensureStudentLife(s);life.offeredAt=s.day;
  if(id==='decline'){record(s,'방과 후의 다른 일상','이번에는 동아리에 가입하지 않았다. 관련 연습·공연·영상 공개 일정은 생기지 않는다.','daily',false,{causeIds:[choiceRecord.id],actorIds:['player'],resultIds:[]});break;}
  const a={id:`activity-${++s.serial}`,kind:id,status:'active',startedAt:s.day,joinEventId:null,practiceEventIds:[]};life.activity=a;
  const row=studentAction(s,record(s,`${clubs[id].name} 시작`,'가입을 마쳤다. 10일 뒤 첫 합동 연습이 있다. 지금은 공개 공연이나 게시물이 없다.','daily',true,{causeIds:[choiceRecord.id],actorIds:['player'],resultIds:[],activityId:a.id}),'join');a.joinEventId=row.id;
  schedule(s,'student-activity-rehearsal',10,{activityId:a.id},'world');break;}
 case 'student_showcase':{
  const a=s.studentLife.activity;a.status='preparing';const causeIds=[choiceRecord.id,...a.practiceEventIds];
  if(id==='skip'){a.status='completed';record(s,'연습으로 마무리하다','공연과 영상 게시 없이 이번 활동을 마쳤다. 실력과 함께한 시간은 남지만 외부 노출은 생기지 않았다.','daily',true,{causeIds,actorIds:['player'],resultIds:[]});break;}
  a.visibility=id==='public'?'public':'friends';
  record(s,id==='public'?'공개 발표 준비':'친구끼리 나눌 준비',`${clubs[a.kind].show}를 ${id==='public'?'외부에도 공개':'활동 친구들에게만 공유'}하기로 했다. 실제 발표는 7일 뒤다.`,'daily',false,{causeIds,actorIds:['player'],resultIds:[]});
  schedule(s,'student-performance',7,{activityId:a.id,choiceEventId:choiceRecord.id},'world');break;}
 case 'entry_offer':{
  const route=p.data.route,r=entryRoutes[route];s.lastEntryRoute=route;
  if(id==='decline'){record(s,'제안을 거절하다',`${r.label} 제안은 정중히 거절했다. 친구와 가족이 있는 일상은 계속되고, 다른 기회도 열려 있다.`,'daily');s.routeHistory.push({route,day:s.day,result:'declined'});planStudent(s);}
  else {s.entryRoute=route;s.entryAttempts++;s.entrySourceId=p.data.sourceId||null;s.routeHistory.push({route,day:s.day,result:'applied',sourceId:s.entrySourceId,causeIds:p.data.causeIds||[]});transition(s,'auditioning');effects(s,{money:-r.cost});schedule(s,'audition-result',r.days,{route,sourceId:s.entrySourceId,causeIds:[choiceRecord.id]});record(s,'심사 결과를 기다리며',`${r.label}에 참여했다. 약 ${r.days}일 뒤 결과가 전해진다. 그동안에도 학교생활은 이어진다.`,'career',true,{causeIds:[choiceRecord.id],actorIds:['player'],resultIds:[],sourceId:s.entrySourceId});}break;}
 case 'contract':{
  const route=s.entryRoute,r=entryRoutes[route],offer=getOffer(s);
  if(id==='consult'||id==='hold'){
   if(id==='consult'){offer.status='reviewing';schedule(s,'offer-review',7,{offerId:offer.id,causeIds:[choiceRecord.id]});}
   else{offer.status='held';offer.holdCount++;offer.expiresAt+=7;schedule(s,'offer-return',7,{offerId:offer.id,causeIds:[choiceRecord.id]});}
   record(s,id==='consult'?'계약 조건을 함께 확인하다':'제안을 보류하다',`${s.world.agencies[offer.agencyId].name}의 제안을 ${id==='consult'?'보호자/신뢰할 수 있는 동반자와 검토한다':'바로 수락하지 않고 생각한다'}. 7일 뒤 같은 회사의 제안을 다시 검토하며, 아직 계약은 아니다.`,'career',true,{offerId:offer.id,agencyId:offer.agencyId,causeIds:[choiceRecord.id],resultIds:[]});break;
  }
  if(id==='accept'){
   signContract(s,route);
   transition(s,route==='survival'?'debut_candidate':'trainee');
   effects(s,{멘탈:5});startProject(s);
   if(route==='survival'){getProject(s).phase='프로그램 선발 · 데뷔 프로젝트 준비';getProject(s).candidate=true;}
   s.routeHistory.push({route,day:s.day,result:'contracted',offerId:offer.id,agencyId:offer.agencyId});
   record(s,'계약을 마치다',`${r.label} 심사를 거쳐 ${getAgency(s).name}과 계약했다. ${route==='survival'?'정규 연습생 과정을 대신해 프로그램 데뷔 프로젝트에 참가한다.':'이제 소속사 연습생 생활이 시작된다.'}`,'agency',true,{offerId:offer.id,agencyId:offer.agencyId,contractId:s.contract,causeIds:[choiceRecord.id,offer.consultationEventId],resultIds:[]});
  }else {offer.status='declined';s.currentOfferId=null;s.routeHistory.push({route,day:s.day,result:'contract_declined',offerId:offer.id,agencyId:offer.agencyId});transition(s,'student');s.entryRoute=null;record(s,'계약을 보류하다','아직 계약하지 않기로 했다. 소속사 없이 학교와 일상의 생활을 이어간다.','daily');planStudent(s);}break;}
 case 'meet_trainee':{const personId=p.data.personId;relationshipChoice(s,personId,id,choiceRecord.id);record(s,'첫 만남 이후',`${s.world.people[personId].name}와의 첫 인사를 마쳤다. 이 선택은 다음 만남에도 남는다.`,'relationship',true,{personIds:[personId]});schedule(s,'relationship-followup',25,{personId,agencyId:s.agency},'world');break;}
 case 'relationship_moment':{
  const personId=p.data.personId,person=s.world.people[personId],change=chooseRelationshipMoment(s,personId,id,choiceRecord.id);effects(s,change);
  record(s,`${person.name}와 정한 다음 일정`,id==='boundary'?'이번 추가 평가는 신청하지 않고 각자의 시간을 존중하기로 했다. 관계는 이어지며 다음 만남에서 다시 방향을 정할 수 있다.':`${person.name}와 ${id==='cooperate'?'함께':'각자'} 준비를 시작했다. 14일 뒤 실제 평가 결과가 전해진다.`,'relationship',true,{personIds:[personId],changes:change});
  if(id!=='boundary')schedule(s,'relationship-result',14,{personId,agencyId:s.agency,mode:id},'world');break;}
 case 'student_future':if(id==='finish')finish(s,'연예계 진입 대신 지금의 일상과 다른 꿈을 이어가기로 했다.');else{s.studentReviewDay=s.day+365;record(s,'가능성을 열어 두다','일상을 이어가면서 새로운 기회가 오면 다시 생각해 보기로 했다.','daily');if(!s.queue.some(q=>q.type==='opportunity'))planStudent(s);else schedule(s,'student-future',365);}break;
 case 'final':
  if(id==='challenge'){const support=getProject(s).candidate;getProject(s).phase='최종 준비';transition(s,'debut_candidate');s.support=support;schedule(s,'debut-result',config.project.result,{projectId:getProject(s).id});record(s,'마지막 준비 기간','평가까지 30일. 지금까지의 훈련과 마지막 한 달의 컨디션이 결과에 반영된다.','agency',true);}
  else if(id==='delay'){if(s.stage==='debut_candidate')transition(s,'trainee');startProject(s,60);effects(s,{멘탈:-2});record(s,'다음 기수로','이번 데뷔 평가는 미뤘다. 60일의 재정비 뒤 다음 프로젝트가 시작된다.');}
  else changeCareer(s,'actor');break;
 case 'retry':
  if(id==='retry'&&s.attempts<5&&s.age<27){startProject(s,30);record(s,'재도전을 선택하다','누적 실력은 남아 있다. 다음 프로젝트가 한 달 뒤부터 시작된다.','career',true);}
  else if(id==='retire')finish(s);
  else changeCareer(s,id==='producer'?'producer':'actor');break;
 case 'comeback':
  if(id==='break'){s.onBreakUntil=s.day+90;record(s,'공백기를 갖는다','90일 동안 활동량을 줄인다. 현재 방침과 별개로 회복에 집중한다.','career',true);schedule(s,'return',90);}
  else {effects(s,{money:id==='bold'?-50:-20});s.releaseSerial++;schedule(s,'release',30,{mode:id,release:s.releaseSerial});record(s,'다음 작품을 만들다','제작이 시작됐다. 발매와 첫 반응은 이후 소식으로 전해진다.');}break;
 case 'career':if(id==='renew'){renewContract(s);effects(s,{money:90});schedule(s,'career',720);record(s,'활동 계약 갱신','현재 팀과 활동을 이어가기로 했다.','career',true);}else changeCareer(s,id);break;
 case 'acting':if(id==='producer')changeCareer(s,'producer');else{schedule(s,'acting-result',30,{mode:id});record(s,'대본을 준비하며','한 달 뒤 배역과 작품의 첫 결과가 전해진다.');}break;
 case 'production':effects(s,{money:id==='invest'?-80:0});schedule(s,'production-result',60,{mode:id});record(s,'제작 일정 시작','준비한 프로젝트의 결과는 두 달 뒤에 전해진다.');break;
 case 'future':if(id==='retire')finish(s);else if(id==='producer'&&s.stage!=='producer')changeCareer(s,'producer');else schedule(s,'future',540);break;
 case 'health':if(id==='retire')finish(s,'건강을 위해 스스로 선택한 은퇴');else{s.onBreakUntil=s.day+90;s.healthWarning=true;effects(s,{money:-30});schedule(s,'health-return',90);}break;
 case 'late':if(id==='retire')finish(s);else changeCareer(s,id);break;
 }
 if(s.stage!=='ended')s.playing=true;s.remainder=0;return true;
}
export function scheduledAllowed(s,type){
 if(type==='offer-review'||type==='offer-return')return s.stage==='auditioning'&&!s.agency&&!!getOffer(s);
 if(type==='student-activity-offer')return s.stage==='student'&&!s.agency;
 if(['student-activity-rehearsal','student-showcase','student-performance','student-post-exposure'].includes(type))return schoolLife(s)&&!s.agency;
 if(type==='trainee-arrival')return s.stage==='trainee'&&!!getAgency(s)&&!!getProject(s);
 if(type==='relationship-followup')return preparing(s)&&!!getAgency(s);
 if(type==='relationship-moment'||type==='relationship-result')return (preparing(s)||s.stage==='idol')&&!!getAgency(s);
  if(type==='peer-encounter')return !!getAgency(s)&&(preparing(s)&&!!getProject(s)||s.stage==='idol'&&!!getGroup(s));
 if(type==='opportunity'||type==='student-future')return s.stage==='student'&&!s.agency;
 if(type==='audition-result')return s.stage==='auditioning'&&!s.agency&&!!entryRoutes[s.entryRoute];
 if(type.startsWith('project-')||type==='debut-result'||type==='retry')return preparing(s)&&!!getAgency(s)&&!!getProject(s);
 if(['comeback','career','release','reaction','return'].includes(type))return ['idol','solo'].includes(s.stage)&&s.debuted&&!!getAgency(s)&&(s.stage==='solo'||!!getGroup(s));
 if(type==='acting'||type==='acting-result')return s.stage==='actor';
 if(type==='production'||type==='production-result')return s.stage==='producer';
 if(type==='future')return ['actor','producer'].includes(s.stage);
 return type==='health-return'&&s.stage!=='ended';
}
function dueEvent(s,q){
 const {type,data}=q;if(!scheduledAllowed(s,type))return;
 if(type.startsWith('project-')&&getProject(s)?.id!==data.projectId)return;
 switch(type){
 case 'student-activity-offer':{const life=ensureStudentLife(s);if(life.offeredAt===null&&!life.activity&&s.age<=18){life.offeredAt=s.day;prompt(s,'student_activity');}break;}
 case 'student-activity-rehearsal':{
  const a=s.studentLife?.activity;if(!a||a.id!==data.activityId||a.status!=='active')break;
  const causeIds=[a.practiceEventIds.at(-1)||a.joinEventId],change={[clubs[a.kind].skill]:1,체력:-1};effects(s,change);
  const row=studentAction(s,record(s,`${clubs[a.kind].name} 합동 연습`,`${a.practiceEventIds.length+1}번째 연습에서 함께 박자와 표현을 맞췄다. 연습실 안의 활동이며 아직 공연·공개 게시가 아니다.`,'daily',false,{causeIds,actorIds:['player'],resultIds:[],activityId:a.id,changes:change}),'rehearsal');a.practiceEventIds.push(row.id);
  if(a.practiceEventIds.length<2)schedule(s,'student-activity-rehearsal',14,{activityId:a.id},'world');else schedule(s,'student-showcase',7,{activityId:a.id},'world');break;}
 case 'student-showcase':{const a=s.studentLife?.activity;if(a?.id!==data.activityId||a.status!=='active'||a.practiceEventIds.length<2)break;if(s.stage==='auditioning'){schedule(s,'student-showcase',7,data,'world');break;}prompt(s,'student_showcase',{activityId:a.id,causeIds:[...a.practiceEventIds]});break;}
 case 'student-performance':{
  const a=s.studentLife?.activity;if(a?.id!==data.activityId||a.status!=='preparing'||a.practiceEventIds.length<2)break;
  const causeIds=[data.choiceEventId,...a.practiceEventIds],publicly=a.visibility==='public';
  if(a.kind==='video'){
   const id=`post-${++s.serial}`,title='동아리에서 함께 만든 연습 영상';
   const row=studentAction(s,record(s,publicly?'연습 영상을 공개 게시하다':'친구에게만 영상을 공유하다',`‘${title}’을 ${publicly?'공개':'친구 전용'} 범위로 직접 게시했다. ${publicly?'조회·확산은 아직 집계되지 않았다.':'외부 노출이나 스카우트 근거가 되지 않는다.'}`,'daily',true,{causeIds,actorIds:['player'],resultIds:[],postId:id,activityId:a.id}),'post');
   s.studentLife.posts[id]={id,title,kind:'video',visibility:a.visibility,uploadedAt:s.day,expiresAt:s.day+180,uploadEventId:row.id,activityId:a.id,views:0,exposureHistory:[]};
   if(publicly)schedule(s,'student-post-exposure',7,{postId:id},'world');
  }else{
   const id=`performance-${++s.serial}`,observers=publicly?Math.floor(10+random(s)*50+s.stats[clubs[a.kind].skill]/4):0,title=clubs[a.kind].show;
   const row=studentAction(s,record(s,publicly?`${title}를 마치다`:'친구끼리 발표를 마치다',publicly?`합동 연습을 바탕으로 ‘${title}’에 참여했다. 게임 내 관객 ${observers}명이 지켜봤다. 공개 공연 이력은 생겼지만 심사 연락과 합격이 보장되지는 않는다.`:'친구끼리 준비한 내용을 나눴다. 외부 공개 공연이나 온라인 게시물은 생기지 않았다.','daily',true,{causeIds,actorIds:['player'],resultIds:[],performanceId:id,activityId:a.id,observedAudience:observers}),'performance');
   s.studentLife.performances[id]={id,title,kind:clubs[a.kind].outlet,visibility:a.visibility,performedAt:s.day,expiresAt:s.day+180,eventId:row.id,practiceEventIds:[...a.practiceEventIds],activityId:a.id,observers};
  }
  a.status='completed';break;}
 case 'student-post-exposure':{
  const post=s.studentLife?.posts[data.postId];if(!post||post.visibility!=='public'||post.exposureHistory.length)break;
  post.views=growExposure(s,post);
  const row=studentAction(s,record(s,'공개 영상의 첫 노출',`공개 게시한 ‘${post.title}’의 게임 내 누적 조회가 ${post.views}회로 집계됐다. ${post.views>=200?'노출 조건을 충족해 SNS 심사 제안 후보가 됐다. 연락과 합격은 별도 확률이다.':'아직 외부 심사 제안의 노출 기준에 이르지 않았다. 영상 활동의 경험은 남았다.'}`,'daily',true,{causeIds:[post.uploadEventId],actorIds:['player'],resultIds:[],postId:post.id,observedViews:post.views}),'exposure');post.exposureHistory.push({day:s.day,views:post.views,eventId:row.id});break;}
 case 'trainee-arrival':{
  if(s.agency!==data.agencyId)break;const person=createPerson(s,s.agency);s.rivals.push(person.id);getProject(s).participantIds.push(person.id);getAgency(s).changes++;
  record(s,'새 연습생 합류',`${getAgency(s).name}에 ${person.name}가 들어왔다. 같은 연습실에서 앞으로 자주 마주치게 된다.`,'agency',true,{personIds:[person.id],...rivalArcStep(s,1,person.id)});prompt(s,'meet_trainee',{personId:person.id});break;}
 case 'relationship-followup':{
  const person=s.world.people[data.personId];if(!person||person.agencyId!==s.agency||s.agency!==data.agencyId)break;const result=resolveFollowup(s,person.id);effects(s,result.playerEffects);
  relationship(s,person.id).nextMomentDay=s.day+20;
  const row=record(s,`${person.name}와 다시 만난 날`,result.text,'relationship',true,{personIds:[person.id],outcome:result.outcome,...rivalArcStep(s,2,person.id)});const conflicts=relationship(s,person.id).conflicts;for(const c of conflicts)if(c.eventId===null)c.eventId=row.id;break;}
 case 'relationship-moment':if(sharesWork(s,data.personId)&&s.agency===data.agencyId)prompt(s,'relationship_moment',data);break;
  case 'peer-encounter':peerEncounter(s,data.contextId);break;
 case 'relationship-result':{
  if(!sharesWork(s,data.personId)||s.agency!==data.agencyId)break;
  const result=resolveRelationshipWork(s,data.personId,data.mode);effects(s,result.playerEffects);
  record(s,`${s.world.people[data.personId].name}와 준비한 결과`,result.text,'relationship',true,{personIds:[data.personId],changes:result.playerEffects,success:result.ok,relationshipResult:true});break;}
 case 'opportunity':if(s.stage==='student'){const route=pickRoute(s);if(route){s.lastEntryRoute=route;const evidence=entryEvidence(s,route);prompt(s,'entry_offer',{route,sourceId:evidence?.id||null,expiresAt:evidence?.expiresAt||null,causeIds:evidence?[evidenceEventId(evidence)]:[]});}else schedule(s,'opportunity',14);}break;
 case 'student-future':prompt(s,'student_future');break;
 case 'offer-review':case 'offer-return':{
  const o=getOffer(s);if(!o||data.offerId!==o.id||!['reviewing','held'].includes(o.status))break;
  if(s.day>o.expiresAt){o.status='expired';s.currentOfferId=null;transition(s,'student');s.entryRoute=null;record(s,'계약 제안 기한이 지나다','계약은 체결되지 않았다. 일상을 이어가며 다른 기회를 기다린다.','career',true,{offerId:o.id,agencyId:o.agencyId});planStudent(s);break;}
  o.status='open';const reviewed=type==='offer-review';
  const row=record(s,reviewed?'조건 확인을 마치다':'보류한 제안을 다시 보다',`${s.world.agencies[o.agencyId].name}의 동일 제안을 다시 검토한다. ${reviewed?'교육 방향과 비용 분담·데뷔 일정의 미확인 사항을 동반자와 확인했다. 미확인 조건은 확정된 지원으로 취급하지 않는다.':'시간을 두고 검토했지만 계약은 자동 체결되지 않았다.'}`,'career',true,{offerId:o.id,agencyId:o.agencyId,offerAction:reviewed?'reviewed':'returned',causeIds:data.causeIds||[],resultIds:[]});
  if(reviewed){o.consulted=true;o.consultationEventId=row.id;}prompt(s,'contract',{offerId:o.id,causeIds:[row.id]});break;}
 case 'audition-result':{
  const route=data.route,r=entryRoutes[route];if(evidenceRequired(route)&&!entryEvidence(s,route,data.sourceId||s.entrySourceId,true)){transition(s,'student');s.entryRoute=null;record(s,'심사 근거를 다시 확인하다','공개 활동 근거를 확인할 수 없어 심사를 진행하지 않았다. 학교생활로 돌아가 다른 기회를 기다린다.','daily',true);planStudent(s);break;}const ok=random(s)<entryProbability(s,route);
  s.routeHistory.push({route,day:s.day,result:ok?'passed':'failed'});
  const screening=record(s,`${r.label} 심사 결과`,ok?'심사를 통과해 계약 조건을 검토할 수 있게 됐다. 아직 소속사 계약은 하지 않은 상태다.':'이번 심사에서는 선발되지 않았다. 학교로 돌아가 일상을 이어가며 다른 기회를 기다린다.','career',true,{success:ok,route,sourceId:data.sourceId||null,causeIds:data.causeIds||[],actorIds:['player'],resultIds:[]});
  if(ok){const o=createOffer(s,route,screening.id);const row=record(s,'회사 정보가 담긴 계약 제안',`${s.world.agencies[o.agencyId].name}에서 계약 검토를 제안했다. 회사와 조건을 먼저 확인한 뒤 수락 여부를 결정한다.`,'career',true,{offerId:o.id,agencyId:o.agencyId,causeIds:[screening.id],resultIds:[]});o.offerEventId=row.id;prompt(s,'contract',{offerId:o.id,causeIds:[row.id]});}else{effects(s,{멘탈:-2});transition(s,'student');s.entryRoute=null;planStudent(s);}break;}
 case 'project-announce':getProject(s).announced=true;getProject(s).phase='프로젝트 발표';record(s,'새 그룹 프로젝트',`${getAgency(s).name}에서 신규 그룹 데뷔 프로젝트를 발표했다. 선발 예정 인원은 ${getProject(s).slots}명이다.`,'agency',true);break;
 case 'project-candidates':{
  const score=(s.reviewScore+s.stats.스타성)/2+(getProject(s).relationshipScore||0);getProject(s).candidate=s.entryRoute==='survival'||score>=getRivals(s).reduce((a,r)=>a+r.score,0)/Math.max(1,s.rivals.length)-5;getProject(s).phase='후보 선발';getProject(s).score=score;if(getProject(s).candidate&&s.stage==='trainee')transition(s,'debut_candidate',{preserveQueue:true});
  record(s,'데뷔조 후보 발표',getProject(s).candidate?'지난 평가와 연습 성과를 바탕으로 데뷔조 후보에 이름을 올렸다.':'이번 후보 명단에는 들지 못했다. 최종 평가까지 실력을 보완할 기회는 남아 있다.','agency',true);break;}
 case 'project-cut':getProject(s).slots=3;getProject(s).phase='팀 구성 조정';getAgency(s).changes++;getRivals(s).forEach(r=>r.score=clamp(r.score+random(s)*5));record(s,'데뷔조 인원 조정','앞서 발표한 프로젝트의 인원이 4명에서 3명으로 줄었다. 경쟁 연습생들의 평가도 다시 반영된다.','agency',true,rivalArcStep(s,3));break;
 case 'project-final':{getProject(s).phase='최종 평가';const arc=rivalArcStep(s,4);if(arc.arcId)record(s,'첫 만남에서 최종 평가까지',`${s.world.people[arc.arcContext.personId].name}와 쌓은 신뢰와 경쟁, 공동 준비 결과가 이번 평가에 반영된다. 프로젝트 관계 평가 ${getProject(s).relationshipScore||0}점 · 현재 데뷔 가능성 약 ${Math.round(probability(s,'debut')*100)}%. 최종 선발은 아직 확정되지 않았다.`,'relationship',true,arc);prompt(s,'final');break;}
 case 'debut-result':{
  const ok=random(s)<probability(s,'debut');s.attempts++;
  if(ok){s.debuted=true;const group=createGroup(s);transition(s,'idol');s.achievements.push('첫 데뷔');effects(s,{popularity:15,money:50,멘탈:8});record(s,'처음 팬을 만난 날',`${getGroup(s).name}의 데뷔 무대가 열렸다. 연습실에서 보낸 시간이 첫 활동으로 이어졌다.`,'career',true);startCareer(s);
   for(const [id,r] of Object.entries(s.relationships))if(r.approach){const together=group.memberIds.includes(id);r.commitment=together?'같은 그룹으로 데뷔 · 함께하는 활동이 계속됨':'이번 데뷔조에서는 서로 다른 길';record(s,together?'함께 데뷔한 동료':'갈라진 데뷔 명단',`${s.world.people[id].name}${together?'와 같은 그룹으로 데뷔했다. 연습생 때의 신뢰와 경쟁은 활동에서도 이어진다.':'는 이번 데뷔조에 들지 못했다. 이전 인연과 기록은 남지만 함께하는 활동은 중단된다.'}`,'relationship',true,{personIds:[id]});}
  }
  else {transition(s,'trainee');effects(s,{멘탈:-6});getProject(s).phase='평가 탈락 · 재정비';getProject(s).candidate=false;getProject(s).status='failed';record(s,'최종 평가 결과','이번 데뷔조에서는 제외됐다. 실력과 경력은 남고, 다음 방향을 고를 시간도 남아 있다.','career',true);schedule(s,'retry',30);}break;}
 case 'retry':prompt(s,s.attempts>=5||s.age>=27?'late':'retry');break;
 case 'comeback':companyPlansComeback(s);break;
 case 'career':prompt(s,'career');break;
 case 'release':{
   if(data.managed&&data.agencyId!==s.agency)break;
   if(data.managed)s.releaseSerial++;
   const type=data.releaseType||'활동 음반',number=data.managed?s.releaseSerial:data.release;
   record(s,'새 작품 발매',`${number}번째 발매 프로젝트인 ${type}이 공개됐다. 활동을 시작하고 첫 반응은 2주 뒤에 확인한다.`,'career',true,{releaseType:type,causeIds:data.planEventId?[data.planEventId]:[],agencyId:s.agency});
   schedule(s,'reaction',14,{...data,release:number});break;}
 case 'reaction':{
  const p=clamp(.12+(s.stats.스타성+s.stats.보컬+s.stats.댄스)/3*.008+(s.policy==='promotion'?.08:0),.05,.95),ok=random(s)<p;
  effects(s,{popularity:ok?(data.mode==='bold'?18:9):-2,money:ok?150:15,credits:1,체력:-2});
  record(s,'발매 후 첫 반응',ok?'앞서 발매한 작품의 무대가 퍼지며 새 팬들이 유입됐다.':'앞서 발매한 작품의 반응은 조용했다. 작은 무대 경험을 남기고 다음 활동을 준비한다.','career',true,{success:ok});schedule(s,'comeback',120+Math.floor(random(s)*110));break;}
 case 'return':s.onBreakUntil=null;record(s,'활동 재개','재정비 기간을 마쳤다. 현재 활동 방침에 따라 다시 일정을 시작한다.','career',true);schedule(s,'comeback',30);break;
 case 'acting':prompt(s,'acting');break;
 case 'acting-result':{
  const ok=data.mode==='support'||random(s)<probability(s,'acting');effects(s,ok?{연기:2,popularity:data.mode==='lead'?12:3,money:data.mode==='lead'?180:40,credits:1}:{연기:.5,멘탈:-2});record(s,'작품의 첫 결과',ok?'준비한 배역으로 촬영을 마쳤다. 현장 경험과 작품 이력이 남았다.':'주연 배역은 다른 사람에게 갔다. 다음 작품을 위한 연습을 이어간다.','career',true,{success:ok});schedule(s,'acting',120);break;}
 case 'production':prompt(s,'production');break;
 case 'production-result':{
  const ok=data.mode==='coach'||random(s)<clamp(.2+(s.stats.랩+s.stats.보컬)*.004,.05,.95);effects(s,{money:ok?(data.mode==='invest'?210:60):10,credits:ok?2:.5});record(s,'제작 프로젝트 결과',ok?'후배의 무대가 완성됐다. 제작과 지도 경력이 다음 제안으로 이어진다.':'프로젝트의 반응은 아쉬웠다. 제작비를 모두 회수하지 못했지만 경험이 남았다.','career',true,{success:ok});schedule(s,'production',150);break;}
 case 'future':prompt(s,'future');break;
 case 'health-return':s.onBreakUntil=null;s.healthWarning=false;record(s,'회복 기간을 마치다','활동을 조절하며 컨디션을 회복했다. 현재 방침으로 복귀한다.','career',true);break;
 }
}
function monthly(s){
 const before=s.lastMonthStats;const delta=Object.fromEntries(stats.map(k=>[k,Math.round((s.stats[k]-before[k])*10)/10]));
 const skill=(s.stats.보컬+s.stats.댄스+s.stats.스타성)/3;s.reviewScore=Math.round(skill*.8+s.stats.멘탈*.1+s.stats.체력*.1);
 if(preparing(s)&&s.agency){s.training++;getRivals(s).forEach(r=>r.score=clamp(r.score+(random(s)*3-1)*competitionFactor(s)));}
 const student=schoolLife(s);const income=student?(s.family==='여유 있는 가정'?5:s.family==='평범한 가정'?2:1):active(s)?(s.onBreakUntil?8:20+s.popularity*.7):0;
 const expense=student?(s.family==='여유 있는 가정'?3:s.family==='평범한 가정'?1.5:.8):active(s)?12:s.family==='빠듯한 살림'?10:s.family==='여유 있는 가정'?2:5;
 const net=Math.round((income-expense)*10)/10;effects(s,{money:net,popularity:active(s)&&s.policy==='promotion'?.5:0});
 const training=preparing(s)&&!!s.agency;const title=student?'한 달의 일상':training?'월말 훈련 평가':'월별 활동 정산';
 record(s,title,`${policies[s.policy].label} 방침으로 한 달을 보냈다. ${training?`종합 평가 ${s.reviewScore}점. `:''}${student?'용돈':'수입'} ${income}만 · ${student?'개인 지출':'지출'} ${expense}만 · ${student?'보유 현금':'순자산'} ${net>=0?'+':''}${net}만원.`,'monthly',false,{changes:delta,moneyChange:net});s.lastMonthStats={...s.stats};
 if(s.credits>=8&&!s.achievements.includes('창작의 발자취'))s.achievements.push('창작의 발자취');
}
export function advanceDay(s){
 if(!s.playing||s.pending||s.stage==='ended')return false;
 // Repair existing v0.2.9 saves: the old project has no peer events in its queue.
 const peerContextId=preparing(s)?s.project:s.stage==='idol'?s.group:null;
 if(peerContextId&&!s.queue.some(q=>q.type==='peer-encounter'&&q.data.contextId===peerContextId)
  &&!s.history.slice(-100).some(h=>h.peerContextId===peerContextId&&s.day-h.day<35)){
  const people=preparing(s)?getRivals(s):getGroup(s)?.memberIds.filter(id=>id!=='player');
  if(people?.length)schedule(s,'peer-encounter',7,{contextId:peerContextId});
 }
 // Also initializes ongoing contact for compatible v0.2.4 saves without replaying the first meeting.
 for(const [id,r] of Object.entries(s.relationships))if(r.approach&&sharesWork(s,id)){
   const contextId=s.stage==='idol'?s.group:s.project;
   if(r.lastAction&&!r.momentProjectId)r.momentProjectId=contextId; // migrate completed old-save moments
   if(r.momentProjectId===contextId)continue; // never repeat the same decision within this project
   if(r.nextMomentDay===undefined)r.nextMomentDay=s.day+45;
   if(s.day>=r.nextMomentDay&&!(s.onBreakUntil>s.day)&&!s.queue.some(q=>['relationship-moment','relationship-result','relationship-followup'].includes(q.type)&&q.data.personId===id)){
    const topics=['feedback','teamwork','routine','practice'];
    schedule(s,'relationship-moment',1,{personId:id,agencyId:s.agency,topic:topics[Math.floor(random(s)*topics.length)]},'world');
    r.nextMomentDay=s.day+180;
   }
  }
  const previous=dateAt(s.day);s.day++;const date=dateAt(s.day);s.age=s.startAge+date.getUTCFullYear()-START_YEAR;
 const resting=s.onBreakUntil>s.day||s.policy==='rest';const p=policies[resting?'rest':s.policy];
 if(schoolLife(s)){s.interest=clamp(s.interest+(s.policy==='hobby'?.06:0));s.snsActivity=clamp(s.snsActivity+(s.policy==='content'?.16:.01));s.social=clamp(s.social+(s.policy==='friends'?.06:0));s.schoolParticipation=clamp(s.schoolParticipation+(s.policy==='friends'?.06:.005));}
 const change=Object.fromEntries(Object.entries(p.growth).map(([k,v])=>[k,v*(preparing(s)&&!resting?trainingFactor(s,k):1)/30.4375]));change.체력=-p.fatigue/30.4375;change.멘탈=(resting?2:.1)/30.4375;
 if(s.policy==='promotion'&&!resting&&active(s))change.popularity=.8/30.4375;
 if(resting&&active(s))change.popularity=-.6/30.4375;
 effects(s,change);
 if(date.getUTCMonth()!==previous.getUTCMonth())monthly(s);
 if(s.age>=config.maxAge){finish(s,'오랜 커리어를 마무리하고 삶의 다음 장으로');return true;}
 if((s.stats.체력<15||s.stats.멘탈<15)&&!s.healthWarning){prompt(s,'health');return true;}
 if(preparing(s)&&s.age>=27){s.queue=[];prompt(s,'late');return true;}
 // Every due item is processed in order, stopping immediately at the first decision.
 while(s.queue.length&&s.queue[0].due<=s.day&&!s.pending){const q=s.queue.shift();if(q.epoch===null||q.epoch===s.epoch)dueEvent(s,q);}
 if(s.pending)return true;
 const rate=config.newsPerMonth[resting?'rest':s.stage]??2;
 if(random(s)<(rate-1)/30.4375){const n=selectNews(s);
  if(n){effects(s,n.effects);if(n.studentEffect==='sns')s.snsActivity=clamp(s.snsActivity+2);if(n.studentEffect==='interest')s.interest=clamp(s.interest+2);
   const extra={eventId:n.id,topic:n.topic,source:n.sourceFile?'event-pack-v03':'legacy',newsContext:{agencyId:s.agency,groupId:s.group,projectId:s.project,debuted:s.debuted},...(n.personId?{personIds:[n.personId]}:{})};
   if(n.personId)record(s,n.title,n.text,n.category,false,extra);
   else if(n.id==='friend'&&getAgency(s)){const contacts=Object.values(s.world.people).filter(p=>p.agencyId===s.agency);if(contacts.length){const person=contacts[Math.floor(random(s)*contacts.length)],r=relationship(s,person.id);r.closeness=clamp(r.closeness+1);r.trust=clamp(r.trust+.5);record(s,n.title,`${person.name}와 식사하며 근황을 나눴다. 예전에 함께한 일들을 자연스럽게 떠올렸다.`,n.category,false,{...extra,personIds:[person.id]});}else record(s,n.title,n.text,n.category,false,extra);}
   else if(n.environment==='rival'&&s.rivals.length){const r=getRivals(s)[Math.floor(random(s)*s.rivals.length)];r.score=clamp(r.score+3);getAgency(s).changes++;record(s,n.title,`${n.text} ${r.name}의 최근 평가도 상승했다.`,n.category,false,extra);}
   else record(s,n.title,n.text,n.category,false,extra);
  }
 }
 return true;
}
export function nextDecision(s,budget=config.maxSkipDays){
 if(s.pending||s.stage==='ended')return {days:0,reason:s.pending?'decision':'ended'};
 s.playing=true;s.remainder=0;let days=0;while(days<budget&&!s.pending&&s.stage!=='ended'){advanceDay(s);days++;}
 if(!s.pending&&s.stage!=='ended'){s.playing=false;record(s,'잠시 돌아보기',`${days}일 동안의 기록을 모았다. 아직 새 결정이 없어 잠시 멈췄다.`,'system');}
 return {days,reason:s.pending?'decision':s.stage==='ended'?'ended':'limit'};
}
