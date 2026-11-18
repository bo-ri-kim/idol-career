import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,save,readSave,validState,KEY} from '../js/state.js';
import {begin,choose,nextDecision,advanceDay,setCareerPriority,finish} from '../js/engine.js';
import {getOffer,offerView,contractDecision,canSignOffer} from '../js/agency.js';
import {getContract,getAgency,getRivals,signContract} from '../js/world.js';
import {createClock} from '../js/clock.js';
import {config} from '../js/config.js';
export function findOffer(route='audition'){
 for(let seed=1;seed<=150;seed++){const s=begin(createState('회사 검증','여성',seed));for(let i=0;i<35&&s.day<700;i++){nextDecision(s);const p=s.pending;if(!p)break;if(p.kind==='contract')return s;
  const id=p.kind==='entry_offer'?(p.data.route===route?'apply':'decline'):p.kind==='student_activity'?(route==='sns'?'video':route==='festival'?'dance':route==='busking'?'music':'decline'):p.kind==='student_showcase'?'public':p.choices[0].id;choose(s,id);
 }}throw Error(`No offer ${route}`);
}
function accept(s){assert(choose(s,'consult'));assert(!s.agency);const o=getOffer(s),day=s.day;nextDecision(s);assert.equal(s.day,day+7);assert.equal(getOffer(s).id,o.id);assert(choose(s,'accept'));return s;}
const memory=()=>({data:{},setItem(k,v){this.data[k]=v;},getItem(k){return this.data[k]??null;}});

