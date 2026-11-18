import {createState,validState} from '../js/state.js';
import {begin,advanceDay,choose} from '../js/engine.js';
import {entryEvidence,evidenceRequired} from '../js/student-life.js';
export function studentChoice(s,kind='dance',visibility='public',followRoute=true){
 const p=s.pending;if(!p)return;
 const route={dance:'festival',music:'busking',video:'sns'}[kind];
 const id=p.kind==='student_activity'?kind:p.kind==='student_showcase'?visibility:p.kind==='entry_offer'?(followRoute&&p.data.route===route?'apply':'decline'):({contract:'accept',meet_trainee:'befriend',relationship_moment:'boundary',final:'challenge',retry:'retry',career:'renew',comeback:'steady',health:'rest',late:'actor',acting:'support',production:'coach',future:'continue',student_future:'continue'})[p.kind]||p.choices[0].id;
 if(!choose(s,id))throw Error(`Choice rejected: ${p.kind}/${id}`);
}
export function auditStudentLife(seeds=100,longRun=true){
 const report={seeds,firstYearDays:365,scenarios:{},violations:{awayFamilyAtHome:0,snsWithoutSource:0,performanceWithoutSource:0,orphanCause:0,inactiveFollowup:0},longRun:null};
 function run(seed,kind,limit,followRoute=true){
  const s=begin(createState('학생 QA','랜덤',seed));let offers=0;
  for(let guard=0;s.day<limit&&s.stage!=='ended'&&guard<limit*3;guard++){
   if(s.pending){if(s.pending.kind==='entry_offer'&&evidenceRequired(s.pending.data.route)){offers++;if(!entryEvidence(s,s.pending.data.route,s.pending.data.sourceId)){report.violations[s.pending.data.route==='sns'?'snsWithoutSource':'performanceWithoutSource']++;}}studentChoice(s,kind,'public',followRoute);continue;}
   const start=s.history.length;advanceDay(s);for(const row of s.history.slice(start)){
    if(s.residence==='family_home'&&row.title==='집에서 온 연락')report.violations.awayFamilyAtHome++;
    if(row.causeIds?.some(id=>!s.history.some(h=>h.id===id&&h.id<row.id)))report.violations.orphanCause++;
    if(kind==='decline'&&['join','rehearsal','performance','post','exposure'].includes(row.studentAction))report.violations.inactiveFollowup++;
   }
  }
  if(s.day<limit&&s.stage!=='ended')throw Error('Student QA did not progress');
  if(!validState(s))throw Error('Invalid state in student QA');return {s,offers};
 }
 for(const kind of ['dance','music','video','decline']){
  const counts={plays:0,practiced:0,publicPerformances:0,publicPosts:0,sufficientExposure:0,sourceOffers:0,contracted:0,noIndustryContact:0};
  for(let seed=1;seed<=seeds;seed++){const {s,offers}=run(seed,kind,365);counts.plays++;counts.practiced+=!!s.studentLife.activity?.practiceEventIds.length;counts.publicPerformances+=Object.values(s.studentLife.performances).filter(p=>p.visibility==='public').length;counts.publicPosts+=Object.values(s.studentLife.posts).filter(p=>p.visibility==='public').length;counts.sufficientExposure+=Object.values(s.studentLife.posts).filter(p=>p.views>=200).length;counts.sourceOffers+=offers;counts.contracted+=!!s.agency;counts.noIndustryContact+=offers===0;}
  report.scenarios[kind]=counts;
 }
 if(longRun){const result={plays:seeds,targetDays:365*7,reachedSevenYears:0,endedEarlier:0,sourceOffers:0};for(let seed=1;seed<=seeds;seed++){const {s,offers}=run(seed,['dance','music','video'][(seed-1)%3],365*7);result.reachedSevenYears+=s.day===365*7;result.endedEarlier+=s.stage==='ended';result.sourceOffers+=offers;}report.longRun=result;}
 return report;
}
if(process.argv[1]?.endsWith('qa-student-life.mjs'))console.log(JSON.stringify(auditStudentLife(),null,2));
