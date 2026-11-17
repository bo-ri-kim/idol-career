import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,stats,save,readSave,KEY,validState} from '../js/state.js';
import {begin,advanceDay,choose,nextDecision,setPolicy,transition,finish,probability,schedule,scheduledAllowed} from '../js/engine.js';
import {config} from '../js/config.js';
import {createClock} from '../js/clock.js';
import {dateAt,dateLabel} from '../js/calendar.js';
import {entryRoutes,eligibleRoutes,entryProbability} from '../js/entry.js';
import {news,newsAllowed} from '../js/events.js';
const life=seed=>begin(createState('검증','랜덤',seed));
const runDays=(s,n)=>{for(let i=0;i<n&&!s.pending&&s.stage!=='ended';i++)advanceDay(s);};
function decide(s,preference={}){const p=s.pending;assert(p);return choose(s,p.choices.some(c=>c.id===preference[p.kind])?preference[p.kind]:p.choices[0].id,p.id);}
function trainee(seed=1){const s=life(seed);for(let i=0;i<100&&['student','auditioning'].includes(s.stage);i++){nextDecision(s);decide(s,{entry_offer:'apply',contract:'accept',student_future:'continue'});}assert(['trainee','debut_candidate'].includes(s.stage));return s;}
function group(seed=1){const s=trainee(seed);for(let i=0;i<100&&!['idol','ended'].includes(s.stage);i++){nextDecision(s);if(s.stage==='ended')break;decide(s,{final:'challenge',retry:'retry',health:'rest',late:'actor',acting:'support',future:'retire'});}assert.equal(s.stage,'idol');return s;}

