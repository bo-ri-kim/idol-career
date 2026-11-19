import {getOffer,canSignOffer} from './agency.js';
import {random,clamp} from './random.js';
import {dateAt} from './calendar.js';
const statNames=['보컬','댄스','랩','연기','스타성','멘탈','체력'];
export function createWorld(){
 const profiles=[['orbit','오르빗 뮤직','중형',65,'퍼포먼스','경쟁 평가 중심'],['dawn','새벽 엔터테인먼트','소형',40,'창작','소규모 밀착 지도'],['onair','온에어 스튜디오','중형',55,'방송','협업과 현장 경험 중심'],['program','프로그램 협력 기획사','대형',80,'방송','기수별 프로젝트 운영']];
 return {serial:0,agencies:Object.fromEntries(profiles.map(([id,name,scale,resources,tendency,management])=>[id,{id,name,scale,resources,tendency,management,changes:0,traineeIds:[],groupIds:[],projectIds:[],arrivalScheduled:false}])),people:{},groups:{},projects:{},contracts:{},offers:{}};
}
export const getAgency=s=>s.world.agencies[s.agency]||null;
export const getGroup=s=>s.world.groups[s.group]||null;
export const getProject=s=>s.world.projects[s.project]||null;
export const getContract=s=>s.world.contracts[s.contract]||null;
export const getRivals=s=>s.rivals.map(id=>s.world.people[id]).filter(Boolean);
export const personAge=(s,p)=>p.initialAge+dateAt(s.day).getUTCFullYear()-dateAt(p.createdDay).getUTCFullYear();
const add=(list,id)=>{if(!list.includes(id))list.push(id);};
const remove=(list,id)=>{const i=list.indexOf(id);if(i>=0)list.splice(i,1);};
export function relationship(s,id){
 if(!s.world.people[id])return null;
 return s.relationships[id]??(s.relationships[id]={closeness:15,trust:20,rivalry:15,conflicts:[],history:[],approach:null});
}
export function createPerson(s,agencyId,name=null){
 const agency=s.world.agencies[agencyId];if(!agency)throw Error('인물의 소속사가 없습니다.');
 const id=`person-${++s.world.serial}`;
 const names=['연우','민서','준','지후','서연','윤재','하영','도하'];
 const used=new Set(Object.values(s.world.people).map(p=>p.name));
 const base=names.find(n=>!used.has(n))||`연습생 ${s.world.serial}`;
 const traits=['신중함','솔직함','야심','협력적'];
 const personality=traits[Math.floor(random(s)*traits.length)];
 const stats=Object.fromEntries(statNames.map(k=>[k,Math.round(30+random(s)*35)]));
 const p={id,name:name||base,initialAge:Math.max(13,s.age-2+Math.floor(random(s)*5)),createdDay:s.day,personality,traits:[personality],agencyId,groupId:null,status:'trainee',stats,score:Math.round((stats.보컬+stats.댄스+stats.스타성)/3),history:[]};
 s.world.people[id]=p;add(agency.traineeIds,id);relationship(s,id);return p;
}
export function signContract(s,route){
 const offer=getOffer(s);if(s.stage!=='auditioning'||!canSignOffer(s,offer)||offer.routeId!==route||s.entryRoute!==route||s.pending)throw Error('회사와 조건을 확인한 유효한 제안이 필요합니다.');s.agency=offer.agencyId;offer.status='signed';
 const id=`contract-${++s.world.serial}`;s.contract=id;
 s.world.contracts[id]={id,agencyId:s.agency,offerId:offer.id,kind:route==='survival'?'프로젝트 참가':'연습생',startDay:s.day,reviewDay:s.day+offer.terms.reviewDays,endDay:null,status:'active',terms:offer.terms.description,renewals:[]};
 const a=getAgency(s);add(a.traineeIds,'player');a.resources=clamp(a.resources-1);
 s.rivals=[];for(let i=0;i<3;i++){const person=createPerson(s,s.agency);s.rivals.push(person.id);
  // Existing trainees must have lives and future interactions, not just the one who joins later.
  const contact=relationship(s,person.id);contact.approach='acquaintance';contact.nextMomentDay=s.day+100+i*55;
 }
}
export function createProject(s){
 const a=getAgency(s);if(!a)throw Error('계약 없이 프로젝트를 시작할 수 없습니다.');
 const previous=getProject(s);if(previous&&previous.status==='preparing')previous.status='replaced';
 const id=`project-${++s.world.serial}`;s.project=id;
 const project={id,number:++s.projectSerial,agencyId:a.id,phase:'대기',announced:false,candidate:false,slots:4,score:0,status:'preparing',createdDay:s.day,participantIds:['player',...s.rivals],selectedIds:[],teamwork:0};
 s.world.projects[id]=project;add(a.projectIds,id);return project;
}
export function renewContract(s){const c=getContract(s);if(c){c.renewals.push({day:s.day,kind:s.stage});c.reviewDay=s.day+720;c.status='active';}}
export function createGroup(s){
 const project=getProject(s),a=getAgency(s);if(!project||!a)throw Error('데뷔 프로젝트와 소속사가 필요합니다.');
 const members=getRivals(s).slice().sort((x,y)=>y.score-x.score).slice(0,Math.max(1,project.slots-1));
 const id=`group-${++s.world.serial}`;
 const group={id,name:`프로젝트 ${project.number}기`,agencyId:a.id,memberIds:['player',...members.map(p=>p.id)],positions:{player:s.stats.보컬>=s.stats.댄스?'보컬':'퍼포먼스'},debutDay:s.day,status:'active',formerMemberIds:[]};
 for(const p of members){p.groupId=id;p.status='idol';group.positions[p.id]=p.stats.댄스>=p.stats.보컬?'댄스':'보컬';remove(a.traineeIds,p.id);}
 project.status='debuted';project.selectedIds=[...group.memberIds];s.world.groups[id]=group;add(a.groupIds,id);s.group=id;return group;
}
export function syncCareerWorld(s,from,to){
 const a=getAgency(s),c=getContract(s),project=getProject(s);
 if(from==='idol'&&to!=='idol'){
  const g=getGroup(s);if(g){remove(g.memberIds,'player');add(g.formerMemberIds,'player');delete g.positions.player;}s.group=null;
 }
 if(a){if(['trainee','debut_candidate'].includes(to))add(a.traineeIds,'player');else remove(a.traineeIds,'player');}
 if(c){c.kind=to==='trainee'?'연습생':to==='debut_candidate'?'데뷔 프로젝트':to==='ended'?'활동 종료':to;c.status=to==='ended'?'closed':'active';if(to==='ended')c.endDay=s.day;}
 if(!['trainee','debut_candidate'].includes(to)&&project&&project.status==='preparing')project.status=to==='idol'?'debuted':'withdrawn';
}
export function linkPeople(s,row){
 for(const id of row.personIds||[]){const p=s.world.people[id],r=relationship(s,id);if(p&&!p.history.includes(row.id))p.history.push(row.id);if(r&&!r.history.includes(row.id))r.history.push(row.id);}
}
export function relationshipChoice(s,id,choice,eventId){
 const p=s.world.people[id],r=relationship(s,id);if(!p||!r)throw Error('관계 대상이 없습니다.');r.approach=choice;
 if(choice==='befriend'){r.closeness=clamp(r.closeness+20);r.trust=clamp(r.trust+12);r.rivalry=clamp(r.rivalry+3);}
 if(choice==='compete'){r.closeness=clamp(r.closeness-4);r.trust=clamp(r.trust-10);r.rivalry=clamp(r.rivalry+25);r.conflicts.push({day:s.day,eventId,reason:'첫 만남에서 경쟁 상대로 의식하며 거리를 둠'});}
 if(choice==='distance'){r.trust=clamp(r.trust+1);r.rivalry=clamp(r.rivalry+1);}
 return r;
}
export function followupModel(s,id){
 const p=s.world.people[id],r=relationship(s,id);if(!p||!r)return null;
 // Intimacy can increase pressure; trust, competition and personality pull separately.
 const cooperation=clamp(.16+r.trust*.006-r.rivalry*.003+(p.personality==='협력적'?.14:0)-(p.personality==='야심'?.12:0),.05,.8);
 const competition=clamp(.12+r.rivalry*.006+(p.personality==='야심'?.16:0)+(r.conflicts.length?.08:0),.08,.8);
 return {cooperation,competition:Math.min(1-cooperation,competition)};
}
export function resolveFollowup(s,id,roll=random(s)){
 const p=s.world.people[id],r=relationship(s,id),model=followupModel(s,id);if(!p||!model)return null;
 let outcome,text,playerEffects;
 if(roll<model.cooperation){outcome='cooperation';text=`${p.name}와 함께 어려운 구간을 연습했다. 서로의 피드백이 맞아 연습 완성도가 높아졌다.`;r.trust=clamp(r.trust+5);r.closeness=clamp(r.closeness+4);p.stats.댄스=clamp(p.stats.댄스+1);p.score=clamp(p.score+1);playerEffects={댄스:1,멘탈:1};const project=getProject(s);if(project)project.teamwork=clamp(project.teamwork+2,0,6);}
 else if(roll<model.cooperation+model.competition){outcome='rivalry';text=`${p.name}도 같은 파트를 원했다. ${r.approach==='compete'?'첫 만남 때부터 의식했던 경쟁이 이번 평가에서 드러났다.':'함께 지내는 사이여도 평가 자리까지 나눌 수는 없었다.'}`;r.rivalry=clamp(r.rivalry+8);r.trust=clamp(r.trust-3);r.conflicts.push({day:s.day,eventId:null,reason:'같은 평가 파트를 두고 경쟁'});p.score=clamp(p.score+2);playerEffects={멘탈:-1,댄스:.5};}
 else if(r.closeness>=30){outcome='pressure';text=`${p.name}가 개인 연습 시간까지 함께 쓰자고 했다. 친해진 만큼 서로의 시간에 대한 기대를 조율해야 했다.`;r.closeness=clamp(r.closeness-2);r.trust=clamp(r.trust+1);playerEffects={체력:-1};}
 else {outcome='parallel';text=`${p.name}와 같은 연습실에서 각자의 준비를 이어갔다. ${r.approach==='distance'?'처음 정한 적당한 거리는 유지됐다.':'아직 서로를 더 알아갈 시간이 필요하다.'}`;r.trust=clamp(r.trust+1);playerEffects={멘탈:.3};}
 return {outcome,text,playerEffects,personId:id};
}
export function relationshipEvaluation(s){
 const contacts=getRivals(s);if(!contacts.length)return 0;
 return clamp(contacts.reduce((sum,p)=>{const r=relationship(s,p.id);return sum+(r.trust-20)*.00025-(r.rivalry-15)*.0002;},0),-.04,.04);
}
export function validWorld(s){
 try{
 const w=s.world;if(!w||!Number.isInteger(w.serial)||!['agencies','people','groups','projects','contracts'].every(k=>w[k]&&typeof w[k]==='object'&&!Array.isArray(w[k]))||!s.relationships)return false;
 const unique=a=>Array.isArray(a)&&new Set(a).size===a.length;
 const historyIds=new Set(s.history.map(h=>h.id)),historyById=new Map(s.history.map(h=>[h.id,h]));if(s.history.some(h=>h.personIds&&(!Array.isArray(h.personIds)||h.personIds.some(id=>!w.people[id]))))return false;
 for(const [id,a] of Object.entries(w.agencies)){if(id!==a.id||typeof a.name!=='string'||!Number.isFinite(a.resources)||!['traineeIds','groupIds','projectIds'].every(k=>unique(a[k])))return false;for(const p of a.traineeIds){if(p==='player'){if(s.agency!==id||!['trainee','debut_candidate'].includes(s.stage))return false;}else if(w.people[p]?.agencyId!==id||w.people[p]?.status!=='trainee')return false;}if(a.groupIds.some(g=>w.groups[g]?.agencyId!==id)||a.projectIds.some(p=>w.projects[p]?.agencyId!==id))return false;}
 for(const [id,p] of Object.entries(w.people)){if(id!==p.id||typeof p.name!=='string'||!w.agencies[p.agencyId]||!Number.isFinite(p.initialAge)||!Number.isFinite(p.createdDay)||!Number.isFinite(p.score)||!statNames.every(k=>Number.isFinite(p.stats?.[k])&&p.stats[k]>=0&&p.stats[k]<=100)||!Array.isArray(p.history)||p.history.some(h=>!historyById.get(h)?.personIds?.includes(id))||!Array.isArray(p.traits)||!s.relationships[id])return false;if(p.groupId&&!w.groups[p.groupId]?.memberIds.includes(id))return false;}
 for(const [id,g] of Object.entries(w.groups)){if(id!==g.id||!w.agencies[g.agencyId]||!unique(g.memberIds)||!Array.isArray(g.formerMemberIds)||!g.positions||!Number.isFinite(g.debutDay))return false;for(const pid of g.memberIds){if(typeof g.positions[pid]!=='string')return false;if(pid==='player'){if(s.group!==id||s.stage!=='idol'||!s.debuted)return false;}else if(w.people[pid]?.groupId!==id||w.people[pid]?.agencyId!==g.agencyId)return false;}}
 for(const [id,p] of Object.entries(w.projects)){if(id!==p.id||!w.agencies[p.agencyId]||!Array.isArray(p.participantIds)||p.participantIds.some(pid=>pid!=='player'&&!w.people[pid])||typeof p.phase!=='string'||!Number.isFinite(p.slots))return false;}
 for(const [id,c] of Object.entries(w.contracts)){if(id!==c.id||!w.agencies[c.agencyId]||!Number.isFinite(c.startDay)||!(c.endDay===null||Number.isFinite(c.endDay))||!Number.isFinite(c.reviewDay)||!Array.isArray(c.renewals))return false;}
 for(const [id,r] of Object.entries(s.relationships)){if(!w.people[id]||!['closeness','trust','rivalry'].every(k=>Number.isFinite(r[k])&&r[k]>=0&&r[k]<=100)||!Array.isArray(r.conflicts)||!Array.isArray(r.history)||r.history.some(h=>!historyById.get(h)?.personIds?.includes(id))||r.conflicts.some(c=>!Number.isFinite(c.day)||typeof c.reason!=='string'||(c.eventId!==null&&!historyIds.has(c.eventId))))return false;}
 if(s.agency&&!getAgency(s)||s.group&&!getGroup(s)||s.project&&!getProject(s)||s.contract&&!getContract(s))return false;
 if(['student','auditioning'].includes(s.stage)&&s.contract)return false;
 if(s.agency&&(!getContract(s)||getContract(s).agencyId!==s.agency))return false;
 if(!s.rivals.every(id=>!!w.people[id]&&w.people[id].agencyId===s.agency))return false;
 if(['trainee','debut_candidate'].includes(s.stage)&&(!getAgency(s)?.traineeIds.includes('player')||getProject(s)?.agencyId!==s.agency))return false;
 if(s.stage==='idol'&&(!getGroup(s)?.memberIds.includes('player')||getGroup(s)?.agencyId!==s.agency))return false;
 if(s.pending?.kind==='meet_trainee'&&(!w.people[s.pending.data?.personId]||w.people[s.pending.data.personId].agencyId!==s.agency||!s.rivals.includes(s.pending.data.personId)))return false;
 if(s.pending?.kind==='relationship_moment'&&!sharesWork(s,s.pending.data?.personId))return false;
 if(Object.values(s.relationships).some(r=>r.nextMomentDay!==undefined&&(!Number.isInteger(r.nextMomentDay)||r.nextMomentDay<0)))return false;
 if(Object.values(w.projects).some(p=>p.relationshipScore!==undefined&&(!Number.isFinite(p.relationshipScore)||Math.abs(p.relationshipScore)>10)))return false;
 if(s.queue.some(q=>['relationship-followup','relationship-moment','relationship-result'].includes(q.type)&&(!w.people[q.data.personId]||(q.type==='relationship-result'&&!['cooperate','compete'].includes(q.data.mode)))))return false;
 return true;
 }catch{return false;}
}

