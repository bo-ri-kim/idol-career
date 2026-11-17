import {clamp,random} from './random.js';
import {stats,stages} from './state.js';
import {config,policies,policyIds} from './config.js';
import {dateAt,START_YEAR,dateLabel} from './calendar.js';
import {news,decisions} from './events.js';
const active=s=>['group','solo','actor','producer'].includes(s.stage);
export function record(s,title,text,category='career',important=false,extra={}){
 const row={id:++s.serial,day:s.day,date:dateLabel(s.day),stage:s.stage,title,text,category,important,...extra};s.history.push(row);
 if(important)s.milestones.push({day:s.day,title,text,stage:s.stage});return row;
}
export function effects(s,values={}){for(const [k,v] of Object.entries(values)){if(stats.includes(k))s.stats[k]=clamp(s.stats[k]+v);else if(['money','popularity','credits'].includes(k))s[k]+=v;}s.money=Math.max(-5000,s.money);s.popularity=clamp(s.popularity);if(s.popularity>s.peak){s.peak=s.popularity;s.peakDay=s.day;}if(s.peak>=80&&!s.achievements.includes('글로벌 스타')&&['group','solo'].includes(s.stage)){s.achievements.push('글로벌 스타');record(s,'국경을 넘은 이름','해외 팬들의 호응이 이어지며 글로벌 스타로 기록됐다.','career',true);}}
export function schedule(s,type,delay,data={},scope='career'){
 const item={id:++s.serial,type,due:s.day+delay,data,epoch:scope==='career'?s.epoch:null};
 s.queue.push(item);s.queue.sort((a,b)=>a.due-b.due||a.id-b.id);return item;
}
export function begin(s){if(!s.history.length){record(s,'아직 쓰이지 않은 무대',`${s.name}, ${s.age}세. 오늘부터 나만의 커리어가 시작된다.`,'career',true);schedule(s,'opportunity',10);}return s;}
const transitions={entry:['trainee','actor','producer'],trainee:['debut','actor','producer'],debut:['trainee','group','actor','producer'],group:['solo','actor','producer'],solo:['actor','producer'],actor:['producer'],producer:[]};
export function transition(s,to){
 if(s.stage===to)return;
 if(!transitions[s.stage]?.includes(to))throw Error(`불가능한 전환: ${s.stage} → ${to}`);
 const from=s.stage;if(['group','solo'].includes(from)&&['actor','producer'].includes(to))s.idolRetired=true;
 if(from==='group'&&to!=='group')s.group=null;
 s.stage=to;s.epoch++;s.queue=s.queue.filter(q=>q.epoch===null);s.pending=null;
 if(!policyIds(to).includes(s.policy))s.policy=to==='trainee'?'balanced':'craft';
 if(!['trainee','debut'].includes(to)){s.project=null;s.rivals=[];}
 record(s,stages[to],`${stages[from]}에서 ${stages[to]}으로 커리어의 방향이 바뀌었다.`,'career',true);
}
function prompt(s,kind,data={}){
 if(s.pending||s.stage==='ended')return false;
 const d=decisions[kind];s.pending={...d,choices:d.choices.filter(c=>!(kind==='career'&&s.stage==='solo'&&c.id==='solo')).map(c=>({...c})),kind,data,id:`decision-${++s.serial}`,day:s.day};s.playing=false;s.remainder=0;
 record(s,d.title,'결정이 필요한 순간이다. 선택할 때까지 시간은 멈춘다.','decision',true);return true;
}
export function setPolicy(s,id){if(!policyIds(s.stage).includes(id)||s.stage==='ended'||s.pending)return false;s.policy=id;return true;}
export function finish(s,reason='스스로 선택한 새로운 일상'){
 if(s.stage==='ended')return;
 if(['group','solo'].includes(s.stage))s.idolRetired=true;
 s.stage='ended';if(!policyIds('ended').includes(s.policy))s.policy='balanced';s.playing=false;s.pending=null;s.queue=[];s.remainder=0;s.ending=reason;
 record(s,'나의 마지막 인사',reason,'career',true);
}
function startProject(s,delay=0){
 const id=++s.projectSerial;s.project={id,phase:'대기',announced:false,candidate:false,slots:4,score:0};s.support=false;
 for(const [type,days] of Object.entries(config.project)){if(type==='result')continue;schedule(s,`project-${type}`,days+delay,{projectId:id});}
}
function startCareer(s){
 if(['group','solo'].includes(s.stage)){schedule(s,'comeback',90);schedule(s,'career',720);}
 if(s.stage==='actor')schedule(s,'acting',75);
 if(s.stage==='producer')schedule(s,'production',75);
 if(['actor','producer'].includes(s.stage))schedule(s,'future',540);
}
function changeCareer(s,to){transition(s,to);s.onBreakUntil=null;startCareer(s);}
export function probability(s,type,mode=''){
 const p=config.probability;
 if(type==='audition'){const skill=mode==='sns'?(s.stats.댄스+s.stats.스타성)/2:mode==='street'?s.stats.스타성:s.stats.보컬;return clamp(p.auditionBase+skill*p.auditionWeight,p.min,p.max);}
 if(type==='debut'){const skill=(s.stats.보컬+s.stats.댄스+s.stats.스타성)/3;
 const rivals=s.rivals.length?s.rivals.reduce((a,r)=>a+r.score,0)/s.rivals.length:50;
 return clamp(p.debutBase+skill*p.skillWeight+Math.min(24,s.training)*p.trainingWeight+(s.reviewScore-rivals)*p.rivalWeight+((s.support||s.project?.candidate)?p.supportBonus:0),p.min,p.max);}
 return clamp(.12+s.stats.연기*.008+s.credits*.004,.05,.95);
}
export function choose(s,id,decisionId=s.pending?.id){
 const p=s.pending;if(!p||p.id!==decisionId||s.stage==='ended')return false;
 const c=p.choices.find(c=>c.id===id);if(!c)return false;
 s.pending=null;s.decisionCount++;
 record(s,p.title,`선택: ${c.label}`,'decision',true,{choice:id});
 switch(p.kind){
 case 'opportunity':
  if(id==='wait'){record(s,'이번에는 준비를 이어간다','다음 기회를 기다리며 현재의 연습 방침을 유지한다.');schedule(s,'opportunity',60);}
  else {effects(s,{money:id==='sns'?-15:id==='audition'?-10:0});schedule(s,'audition-result',14,{mode:id});record(s,'결과를 기다리는 동안','2주 뒤 결과가 전해진다. 그동안에도 연습과 일상은 이어진다.');}break;
 case 'contract':
  if(id==='accept'){transition(s,'trainee');s.agency={name:['오르빗 뮤직','새벽 엔터테인먼트','온에어 스튜디오'][Math.floor(random(s)*3)],changes:0};s.rivals=['연우','민서','준'].map(name=>({name,score:35+random(s)*25}));effects(s,{멘탈:5});startProject(s);record(s,'계약을 마치다',`${s.agency.name}에 합류했다. 경쟁 연습생들과 새 프로젝트를 준비한다.`,'agency',true);}
  else {schedule(s,'opportunity',60);record(s,'다른 문을 기다린다','계약을 거절했다. 다음 진입 기회는 두 달 뒤에 찾아온다.');}break;
 case 'final':
  if(id==='challenge'){const support=s.project.candidate;s.project.phase='최종 준비';transition(s,'debut');s.support=support;schedule(s,'debut-result',config.project.result,{projectId:s.project.id});record(s,'마지막 준비 기간','평가까지 30일. 지금까지의 훈련과 마지막 한 달의 컨디션이 결과에 반영된다.','agency',true);}
  else if(id==='delay'){startProject(s,60);effects(s,{멘탈:-2});record(s,'다음 기수로','이번 데뷔 평가는 미뤘다. 60일의 재정비 뒤 다음 프로젝트가 시작된다.');}
  else changeCareer(s,'actor');break;
 case 'retry':
  if(id==='retry'&&s.attempts<5&&s.age<27){startProject(s,30);record(s,'재도전을 선택하다','누적 실력은 남아 있다. 다음 프로젝트가 한 달 뒤부터 시작된다.','career',true);}
  else if(id==='retire')finish(s);
  else changeCareer(s,id==='producer'?'producer':'actor');break;
 case 'comeback':
  if(id==='break'){s.onBreakUntil=s.day+90;record(s,'공백기를 갖는다','90일 동안 활동량을 줄인다. 현재 방침과 별개로 회복에 집중한다.','career',true);schedule(s,'return',90);}
  else {effects(s,{money:id==='bold'?-50:-20});s.releaseSerial++;schedule(s,'release',30,{mode:id,release:s.releaseSerial});record(s,'다음 작품을 만들다','제작이 시작됐다. 발매와 첫 반응은 이후 소식으로 전해진다.');}break;
 case 'career':if(id==='renew'){effects(s,{money:90});schedule(s,'career',720);record(s,'활동 계약 갱신','현재 팀과 활동을 이어가기로 했다.','career',true);}else changeCareer(s,id);break;
 case 'acting':if(id==='producer')changeCareer(s,'producer');else{schedule(s,'acting-result',30,{mode:id});record(s,'대본을 준비하며','한 달 뒤 배역과 작품의 첫 결과가 전해진다.');}break;
 case 'production':effects(s,{money:id==='invest'?-80:0});schedule(s,'production-result',60,{mode:id});record(s,'제작 일정 시작','준비한 프로젝트의 결과는 두 달 뒤에 전해진다.');break;
 case 'future':if(id==='retire')finish(s);else if(id==='producer'&&s.stage!=='producer')changeCareer(s,'producer');else schedule(s,'future',540);break;
 case 'health':if(id==='retire')finish(s,'건강을 위해 스스로 선택한 은퇴');else{s.onBreakUntil=s.day+90;s.healthWarning=true;effects(s,{money:-30});schedule(s,'health-return',90);}break;
 case 'late':if(id==='retire')finish(s);else changeCareer(s,id);break;
 }
 if(s.stage!=='ended')s.playing=true;s.remainder=0;return true;
}
function dueEvent(s,q){
 const {type,data}=q;
 if(type.startsWith('project-')&&s.project?.id!==data.projectId)return;
 switch(type){
 case 'opportunity':if(s.stage==='entry')prompt(s,'opportunity');break;
 case 'audition-result':{
  const ok=random(s)<probability(s,'audition',data.mode);
  record(s,'오디션 결과',ok?'담당자가 가능성을 인정했다. 연습생 계약 조건을 검토할 수 있게 됐다.':'이번 명단에는 이름이 없었다. 연습을 이어가며 다음 기회를 기다린다.','career',true);
  if(ok)prompt(s,'contract');else{effects(s,{멘탈:-3});schedule(s,'opportunity',60);}break;}
 case 'project-announce':s.project.announced=true;s.project.phase='프로젝트 발표';record(s,'새 그룹 프로젝트',`${s.agency.name}이 신규 그룹 데뷔 프로젝트를 발표했다. 선발 예정 인원은 ${s.project.slots}명이다.`,'agency',true);break;
 case 'project-candidates':{
  const score=(s.reviewScore+s.stats.스타성)/2;s.project.candidate=score>=s.rivals.reduce((a,r)=>a+r.score,0)/Math.max(1,s.rivals.length)-5;s.project.phase='후보 선발';s.project.score=score;
  record(s,'데뷔조 후보 발표',s.project.candidate?'지난 평가와 연습 성과를 바탕으로 데뷔조 후보에 이름을 올렸다.':'이번 후보 명단에는 들지 못했다. 최종 평가까지 실력을 보완할 기회는 남아 있다.','agency',true);break;}
 case 'project-cut':s.project.slots=3;s.project.phase='팀 구성 조정';s.agency.changes++;s.rivals.forEach(r=>r.score=clamp(r.score+random(s)*5));record(s,'데뷔조 인원 조정','앞서 발표한 프로젝트의 인원이 4명에서 3명으로 줄었다. 경쟁 연습생들의 평가도 다시 반영된다.','agency',true);break;
 case 'project-final':s.project.phase='최종 평가';prompt(s,'final');break;
 case 'debut-result':{
  const ok=random(s)<probability(s,'debut');s.attempts++;
  if(ok){transition(s,'group');s.group=`프로젝트 ${s.projectSerial}기`;s.achievements.push('첫 데뷔');effects(s,{popularity:15,money:50,멘탈:8});record(s,'처음 팬을 만난 날',`${s.group}의 데뷔 무대가 열렸다. 연습실에서 보낸 시간이 첫 활동으로 이어졌다.`,'career',true);startCareer(s);}
  else {transition(s,'trainee');effects(s,{멘탈:-6});s.project={id:s.projectSerial,phase:'평가 탈락 · 재정비',slots:3,candidate:false};record(s,'최종 평가 결과','이번 데뷔조에서는 제외됐다. 실력과 경력은 남고, 다음 방향을 고를 시간도 남아 있다.','career',true);schedule(s,'retry',30);}break;}
 case 'retry':prompt(s,s.attempts>=5||s.age>=27?'late':'retry');break;
 case 'comeback':prompt(s,'comeback');break;
 case 'career':prompt(s,'career');break;
 case 'release':record(s,'새 음반 발매',`${data.release}번째 활동 음반이 공개됐다. 첫 반응은 2주간의 활동 뒤에 집계된다.`,'career',true);schedule(s,'reaction',14,data);break;
 case 'reaction':{
  const p=clamp(.12+(s.stats.스타성+s.stats.보컬+s.stats.댄스)/3*.008+(s.policy==='promotion'?.08:0),.05,.95),ok=random(s)<p;
  effects(s,{popularity:ok?(data.mode==='bold'?18:9):-2,money:ok?150:15,credits:1,체력:-2});
  record(s,'발매 후 첫 반응',ok?'앞서 발매한 작품의 무대가 퍼지며 새 팬들이 유입됐다.':'앞서 발매한 작품의 반응은 조용했다. 작은 무대 경험을 남기고 다음 활동을 준비한다.','career',true,{success:ok});schedule(s,'comeback',105);break;}
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
 if(['trainee','debut'].includes(s.stage)){s.training++;s.rivals.forEach(r=>r.score=clamp(r.score+random(s)*3-1));}
 const income=active(s)?(s.onBreakUntil?8:20+s.popularity*.7):0;
 const expense=active(s)?12:s.family==='빠듯한 살림'?10:s.family==='여유 있는 가정'?2:5;
 const net=Math.round(income-expense);effects(s,{money:net,popularity:active(s)&&s.policy==='promotion'?.5:0});
 const training=['entry','trainee','debut'].includes(s.stage);const title=training?'월말 훈련 평가':'월별 활동 정산';
 record(s,title,`${policies[s.policy].label} 방침으로 한 달을 보냈다. ${training?`종합 평가 ${s.reviewScore}점. `:''}이번 달 수입 ${Math.round(income)}만 · 지출 ${expense}만 · 순자산 ${net>=0?'+':''}${net}만원.`,'monthly',false,{changes:delta,moneyChange:net});s.lastMonthStats={...s.stats};
 if(s.credits>=8&&!s.achievements.includes('창작의 발자취'))s.achievements.push('창작의 발자취');
}
export function advanceDay(s){
 if(!s.playing||s.pending||s.stage==='ended')return false;
 const previous=dateAt(s.day);s.day++;const date=dateAt(s.day);s.age=s.startAge+date.getUTCFullYear()-START_YEAR;
 const resting=s.onBreakUntil>s.day||s.policy==='rest';const p=policies[resting?'rest':s.policy];
 const change=Object.fromEntries(Object.entries(p.growth).map(([k,v])=>[k,v/30.4375]));change.체력=-p.fatigue/30.4375;change.멘탈=(resting?2:.1)/30.4375;
 if(s.policy==='promotion'&&!resting&&active(s))change.popularity=.8/30.4375;
 if(resting&&active(s))change.popularity=-.6/30.4375;
 effects(s,change);
 if(date.getUTCMonth()!==previous.getUTCMonth())monthly(s);
 if(s.age>=config.maxAge){finish(s,'오랜 커리어를 마무리하고 삶의 다음 장으로');return true;}
 if((s.stats.체력<15||s.stats.멘탈<15)&&!s.healthWarning){prompt(s,'health');return true;}
 if(['entry','trainee','debut'].includes(s.stage)&&s.age>=27){s.queue=[];prompt(s,'late');return true;}
 // Every due item is processed in order, stopping immediately at the first decision.
 while(s.queue.length&&s.queue[0].due<=s.day&&!s.pending){const q=s.queue.shift();if(q.epoch===null||q.epoch===s.epoch)dueEvent(s,q);}
 if(s.pending)return true;
 const rate=config.newsPerMonth[resting?'rest':s.stage]??2;
 if(random(s)<(rate-1)/30.4375){const pool=news.filter(n=>n.stages.includes(s.stage)&&(s.seen[n.id]===undefined||s.day-s.seen[n.id]>=35));
  if(pool.length){const n=pool[Math.floor(random(s)*pool.length)];s.seen[n.id]=s.day;effects(s,n.effects);
   if(n.environment==='rival'&&s.rivals.length){const r=s.rivals[Math.floor(random(s)*s.rivals.length)];r.score=clamp(r.score+3);s.agency.changes++;record(s,n.title,`${n.text} ${r.name}의 최근 평가도 상승했다.`,n.category);}
   else record(s,n.title,n.text,n.category);
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