test('자동 날짜 진행, 1일 단위, 일시정지와 재생',()=>{
 const s=life(1),clock=createClock(s);clock.tick(0);clock.tick(config.dayMs*3+.01);assert.equal(s.day,3);
 s.playing=false;const before=JSON.stringify(s);clock.tick(5000);assert.equal(JSON.stringify(s),before);
 s.playing=true;clock.reset(5000);clock.tick(5000+config.dayMs);assert.equal(s.day,4);
});
test('중요 결정에서 즉시 정지: 남은 프레임 시간으로 선택을 넘어가지 않는다',()=>{
 const s=life(1),clock=createClock(s);clock.tick(0);const due=s.queue.find(q=>q.type==='opportunity').due;clock.tick(config.dayMs*(due+1));assert.equal(s.day,due);assert.equal(s.pending.kind,'entry_offer');assert.equal(s.playing,false);
 const before=JSON.stringify(s);clock.tick(30000);assert.equal(JSON.stringify(s),before);
 const id=s.pending.id;assert(!choose(s,'invalid',id));assert(choose(s,'decline',id));assert(!choose(s,'decline',id));assert.equal(s.playing,true);assert.equal(s.day,due);assert(!s.pending);
});
test('배속과 프레임 분할에 관계없이 같은 80일을 동일한 난수로 계산',()=>{
 const results=[];
 for(const speed of config.speeds){const s=trainee(11);s.speed=speed;const clock=createClock(s);clock.tick(0);let now=0;const target=s.day+80;
 while(s.day<target&&!s.pending){now+=config.dayMs/speed;clock.tick(now);}s.speed=1;s.remainder=0;results.push(s);}
 for(const s of results.slice(1))assert.deepEqual(s,results[0]);
});
test('큰 프레임은 계산 예산 뒤에도 남은 일수를 보존한다',()=>{
 const s=life(1);s.queue=[];const clock=createClock(s);clock.tick(0);clock.tick(config.dayMs*300);assert.equal(s.day,120);clock.tick(config.dayMs*300);assert.equal(s.day,240);clock.tick(config.dayMs*300);assert.equal(s.day,300);
});
test('비활성 탭과 복귀, 장기간 부재는 건너뛰지 않는다',()=>{
 const s=life(2),c=createClock(s);c.tick(0);c.tick(100);c.visibility(false,100);const before=JSON.stringify(s);c.tick(999999);assert.equal(JSON.stringify(s),before);c.visibility(true,999999);c.tick(999999+config.dayMs);assert.equal(s.day,1);
});
test('다음 결정까지 중간 소식과 월말 정산 보존, 안전 상한',()=>{
 const a=trainee(8),b=structuredClone(a);const r=nextDecision(a);runDays(b,config.maxSkipDays);assert.deepEqual(a,b);assert.equal(r.reason,'decision');assert(a.history.some(h=>h.category==='monthly'));assert(a.history.some(h=>h.category==='daily'));
 const empty=life(1);empty.queue=[];const limit=nextDecision(empty,31);assert.equal(limit.reason,'limit');assert.equal(empty.playing,false);assert.equal(empty.day,31);
});
test('방침은 즉시 보상을 주지 않고 시간이 지나며 다른 성장으로 누적',()=>{
 const a=trainee(10);a.queue=[];const b=structuredClone(a),old={...a.stats};setPolicy(a,'vocal');setPolicy(b,'dance');assert.deepEqual(a.stats,old);runDays(a,90);runDays(b,90);assert(a.stats.보컬>b.stats.보컬+5);assert(b.stats.댄스>a.stats.댄스+5);assert.equal(a.policy,'vocal');
});
test('연결된 프로젝트와 경쟁 환경, 이전 훈련에 따른 평가 확률',()=>{
 const s=trainee(4),before=s.rivals.map(r=>r.score);nextDecision(s);assert.equal(s.pending.kind,'final');assert(s.project.candidate===true||s.project.candidate===false);
 const titles=s.history.map(h=>h.title);for(const title of ['새 그룹 프로젝트','데뷔조 후보 발표','데뷔조 인원 조정','최종 데뷔 평가'])assert(titles.includes(title));assert.equal(s.project.slots,3);assert.notDeepEqual(s.rivals.map(r=>r.score),before);
 const p=probability(s,'debut');s.stats.보컬=100;s.stats.댄스=100;s.stats.스타성=100;s.reviewScore=100;assert(probability(s,'debut')>p);
});
test('데뷔 실패가 즉시 종료되지 않고 재도전과 전향으로 이어진다',()=>{
 let failed=null,success=null;
 for(let seed=1;seed<30&&(!failed||!success);seed++){const s=trainee(seed);nextDecision(s);decide(s);nextDecision(s);if(s.stage==='idol')success=s;if(s.pending?.kind==='retry')failed=s;}
 assert(failed);assert(success);assert.equal(failed.stage,'trainee');const count=failed.attempts;decide(failed,{retry:'retry'});nextDecision(failed);assert.equal(failed.pending.kind,'final');assert.equal(failed.attempts,count);decide(failed,{final:'actor'});assert.equal(failed.stage,'actor');assert(!failed.idolRetired);nextDecision(failed);assert.equal(failed.pending.kind,'acting');
});
test('글로벌 스타 경로, 그룹 탈퇴·솔로·아이돌 은퇴·연예계 은퇴 구분',()=>{
 const s=group(2);s.pending=null;s.playing=true;
 // Exercise a real scheduled contract transition, with a strong established artist.
 for(const k of ['보컬','댄스','스타성'])s.stats[k]=95;
 let loops=0;while(s.pending?.kind!=='career'&&s.stage!=='ended'&&loops++<50){if(s.pending)decide(s,{comeback:'bold',health:'rest'});else nextDecision(s);}
 assert.equal(s.pending.kind,'career');decide(s,{career:'solo'});assert.equal(s.stage,'solo');assert.equal(s.group,null);assert(!s.idolRetired);
 loops=0;while(s.pending?.kind!=='career'&&loops++<50){if(s.pending)decide(s,{comeback:'bold',health:'rest'});else nextDecision(s);}
 assert(s.peak>=80);assert(s.achievements.includes('글로벌 스타'));decide(s,{career:'actor'});assert(s.idolRetired);assert.equal(s.stage,'actor');finish(s);assert.equal(s.stage,'ended');assert(!s.playing);assert.equal(s.queue.length,0);
});
test('전향 시 이전 활동의 후속 일정 제거, 불가능한 전환 차단',()=>{
 const s=group(2);assert.throws(()=>transition(s,'student'));transition(s,'actor');const count=s.history.filter(h=>h.title==='새 음반 발매').length;runDays(s,60);assert.equal(s.history.filter(h=>h.title==='새 음반 발매').length,count);assert(s.queue.every(q=>q.epoch===null||q.epoch===s.epoch));
});
test('저장 복원: 난수·예약·결정·시간을 복원해 같은 미래로 진행',()=>{
 const storage={data:{},setItem(k,v){this.data[k]=v;},getItem(k){return this.data[k]??null;}};
 const a=trainee(10);runDays(a,35);a.remainder=45;assert(save(a,storage));const b=readSave(storage).state;assert(b);nextDecision(a);nextDecision(b);assert.deepEqual(a,b);save(a,storage);const pending=readSave(storage).state;assert.deepEqual(pending.pending,a.pending);assert(!pending.playing);
 decide(a);decide(pending);nextDecision(a);nextDecision(pending);assert.deepEqual(a,pending);
 storage.data[KEY]='{broken';assert.equal(readSave(storage).state,null);storage.data={[KEY]:JSON.stringify({version:1})};assert.equal(readSave(storage).state,null);storage.data={'idol-career-v01':'{}'};assert.match(readSave(storage).message,/v0.1/);storage.data={'idol-career-v02':'{}'};assert.match(readSave(storage).message,/이전 v0.2/);
});
test('종료 저장, 손상 데이터, 날짜 윤년과 월말',()=>{
 const s=life(1);s.policy='vocal';finish(s);assert(validState(s));const bad=structuredClone(s);bad.stats.보컬=NaN;assert(!validState(bad));assert.equal(dateLabel(424),'2028.02.29');assert.equal(dateAt(365).getUTCFullYear(),2028);
});
test('100개 시드 완주: 유한 종료, 순서, 범위, 재시도와 모든 단계 접근',()=>{
 const reached=new Set();for(let seed=1;seed<=100;seed++){const s=life(seed);let steps=0;
 while(s.stage!=='ended'&&steps++<300){nextDecision(s);reached.add(s.stage);assert(validState(s));if(s.pending)decide(s,{entry_offer:'apply',contract:'accept',student_future:'continue',final:'challenge',retry:seed%2?'retry':'actor',career:seed%3===0?'solo':seed%3===1?'actor':'producer',comeback:seed%4===0?'break':'bold',acting:'lead',production:'invest',future:seed%5===0?'continue':'retire',health:'rest',late:'producer'});reached.add(s.stage);}
 assert.equal(s.stage,'ended');assert(s.age<=45);assert(validState(s));stats.forEach(k=>assert(s.stats[k]>=0&&s.stats[k]<=100));for(let i=1;i<s.history.length;i++)assert(s.history[i].day>=s.history[i-1].day);}
 for(const stage of ['trainee','debut_candidate','idol','solo','actor','producer','ended'])assert(reached.has(stage),stage);
});