// A known person stays involved only while sharing a training project or a group.
export function sharesWork(s,id){
 const p=s.world.people[id];return !!p&&p.agencyId===s.agency&&(['trainee','debut_candidate'].includes(s.stage)?s.rivals.includes(id):s.stage==='idol'&&getGroup(s)?.memberIds.includes(id));
}
export function relationshipMoment(s,id,requestedTopic=null){
 const p=s.world.people[id],r=relationship(s,id),group=s.stage==='idol';
 const conflict=r.rivalry>=65||r.trust<12,pressure=!conflict&&r.closeness>=60;
 const fallback=conflict?'conflict':pressure?'boundary':'practice';
 const topic=['feedback','teamwork','routine','practice','conflict','boundary'].includes(requestedTopic)?requestedTopic:fallback;
 const topics={
  feedback:{title:`${p.name}와 평가 영상을 돌아보며`,body:`${p.name}가 지난 ${group?'무대':'연습'} 영상을 함께 보자고 제안했다. 각자 발견한 부족한 부분과 강점을 비교해 볼 기회다.`,joint:'서로의 피드백을 정리한다',solo:'내 약점부터 따로 연습한다',limit:'지금은 다음 일정에 집중한다'},
  teamwork:{title:`${p.name}와 동선을 맞추는 날`,body:`${p.name}가 ${group?'공연':'합동 평가'} 동선을 다시 맞춰 보자고 했다. 시간을 더 쓰면 호흡을 맞출 수 있지만 개인 연습은 줄어든다.`,joint:'합동 연습을 더 진행한다',solo:'각자의 구간을 먼저 점검한다',limit:'연습 시간을 나눠 쓰기로 한다'},
  routine:{title:`${p.name}와 연습실 일정 조율`,body:`${p.name}와 연습실 사용 시간이 겹쳤다. 불편한 다툼보다는 시간을 배분하고 서로의 계획을 맞출 수 있는 상황이다.`,joint:'시간을 함께 쓰며 도와준다',solo:'따로 연습할 시간을 확보한다',limit:'서로의 일정을 조정한다'},
  practice:{title:`${p.name}의 ${group?'무대':'합동 평가'} 제안`,body:`${p.name}가 함께 준비하자고 제안했다. 연습을 나누면 완성도를 높일 수 있지만 각자의 준비 시간이 부족해질 수 있다.`,joint:'함께 연습을 진행한다',solo:'단독으로 준비한다',limit:'이번에는 일정만 조율한다'},
  conflict:{title:`${p.name}와 평가 방식에 대한 이견`,body:`실제 평가 방식을 두고 ${p.name}와 의견이 달랐다. 관계에 경쟁심이 있지만 이견이 반드시 갈등으로 번질 필요는 없다.`,joint:'상대 의견을 듣고 함께 조율한다',solo:'내 방식으로 따로 준비한다',limit:'감정이 상하지 않게 거리를 둔다'},
  boundary:{title:`${p.name}와 연습 시간의 경계`,body:`${p.name}가 개인 연습 시간에도 함께하자고 한다. 친밀한 사이더라도 각자의 일정과 체력은 따로 챙겨야 한다.`,joint:'시간을 더 내어 함께한다',solo:'오늘은 각자 연습한다',limit:'서로의 경계를 정한다'}
 };
 const scenario=topics[topic];
 return {topic,title:scenario.title,body:scenario.body,choices:[
  {id:'cooperate',label:scenario.joint,hint:'신뢰 상승 · 체력 -3 · 14일 뒤 준비 결과'},
  {id:'compete',label:scenario.solo,hint:'개인 성과 기회 · 신뢰 -6 · 경쟁 +10 · 14일 뒤 준비 결과'},
  {id:'boundary',label:scenario.limit,hint:'멘탈 +2 · 과열된 경쟁 완화 · 추가 평가 생략'}
 ]};
}
export function chooseRelationshipMoment(s,id,choice,eventId){
 const r=relationship(s,id);r.lastAction=choice;r.nextMomentDay=s.day+180;
 // One major decision per person in a training project or debut group.
 r.momentProjectId=s.stage==='idol'?s.group:s.project;
 if(choice==='cooperate'){r.trust=clamp(r.trust+6);r.closeness=clamp(r.closeness+5);r.commitment='함께 준비 중';return {체력:-3};}
 if(choice==='compete'){r.trust=clamp(r.trust-6);r.rivalry=clamp(r.rivalry+10);r.commitment='같은 기회를 두고 경쟁 중';r.conflicts.push({day:s.day,eventId,reason:'평가 파트를 나누지 않고 단독으로 준비'});return {스타성:1,멘탈:-1};}
 r.trust=clamp(r.trust+2);r.rivalry=clamp(r.rivalry-8);r.commitment='개인 시간을 존중하기로 합의';return {멘탈:2};
}
export function resolveRelationshipWork(s,id,mode,roll=random(s)){
 const p=s.world.people[id],r=relationship(s,id),group=s.stage==='idol',joint=mode==='cooperate';
 const skill=(s.stats.보컬+s.stats.댄스+p.stats.보컬+p.stats.댄스)/4;
 const chance=joint?clamp(.25+skill*.004+r.trust*.004-r.rivalry*.003,.15,.85):clamp(.30+(s.stats.스타성-p.score)*.006,.15,.75);
 const ok=roll<chance,score=joint?(ok?4:-2):(ok?6:-4),project=getProject(s);
 if(project)project.relationshipScore=clamp((project.relationshipScore||0)+score,-10,10);
 if(joint){r.trust=clamp(r.trust+(ok?4:-4));p.score=clamp(p.score+(ok?2:1));}
 else {r.rivalry=clamp(r.rivalry+(ok?4:7));p.score=clamp(p.score+2);}
 r.commitment=joint?(ok?'합동 평가를 함께 통과한 동료':'합동 평가의 아쉬움을 함께 남김'):(ok?'단독 파트를 얻었지만 경쟁은 남음':'파트 경쟁에서 한 차례 밀림');
 const playerEffects=group?{popularity:ok?(joint?2:3):-1,체력:-1}:{댄스:joint&&ok?1:.3,멘탈:ok?1:-2};
 const text=`${p.name}와 ${joint?'함께 준비한':'각자 준비한'} ${group?'무대':'평가'}의 결과가 나왔다. ${joint?(ok?'서로 보완한 구간이 호평을 받았다. 신뢰가 쌓였지만 상대의 평가도 함께 올랐다.':'호흡이 맞지 않아 재연습이 필요했다. 가까운 사이여도 합동 준비가 늘 잘되지는 않았다.'):(ok?'원하던 단독 파트를 얻었다. 개인 성과는 커졌지만 파트를 놓친 상대와 경쟁은 더 깊어졌다.':'원하던 파트는 상대에게 돌아갔다. 단독 준비의 부담과 경쟁이 남았다.')} ${group?`활동 인기 ${playerEffects.popularity>0?'+':''}${playerEffects.popularity}.`:`이번 프로젝트 관계 평가 ${score>0?'+':''}${score}점 (누적 ${project?.relationshipScore||0}점).`}`;
 return {ok,text,playerEffects,chance,score};
}