test('계약 전 실제 회사 고정: 모든 7개 진입 경로의 제안/계약/소속/기록 일치',()=>{
 for(const route of ['audition','street','sns','festival','busking','referral','survival']){const s=findOffer(route),o=getOffer(s),agencyId=o.agencyId;assert.equal(s.entryRoute,route);assert.equal(s.agency,null);assert.equal(s.pending.data.offerId,o.id);assert.equal(s.pending.data.agencyId,agencyId);assert(s.pending.title.includes(s.world.agencies[agencyId].name));assert(validState(s));assert.equal(agencyId==='program',route==='survival');accept(s);assert.equal(getContract(s).offerId,o.id);assert.equal(getContract(s).agencyId,agencyId);assert.equal(getAgency(s).id,agencyId);assert.equal(o.status,'signed');assert(s.history.some(h=>h.contractId===s.contract&&h.offerId===o.id&&h.agencyId===agencyId));assert.equal(s.stage,route==='survival'?'debut_candidate':'trainee');assert(validState(s));}
});
test('회사 정보·합격 이력·실제 조건 확인 없이 계약 불가',()=>{
 const student=begin(createState('학생','여성',1));assert.throws(()=>signContract(student,'audition'));
 const s=findOffer(),before=structuredClone(s);assert(!choose(s,'accept'));assert.deepEqual(s,before);assert(!canSignOffer(s));s.pending=null;assert.throws(()=>signContract(s,'audition'));assert.equal(s.agency,null);
});
test('거절은 무계약 학생 복귀, 보류는 실제 7일 경과 후 동일 회사 재검토',()=>{
 const s=findOffer(),o=getOffer(s),id=o.id,expiry=o.expiresAt,day=s.day;assert(choose(s,'hold'));assert.equal(o.status,'held');assert.equal(s.pending,null);assert.equal(s.stage,'auditioning');assert.equal(s.agency,null);nextDecision(s);assert.equal(s.day,day+7);assert.equal(getOffer(s).id,id);assert.equal(o.expiresAt,expiry+7);assert.equal(s.pending.choices.find(c=>c.id==='hold').disabled,true);assert(!choose(s,'hold'));assert(choose(s,'decline'));assert.equal(s.stage,'student');assert.equal(s.currentOfferId,null);assert.equal(o.status,'declined');assert.equal(s.contract,null);assert(validState(s));
});
test('기간이 지난 보류 제안은 계약 없이 종료하고 다시 기회 진행',()=>{
 const s=findOffer(),o=getOffer(s);choose(s,'hold');s.day=o.expiresAt+1;advanceDay(s);assert.equal(o.status,'expired');assert.equal(s.currentOfferId,null);assert.equal(s.stage,'student');assert(!s.contract);assert(validState(s));
});
test('선호별 적합성은 실제 강점과 기대를 설명하고 미지의 지원·데뷔는 미확인',()=>{
 const s=findOffer(),o=getOffer(s);for(const priority of ['training','debut','creative','support']){assert(setCareerPriority(s,priority));const v=offerView(s);assert.equal(o.preference,priority);assert(v.profile.strengths);assert(v.profile.expectation);assert(v.assessment);assert(v.teamwork.includes('미확인'));if(priority!=='training')assert(v.fit.includes('미확인'));assert.equal(v.projects.length,0);}assert(!setCareerPriority(s,'unknown'));assert.equal(s.agency,null);
});
test('같은 캐릭터·난수에서 두 회사의 실제 훈련 성장과 경쟁 평가 차이',()=>{
 const base=findOffer(),states=[];for(const agencyId of ['orbit','dawn']){const s=structuredClone(base),o=getOffer(s);o.agencyId=agencyId;s.pending.data.agencyId=agencyId;for(const h of s.history)if(h.offerId===o.id)h.agencyId=agencyId;Object.assign(s.pending,contractDecision(s));accept(s);s.queue=[];s.policy='balanced';const before={dance:s.stats.댄스,rap:s.stats.랩,rivals:getRivals(s).map(p=>p.score)};for(let i=0;i<31;i++)advanceDay(s);states.push({s,before});assert(validState(s));}
 const [a,b]=states;assert(a.s.stats.댄스-a.before.dance>b.s.stats.댄스-b.before.dance);assert(a.s.stats.랩-a.before.rap<b.s.stats.랩-b.before.rap);assert.notDeepEqual(getRivals(a.s).map(p=>p.score),getRivals(b.s).map(p=>p.score));
});
test('상담 중 저장 및 제안 복원: 회사·선호·예약·미래 유지',()=>{
 const a=findOffer(),store=memory();setCareerPriority(a,'creative');const id=getOffer(a).id;choose(a,'consult');save(a,store);const b=readSave(store).state;assert(b);assert.equal(getOffer(b).id,id);assert.equal(getOffer(b).preference,'creative');nextDecision(a);nextDecision(b);assert.deepEqual(a,b);choose(a,'accept');choose(b,'accept');assert.deepEqual(a,b);assert(validState(a));
});
test('구버전 대기 계약은 회사가 있는 제안으로 이관하고 이미 계약한 회사는 보존',()=>{
 const legacy=findOffer();legacy.history=legacy.history.filter(h=>!h.offerId);const ids=new Set(legacy.history.map(h=>h.id));for(const h of legacy.history){if(h.resultIds)h.resultIds=h.resultIds.filter(id=>ids.has(id));if(h.causeIds)h.causeIds=h.causeIds.filter(id=>ids.has(id));}legacy.pending={kind:'contract',id:'legacy-pending',day:legacy.day,title:'연습생 계약 제안',body:'계약 검토',data:{},choices:[{id:'accept',label:'수락'},{id:'decline',label:'거절'}]};delete legacy.world.offers;delete legacy.currentOfferId;delete legacy.careerPriority;const store=memory();save(legacy,store);const a=readSave(store),b=readSave(store);assert(a.state);assert.match(a.message,/회사/);assert.deepEqual(a.state,b.state);assert(getOffer(a.state));assert(!getOffer(a.state).consulted);assert(validState(a.state));
 const signed=accept(findOffer()),agency=signed.agency,contract=signed.contract;delete signed.world.offers;delete signed.currentOfferId;delete signed.careerPriority;delete signed.world.contracts[contract].offerId;save(signed,store);const restored=readSave(store).state;assert(restored);assert.equal(restored.agency,agency);assert.equal(restored.contract,contract);assert(restored.world.contracts[contract].legacyAgencyContract);assert(validState(restored));
});
test('새 저장의 끊긴 회사·제안·상담 ID 및 제안 이후 회사 변경은 거부',()=>{
 const base=findOffer();for(const mutate of [s=>getOffer(s).agencyId='missing',s=>s.pending.data.agencyId='other',s=>s.pending.data.offerId='missing',s=>getOffer(s).sourceEventId=-1,s=>{getOffer(s).consulted=true;getOffer(s).consultationEventId=-1;}]){const s=structuredClone(base);mutate(s);assert(!validState(s));assert(!choose(s,'accept'));}
});
test('상담/보류/수락 경로가 ×1·×8·스킵에서 같은 날짜·회사·상태로 귀결',()=>{
 const base=findOffer(),states=[];for(const speed of [1,8]){const s=structuredClone(base),clock=createClock(s);s.speed=speed;choose(s,'hold');let now=0;clock.tick(now);while(!s.pending){now+=config.dayMs/speed;clock.tick(now);}choose(s,'consult');clock.reset(now);while(!s.pending){now+=config.dayMs/speed;clock.tick(now);}choose(s,'accept');s.speed=1;s.remainder=0;states.push(s);}
 const skipped=structuredClone(base);choose(skipped,'hold');nextDecision(skipped);choose(skipped,'consult');nextDecision(skipped);choose(skipped,'accept');assert.deepEqual(states[0],states[1]);assert.deepEqual(states[0],skipped);
});
test('제안 검토 도중 자발적 종료도 유효한 저장 상태를 남김',()=>{
 const s=findOffer();choose(s,'hold');finish(s);assert(!s.currentOfferId);assert(!s.queue.length);assert(validState(s));
});
