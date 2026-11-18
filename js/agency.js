import {random} from './random.js';
export const priorities={training:'집중 교육',debut:'빠른 데뷔',creative:'창작 참여',support:'안정적인 지원'};
// Fictional balancing profiles, not industry statistics or a ranking by company size.
export const agencyProfiles={
 orbit:{strengths:'댄스·무대 피드백',expectation:'퍼포먼스와 합동 연습 적응',skills:['댄스','스타성'],training:{보컬:1.05,댄스:1.35,랩:.85,연기:.9,스타성:1.1},rivalGrowth:1.3,creative:'랩 지도는 기본 수준. 작품 결정권은 미확인',risk:'높은 평가 경쟁 · 빠른 선발 보장 없음'},
 dawn:{strengths:'보컬·랩 밀착 지도',expectation:'기량과 자기 주도적인 연습',skills:['보컬','랩'],training:{보컬:1.15,댄스:.9,랩:1.35,연기:.9,스타성:.9},rivalGrowth:.75,creative:'랩·창작 피드백 강점. 최종 콘셉트 권한은 미확인',risk:'제한된 자원 · 대형 홍보 지원 미확인'},
 onair:{strengths:'카메라 표현·연기 교육',expectation:'표현력과 콘텐츠 적응',skills:['연기','스타성'],training:{보컬:.95,댄스:.95,랩:.85,연기:1.35,스타성:1.3},rivalGrowth:1,creative:'표현·콘텐츠 교육 강점. 음악 창작 권한은 미확인',risk:'보컬·랩 교육은 상대적으로 제한적'},
 program:{strengths:'프로그램 무대·촬영 준비',expectation:'무대 경쟁력과 촬영 적응',skills:['댄스','스타성'],training:{보컬:1.05,댄스:1.15,랩:1,연기:1,스타성:1.25},rivalGrowth:1.45,creative:'프로그램 표현 교육. 제작 결정권은 미확인',risk:'기수별 경쟁 · 프로그램 이후 활동 보장 없음'}
};
export const getOffer=s=>s.world.offers?.[s.currentOfferId]||null;
export const offerOpen=(s,o=getOffer(s))=>!!o&&o.id===s.currentOfferId&&o.status==='open'&&s.day<=o.expiresAt&&!!s.world.agencies[o.agencyId]&&!!agencyProfiles[o.agencyId]&&typeof o.terms?.description==='string';
export const trainingFactor=(s,skill)=>agencyProfiles[s.agency]?.training[skill]??1;
export const competitionFactor=s=>agencyProfiles[s.agency]?.rivalGrowth??1;
export function canSignOffer(s,o=getOffer(s)){
 return offerOpen(s,o)&&o.consulted&&s.history.some(h=>h.id===o.consultationEventId&&h.offerId===o.id&&h.offerAction==='reviewed')&&s.history.some(h=>h.id===o.sourceEventId&&h.success===true&&h.route===o.routeId);
}
export function createOffer(s,routeId,sourceEventId,agencyId=null){
 const source=s.history.find(h=>h.id===sourceEventId&&h.success===true&&h.route===routeId);if(!source||s.stage!=='auditioning'||s.agency)throw Error('심사 합격 이력 없이 계약 제안을 만들 수 없습니다.');
 s.world.offers??={};if(Object.values(s.world.offers).some(o=>o.sourceEventId===sourceEventId))throw Error('같은 심사에 제안이 이미 있습니다.');const ids=['orbit','dawn','onair'];const selected=agencyId||(routeId==='survival'?'program':ids[Math.floor(random(s)*ids.length)]);
 if(!s.world.agencies[selected]||!agencyProfiles[selected]||(routeId==='survival')!==(selected==='program'))throw Error('경로에 맞는 실제 소속사가 필요합니다.');
 const id=`offer-${++s.world.serial}`;
 const o={id,agencyId:selected,routeId,sourceEventId,offerEventId:null,createdDay:s.day,expiresAt:s.day+30,status:'open',consulted:false,consultationEventId:null,holdCount:0,preference:s.careerPriority||'training',terms:{reviewDays:720,description:'교육·활동 일정 협의, 정기 재평가',uncertainties:['전체 계약기간·종료일 미확인','교육비·숙소비 분담 미확인','수익 배분·위약금 미확인','데뷔 확정일·실제 선발 미확인']}};
 s.world.offers[id]=o;s.currentOfferId=id;return o;
}
export function offerView(s,o=getOffer(s)){
 if(!o)return null;const a=s.world.agencies[o.agencyId],p=agencyProfiles[o.agencyId];if(!a||!p)return null;
 const projects=a.projectIds.map(id=>s.world.projects[id]).filter(v=>v?.status==='preparing');
 const preference=o.preference||'training';let fit;
 if(preference==='training')fit=`${p.strengths}에 적합한 교육을 제공한다. 강화 교육: ${Object.entries(p.training).filter(([,v])=>v>1.1).map(([k])=>k).join('·')||'기본 교육'}. 다른 분야의 교육 비중은 상대적으로 낮을 수 있다.`;
 if(preference==='debut')fit=`현재 등록된 준비 프로젝트 ${projects.length}개. ${p.rivalGrowth>1?'경쟁 동료의 평가 성장이 빠른 편이라 준비 부담이 크다.':'경쟁 평가의 성장 속도는 상대적으로 완만한 편이다.'} 실제 합류·데뷔 날짜는 미확인이라 빠른 데뷔를 보장할 근거는 부족하다.`;
 if(preference==='creative')fit=p.creative;
 if(preference==='support')fit=`현재 자원 ${Math.round(a.resources)}/100은 게임 내 가상 여력이다. ${p.risk}. 숙소·개인 비용 지원과 장기 재정 보장은 미확인이다.`;
 return {agency:a,profile:p,projects,preference,fit,assessment:p.skills.map(k=>`${k} ${Math.round(s.stats[k])}/100 · ${s.stats[k]>=55?'강점으로 설명 가능':'교육을 통해 보완할 부분'}`).join(' / '),teamwork:s.studentLife?.activity?.practiceEventIds.length?`합동 연습 ${s.studentLife.activity.practiceEventIds.length}회 경험은 있지만 회사의 팀워크 평가는 미확인`:'회사에서 확인한 팀워크 이력은 아직 미확인'};
}
export function contractDecision(s){
 const o=getOffer(s),v=offerView(s,o);if(!v)return null;
 return {title:`${v.agency.name}의 계약 제안`,body:`${v.agency.name} · ${v.agency.scale} · ${v.agency.tendency} 성향. 계약 조건을 검토한다. ${o.routeId==='survival'?'정규 연습생이 아닌 프로그램 후보 참가 계약이며, 최종 데뷔는 별도 평가다.':'아직 소속사 계약 전이며, 수락 전까지는 무소속이다.'}`,choices:[
 {id:'accept',label:'확인한 조건으로 계약 절차 진행',hint:o.consulted?'상담 기록을 확인한 동일 회사와 계약 · 데뷔 보장 없음':'먼저 보호자/동반자와 조건 확인을 마쳐야 합니다.',disabled:!o.consulted},
 {id:'consult',label:'보호자/동반자와 조건 확인',hint:o.consulted?'조건 확인을 이미 마쳤습니다.':'7일 동안 교육·비용·불확실성을 함께 검토 · 계약 자동 체결 안 됨',disabled:o.consulted},
 {id:'hold',label:'7일 더 생각하고 다시 검토',hint:o.holdCount?'보류는 한 번만 가능합니다.':'시간이 흐르며 같은 제안을 7일 뒤 재검토 · 기한 7일 연장',disabled:o.holdCount>0},
 {id:'decline',label:'제안을 거절하고 일상으로',hint:'계약하지 않음 · 이후 다른 기회 가능'}]};
}
export function ensureAgencyState(s){s.world.offers??={};s.currentOfferId??=null;s.careerPriority??='training';}
export function migrateAgencyState(s){
 if(s.world.offers!==undefined)return '';ensureAgencyState(s);
 for(const c of Object.values(s.world.contracts))if(!c.offerId)c.legacyAgencyContract=true;
 if(s.pending?.kind==='contract'){
  const source=[...s.history].reverse().find(h=>h.success===true&&h.route===s.entryRoute);if(!source)throw Error('이전 계약 제안의 심사 합격 이력을 확인할 수 없습니다. 원본 저장은 보존됩니다.');
  const o=createOffer(s,s.entryRoute,source.id);o.migrated=true;
  s.pending={...s.pending,...contractDecision(s),data:{...s.pending.data,offerId:o.id,agencyId:o.agencyId}};
  return '이전의 회사 미정 계약 제안을 실제 회사 정보가 있는 제안으로 복원했습니다. 조건을 확인한 뒤 결정해 주세요.';
 }
 return '';
}
export function validAgencyState(s){
 try{
  if(s.world.offers===undefined)return true; // v0.2.8 state is migrated by readSave, never signed directly.
  if(!priorities[s.careerPriority]||typeof s.world.offers!=='object'||Array.isArray(s.world.offers))return false;
  for(const [id,o] of Object.entries(s.world.offers)){
   if(id!==o.id||!s.world.agencies[o.agencyId]||!agencyProfiles[o.agencyId]||!['open','reviewing','held','signed','declined','expired'].includes(o.status)||!Number.isInteger(o.createdDay)||o.createdDay>s.day||!Number.isInteger(o.expiresAt)||o.expiresAt<o.createdDay||typeof o.consulted!=='boolean'||![0,1].includes(o.holdCount)||!priorities[o.preference]||!Number.isInteger(o.terms?.reviewDays)||o.terms.reviewDays<=0||!Array.isArray(o.terms.uncertainties))return false;
   if((o.routeId==='survival')!==(o.agencyId==='program')||!s.history.some(h=>h.id===o.sourceEventId&&h.success===true&&h.route===o.routeId))return false;
   if(o.consulted&&!s.history.some(h=>h.id===o.consultationEventId&&h.offerId===id&&h.offerAction==='reviewed'))return false;
   if(o.offerEventId!==null&&!s.history.some(h=>h.id===o.offerEventId&&h.offerId===id&&h.agencyId===o.agencyId))return false;
  }
  const current=getOffer(s);if(s.currentOfferId&&!current)return false;
  if(current&&current.status!=='signed'&&s.stage!=='auditioning')return false;
  for(const c of Object.values(s.world.contracts)){if(c.offerId){const o=s.world.offers[c.offerId];if(!o||o.status!=='signed'||o.agencyId!==c.agencyId||!o.consulted)return false;}else if(!c.legacyAgencyContract)return false;}
  if(s.pending?.kind==='contract'&&(!offerOpen(s,current)||s.pending.data.offerId!==current.id||s.pending.data.agencyId!==current.agencyId||s.entryRoute!==current.routeId))return false;
  if(s.queue.some(q=>['offer-review','offer-return'].includes(q.type)&&(!s.world.offers[q.data.offerId]||q.data.offerId!==s.currentOfferId)))return false;
  return true;
 }catch{return false;}
}