test('불완전한 예약·결정 저장 데이터도 새 게임 안내로 복구',()=>{
 const s=trainee(7);const original=structuredClone(s);
 for(const mutate of [s=>s.queue[0].type='unknown',s=>s.queue[0].data=null,s=>s.rivals=null,s=>s.lastMonthStats=null,s=>s.agency={}]){const bad=structuredClone(original);mutate(bad);assert(!validState(bad));}
 nextDecision(s);const bad=structuredClone(s);bad.pending.kind='unknown';assert(!validState(bad));
});

function findRoute(route,wanted='passed'){
 for(let seed=1;seed<=150;seed++){
  const s=life(seed);
  for(let turn=0;turn<9;turn++){
   nextDecision(s);if(s.pending?.kind!=='entry_offer'){if(s.pending)decide(s,{student_future:'continue'});continue;}
   if(s.pending.data.route!==route){decide(s,{entry_offer:'decline'});continue;}
   const day=s.day;decide(s,{entry_offer:'apply'});assert.equal(s.stage,'auditioning');runDays(s,entryRoutes[route].days);
   if(s.routeHistory.some(h=>h.route===route&&h.day>=day&&h.result===wanted))return s;
   if(s.pending?.kind==='contract')decide(s,{contract:'decline'});
  }
 }
 throw Error(`경로를 찾지 못함: ${route} ${wanted}`);
}
test('신규 캐릭터 100명 모두 무소속 일반 학생, 평범한 첫 한 달',()=>{
 for(let seed=1;seed<=100;seed++){const s=life(seed);assert.equal(s.stage,'student');assert(s.age>=13&&s.age<=18);assert.equal(s.agency,null);assert.equal(s.group,null);assert.equal(s.debuted,false);assert.equal(s.training,0);assert.equal(s.policy,'school');assert(s.money<=30);runDays(s,30);assert(!s.pending);assert(s.history.every(h=>!['agency','career','decision'].includes(h.category)));assert(s.history.every(h=>!/(연습생|소속사|데뷔조|팬덤|연습실|동료)/.test(h.text)));assert(s.history.every(h=>h.stage==='student'));}
});
test('공개 오디션: 학생 → 심사 → 계약 선택 → 연습생',()=>{
 const s=findRoute('audition');assert.equal(s.stage,'auditioning');assert.equal(s.agency,null);assert.equal(s.pending.kind,'contract');decide(s,{contract:'accept'});assert.equal(s.stage,'trainee');assert(s.agency);assert(s.project);assert(!s.debuted);assert.equal(s.popularity,0);
});
test('길거리 캐스팅과 SNS는 별도 조건·지연 심사를 거쳐 연습생 진입',()=>{
 for(const route of ['street','sns']){const s=findRoute(route);assert.equal(s.entryRoute,route);assert.equal(s.pending.kind,'contract');assert.equal(s.agency,null);decide(s,{contract:'accept'});assert.equal(s.stage,'trainee');assert.equal(s.routeHistory.at(-1).result,'contracted');}
});
test('축제·지인·서바이벌도 실제 발생하며 서바이벌은 후보 과정으로 진입',()=>{
 for(const route of ['festival','referral','survival']){const s=findRoute(route);decide(s,{contract:'accept'});assert.equal(s.stage,route==='survival'?'debut_candidate':'trainee');assert(!s.debuted);assert(s.agency);assert.equal(s.group,null);}
});
test('초기 제안 거절 후 다른 경로를 만나고 계약 거절도 학생 복귀',()=>{
 const s=life(1);nextDecision(s);const first=s.pending.data.route;decide(s,{entry_offer:'decline'});assert.equal(s.stage,'student');nextDecision(s);assert.equal(s.pending.kind,'entry_offer');assert.notEqual(s.pending.data.route,first);
 const accepted=findRoute('street');decide(accepted,{contract:'decline'});assert.equal(accepted.stage,'student');assert.equal(accepted.agency,null);assert.equal(accepted.project,null);nextDecision(accepted);assert.equal(accepted.pending.kind,'entry_offer');
});
test('오디션 실패는 학생 복귀, 다른 지원과 재도전 가능',()=>{
 const s=findRoute('audition','failed');assert.equal(s.stage,'student');assert(!s.pending);assert.equal(s.agency,null);assert(s.queue.some(q=>q.type==='opportunity'));nextDecision(s);decide(s,{entry_offer:'apply'});assert.equal(s.stage,'auditioning');assert(s.entryAttempts>=2);
});
test('모든 이벤트 조건 감사: 무계약 평가·미데뷔 팬덤·무그룹 활동 차단',()=>{
 const s=life(1);
 for(const stage of ['student','auditioning']){s.stage=stage;for(const n of news.filter(n=>newsAllowed(s,n)))assert(!['agency','career'].includes(n.category));for(const type of ['project-announce','project-final','debut-result','comeback','career','release','reaction'])assert(!scheduledAllowed(s,type));}
 s.stage='trainee';assert(!newsAllowed(s,news.find(n=>n.id==='mentor')));s.stage='idol';s.debuted=true;assert(!newsAllowed(s,news.find(n=>n.id==='broadcast')));assert(!scheduledAllowed(s,'release'));
 const student=life(1);student.queue=[];schedule(student,'project-announce',1,{projectId:1});schedule(student,'release',1,{release:1});runDays(student,2);assert(student.history.every(h=>h.category!=='agency'&&h.title!=='새 음반 발매'));
});
test('진입 경로는 서로 다른 조건과 확률을 갖고 선택만으로 합격 보장 안 함',()=>{
 const s=life(1);s.day=1;assert.deepEqual(eligibleRoutes(s),[]);s.day=130;s.age=16;s.interest=80;s.appearance=80;s.snsActivity=20;s.schoolParticipation=60;s.social=70;assert.equal(eligibleRoutes(s).length,6);const rates=Object.keys(entryRoutes).map(id=>entryProbability(s,id));assert(new Set(rates).size>=5);assert(rates.every(p=>p>0&&p<1));
});
