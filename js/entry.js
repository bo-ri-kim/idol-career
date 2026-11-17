import {clamp,random} from './random.js';
import {dateAt} from './calendar.js';
// Route eligibility, discovery weight, screening delay and pass model are independent.
export const entryRoutes={
 audition:{label:'공개 오디션',title:'직접 지원해 볼까?',body:'모집 공고를 보았다. 학교 밖에서 노래 실력을 시험해 볼 수 있지만, 지원 여부는 내 선택이다.',minDay:35,weight:1.2,days:14,cost:1,when:s=>s.day>=180||s.interest>=20||s.stats.보컬>=35,score:s=>.16+s.stats.보컬*.008+s.interest*.001},
 street:{label:'길거리 캐스팅',title:'하굣길에 받은 명함',body:'캐스팅 담당자가 미팅을 제안했다. 회사의 신원과 연락처를 확인하고, 보호자와 함께 참석할지 결정한다.',minDay:40,weight:.8,days:10,cost:0,when:s=>s.appearance>=45,score:s=>.08+s.appearance*.005+s.stats.스타성*.004},
 sns:{label:'SNS 발탁',title:'취미 영상에 도착한 연락',body:'SNS에 올린 콘텐츠를 본 담당자가 연락했다. 일상의 기록이 심사 기회로 이어질 수 있다.',minDay:45,weight:1,days:18,cost:.5,when:s=>s.snsActivity>=10,score:s=>.12+s.stats.댄스*.005+s.stats.스타성*.003+Math.min(100,s.snsActivity)*.002},
 festival:{label:'학교 축제 발탁',title:'학교 축제 뒤의 제안',body:'친구들과 준비한 축제 무대를 본 관계자가 다시 만나 보고 싶다고 했다. 학교 밖 미팅에 응할지 생각해 본다.',minDay:60,weight:1.5,days:12,cost:0,when:s=>s.schoolParticipation>=45&&[4,5,9,10].includes(dateAt(s.day).getUTCMonth()),score:s=>.1+s.stats.보컬*.004+s.stats.댄스*.004+s.schoolParticipation*.002},
 referral:{label:'친구·지인 권유',title:'친구가 건넨 추천',body:'함께 취미 활동을 하던 친구가 기획사의 추천 심사를 알려줬다. 추천을 받아도 합격이 보장되지는 않는다.',minDay:40,weight:1.1,days:16,cost:.5,when:s=>s.social>=35,score:s=>.18+(s.stats.보컬+s.stats.댄스)*.003+s.social*.0015},
 survival:{label:'서바이벌 프로그램',title:'새 참가자를 찾는 프로그램',body:'신인 발굴 프로그램의 모집 안내가 올라왔다. 참가 신청 후 사전 심사를 거쳐야 한다.',minDay:75,weight:.65,days:28,cost:1.5,when:s=>s.age>=15&&s.interest>=45,score:s=>.05+(s.stats.보컬+s.stats.댄스+s.stats.스타성)*.0025},
};
export function eligibleRoutes(s){return Object.keys(entryRoutes).filter(id=>s.day>=entryRoutes[id].minDay&&entryRoutes[id].when(s));}
export function pickRoute(s){let ids=eligibleRoutes(s);if(ids.length>1)ids=ids.filter(id=>id!==s.lastEntryRoute);if(!ids.length)return null;const weights=ids.map(id=>entryRoutes[id].weight*(id==='audition'||id==='survival'?1+s.interest/100:1));let n=random(s)*weights.reduce((a,b)=>a+b,0);for(let i=0;i<ids.length;i++){n-=weights[i];if(n<0)return ids[i];}return ids.at(-1);}
export const entryProbability=(s,id)=>clamp(entryRoutes[id].score(s),.05,.9);
export function routeDecision(id){const r=entryRoutes[id];return {title:r.title,body:r.body,choices:[{id:'apply',label:`${r.label} 심사에 참여한다`,hint:`결과까지 약 ${r.days}일 · 준비·교통비 ${r.cost}만원${id==='survival'?' · 프로그램 선발 후 별도 계약 검토':''}`},{id:'decline',label:'지금은 학교생활을 이어간다',hint:'거절해도 다른 경로의 기회가 생길 수 있습니다.'}]};}
