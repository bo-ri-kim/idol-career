import {createState,stats,stages,save,readSave,clear,randomName} from './state.js';
import {begin,choose,nextDecision,setPolicy,finish,probability} from './engine.js';
import {createClock} from './clock.js';
import {config,policies,policyIds} from './config.js';
import {dateLabel} from './calendar.js';
import {entryRoutes} from './entry.js';
import {clubs} from './student-life.js';
import {getAgency,getGroup,getProject,getRivals,getContract,personAge} from './world.js';
let state=null,clock=null,frame=null,storageOK=true,visibleCount=80,lastLog='',lastPending='',deferredDecisionId='',importantOnly=false,lastSaved=0;
const root=document.querySelector('#app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Math.round(n).toLocaleString('ko-KR');
const header=()=>'<header><span class="brand">다음 무대<span class="accent">.</span></span><span class="version">IDOL LIFE / 0.2.8</span></header>';
function persist(){if(state)storageOK=save(state);}
function stopFrame(){if(frame!==null)cancelAnimationFrame(frame);frame=null;clock=null;}
function home(){stopFrame();root.className='home-view';state=null;const {state:stored,message}=readSave();root.innerHTML=header()+`<section class="intro"><span class="eyebrow">AN ORDINARY DAY, AN UNKNOWN FUTURE</span><h1>결정의 순간 사이에도,<br>당신의 삶은 흐른다.</h1><p>학교와 집, 친구와 취미로 채워지는 하루.<br>평범한 학생의 일상에서 어떤 기회를 만나게 될까요?</p></section>${message?`<p class="storage-warning" role="status">${esc(message)}</p>`:''}<section class="card"><h2>새로운 이야기</h2><form id="create"><label for="name">이름</label><div class="field-row"><input id="name" maxlength="16" placeholder="비워두면 랜덤 생성" autocomplete="off"><button type="button" id="random">랜덤</button></div><label for="gender">성별</label><select id="gender"><option>랜덤</option><option>남성</option><option>여성</option></select><p class="hint">13~18세 · 배경과 능력치 랜덤 · 성별에 따른 실력 차이 없음</p><button class="primary wide">나의 일상 시작하기 →</button></form></section><button id="continue" class="wide" ${stored?'':'disabled'}>${stored?`${esc(stored.name)}의 이야기 이어하기`:'저장된 학생 시작 버전의 이야기가 없습니다'}</button><button id="reset" class="subtle wide">저장 초기화</button><p class="hint">×1에서 현실 4분 ≈ 게임 1년. 소식을 읽으며 천천히 지켜보세요. 시작하면 자동으로 진행됩니다.<br>이 브라우저에 저장되며, 창을 닫거나 다른 탭을 보는 동안에는 시간이 흐르지 않습니다.</p>`;
 document.querySelector('#random').onclick=()=>document.querySelector('#name').value=randomName();
 document.querySelector('#create').onsubmit=e=>{e.preventDefault();const name=document.querySelector('#name').value,gender=document.querySelector('#gender').value;const start=()=>{state=begin(createState(name,gender));persist();openGame();};stored?confirmAction('새 이야기를 시작하면 현재 저장을 덮어씁니다.',start):start();};
 document.querySelector('#continue').onclick=()=>{state=readSave().state;if(state)openGame();};
 document.querySelector('#reset').onclick=()=>confirmAction('이 브라우저의 저장 데이터를 초기화할까요?',()=>{if(!clear())storageOK=false;home();});
}
function confirmAction(text,fn){const d=document.createElement('dialog');d.innerHTML=`<h2>선택을 확인해 주세요</h2><p>${text}</p><div class="dialog-actions"><button id="cancel">취소</button><button class="primary" id="ok">확인</button></div>`;document.body.append(d);d.showModal();d.querySelector('#cancel').onclick=()=>d.close();d.querySelector('#ok').onclick=()=>{d.close();fn();};d.onclose=()=>d.remove();return d;}
function statMarkup(){return stats.map(k=>`<div><div class="stat-head"><span>${k}</span><span data-stat="${k}"></span></div><div class="bar"><i data-bar="${k}"></i></div></div>`).join('');}
function openGame(){stopFrame();visibleCount=80;importantOnly=false;lastLog='';lastPending='';deferredDecisionId='';if(state.stage==='ended'){ending();return;}
 root.className='game-view';root.innerHTML=header()+`<section class="date-heading"><div><span class="eyebrow">LIFE IN MOTION</span><h1 id="date"></h1><p id="identity"></p></div><span id="stage" class="tag"></span></section><section class="time-controls" aria-label="시간 제어"><button id="play" class="primary"></button><div class="speed-buttons" aria-label="배속">${config.speeds.map(speed=>`<button data-speed="${speed}" aria-label="${speed}배속">×${speed}</button>`).join('')}</div><button id="skip">다음 결정까지 »</button><p id="clock-status" role="status"></p><div id="pending-decision" class="pending-decision" hidden><div><strong id="pending-title"></strong><p>결정 대기 중 · 지난 소식을 읽을 수 있습니다. 선택 전까지 시간은 멈춥니다.</p></div><button id="reopen-decision" class="primary">결정 다시 열기</button></div></section><dialog id="decision" class="decision-modal" aria-labelledby="decision-title"></dialog><div class="workspace"><section class="card log-card"><div class="section-heading"><h2>커리어 소식 <span class="meta">최신순</span></h2><div class="log-actions"><button id="latest" class="subtle" hidden>↑ 새 소식 보기</button><button id="filter" class="subtle" aria-pressed="false">주요 소식만</button></div></div><p class="hint">최신 소식이 위에 표시됩니다. 소식을 읽으려면 일시정지하세요. 이전 기록을 보는 동안에는 화면이 자동으로 이동하지 않습니다.</p><div id="log" class="log" tabindex="0" aria-label="최신순 커리어 타임라인"></div><button id="older" class="subtle wide">이전 소식 더 보기 ↓</button></section><aside class="sidebar"><section class="card"><div class="section-heading"><h2>나의 상태</h2><span id="age" class="meta"></span></div><p id="background" class="meta"></p><div class="metrics"><div class="metric">인기<strong id="popularity"></strong></div><div class="metric">최고 인기<strong id="peak"></strong></div><div class="metric"><span id="money-label">보유 현금</span><strong id="money"></strong></div></div><div class="stats">${statMarkup()}</div><p id="idol-status" class="hint"></p></section><section class="card"><h2>평소 활동 방침</h2><p class="hint">바꾸기 전까지 유지됩니다. 효과는 시간이 지나며 누적됩니다.</p><div id="policies" class="policies"></div><p id="policy-hint"></p></section><section class="card"><h2>소속과 다음 목표</h2><div id="environment"></div></section><section class="card"><h2>함께하는 인물</h2><div id="relationships"></div></section><p id="storage" class="notice"></p><div class="toolbar"><button id="home" class="subtle">저장하고 시작 화면</button><button id="retire" class="subtle">연예계 은퇴</button></div></aside></div>`;
 document.querySelector('#play').onclick=()=>{if(state.pending)return;state.playing=!state.playing;clock.reset(performance.now());persist();refresh();};
 root.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{clock.tick(performance.now());state.speed=Number(b.dataset.speed);persist();refresh();});
 document.querySelector('#reopen-decision').onclick=()=>{deferredDecisionId='';renderDecision();};
 document.querySelector('#skip').onclick=()=>{nextDecision(state);clock.reset(performance.now());persist();refresh();};
 document.querySelector('#filter').onclick=()=>{importantOnly=!importantOnly;lastLog='';refresh();};
 document.querySelector('#older').onclick=()=>{visibleCount+=80;lastLog='';refresh(true);};
 document.querySelector('#latest').onclick=()=>{const log=document.querySelector('#log');log.scrollTop=0;document.querySelector('#latest').hidden=true;};
 document.querySelector('#log').onscroll=()=>{const log=document.querySelector('#log');if(log.scrollTop<20)document.querySelector('#latest').hidden=true;};
 document.querySelector('#home').onclick=()=>{persist();home();};
 document.querySelector('#retire').onclick=()=>{const wasPlaying=state.playing;state.playing=false;clock.reset(performance.now());refresh();const student=['student','auditioning'].includes(state.stage);const d=confirmAction(student?'현재의 일상을 간직하고 이야기를 마무리할까요?':'연예계 활동을 마치고 커리어 결산으로 이동할까요?',()=>{finish(state,student?'지금의 일상에서 다른 꿈을 이어가기로 했다.':undefined);persist();refresh();});d.addEventListener('close',()=>{if(state&&state.stage!=='ended'){state.playing=wasPlaying&&!state.pending;clock.reset(performance.now());persist();refresh();}},{once:true});};
 clock=createClock(state);clock.visibility(!document.hidden,performance.now());refresh();frame=requestAnimationFrame(loop);
}
function loop(now){if(!state||!clock)return;const days=clock.tick(now);if(days){if(state.pending)persist();refresh();if(state.stage==='ended')return;}
 if(now-lastSaved>2000){persist();lastSaved=now;updateSaveStatus();}frame=requestAnimationFrame(loop);}
function updateSaveStatus(){const el=document.querySelector('#storage');if(el)el.textContent=storageOK?'✓ 이 브라우저에 자동 저장됨':'저장 공간에 접근할 수 없습니다. 현재 플레이는 계속할 수 있습니다.';}
function refresh(loadingOlder=false){
 if(state.stage==='ended'){stopFrame();persist();ending();return;}
 document.querySelector('#date').textContent=dateLabel(state.day);
 document.querySelector('#identity').textContent=`${state.name} · ${state.age}세 · ${state.gender}`;
 document.querySelector('#stage').textContent=stages[state.stage];
 document.querySelector('#play').textContent=state.pending?'결정 대기':state.playing?'Ⅱ 일시정지':'▶ 재생';document.querySelector('#play').disabled=!!state.pending;
 document.querySelector('#skip').disabled=!!state.pending;
 root.querySelectorAll('[data-speed]').forEach(b=>{b.setAttribute('aria-pressed',Number(b.dataset.speed)===state.speed);b.disabled=!!state.pending;});
 document.querySelector('#clock-status').textContent=state.pending?'선택할 때까지 시간이 멈춰 있습니다.':state.playing?`진행 중 · ×${state.speed} · 현실 ${240/state.speed}초 ≈ 게임 1년`:`일시정지 · ×${state.speed}`;
 renderDecision();renderLog(loadingOlder);
 document.querySelector('#age').textContent=`활동 ${Math.floor(state.day/365)}년 ${Math.floor(state.day%365/30.4375)}개월`;
 document.querySelector('#background').textContent=`${state.family} · 외모 ${state.appearance} · 아이돌 관심 ${Math.round(state.interest)}/100`;
 document.querySelector('#money-label').textContent=['student','auditioning'].includes(state.stage)?'보유 현금':'순자산';
 document.querySelector('#retire').textContent=['student','auditioning'].includes(state.stage)?'이야기 마무리':'연예계 은퇴';
 document.querySelector('#popularity').textContent=Math.round(state.popularity)+'/100';document.querySelector('#peak').textContent=Math.round(state.peak);document.querySelector('#money').textContent=money(state.money)+'만';
 stats.forEach(k=>{document.querySelector(`[data-stat="${k}"]`).textContent=state.stats[k].toFixed(1);document.querySelector(`[data-bar="${k}"]`).style.width=state.stats[k]+'%';});
 document.querySelector('#idol-status').textContent=state.idolRetired?'아이돌 활동 은퇴 · 연예계 커리어는 계속됩니다.':getGroup(state)?`${getGroup(state).name} 소속 · 그룹 활동 중`:state.stage==='solo'?'그룹을 떠나 솔로 아이돌로 활동 중':'';
 const policyRoot=document.querySelector('#policies'),ids=policyIds(state.stage);if(policyRoot.dataset.ids!==ids.join(',')){policyRoot.dataset.ids=ids.join(',');policyRoot.innerHTML=ids.map(id=>`<button data-policy="${id}">${policies[id].label}</button>`).join('');policyRoot.querySelectorAll('button').forEach(b=>b.onclick=()=>{clock.tick(performance.now());setPolicy(state,b.dataset.policy);persist();refresh();});}
 policyRoot.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.policy===state.policy);b.disabled=!!state.pending;});
 document.querySelector('#policy-hint').textContent=state.onBreakUntil>state.day?`회복·공백기 ${state.onBreakUntil-state.day}일 남음 · 이 기간에는 컨디션 관리가 우선 적용됩니다.`:policies[state.policy].hint;
 const project=getProject(state),agency=getAgency(state),contract=getContract(state),group=getGroup(state);
 document.querySelector('#environment').innerHTML=`<p><strong>${esc(agency?.name||'아직 소속사 없음')}</strong>${group?` · ${esc(group.name)}`:''}</p>${project?`<p>프로젝트 ${project.number}기 · ${esc(project.phase)}<br>예정 인원 ${project.slots}명 · 최근 종합 평가 ${state.reviewScore}점 · 관계 평가 ${(project.relationshipScore||0)>=0?'+':''}${project.relationshipScore||0}점</p>`:`<p>${state.stage==='student'?'학교·가족·친구와 일상을 보내는 중':state.stage==='auditioning'?`${entryRoutes[state.entryRoute]?.label||'진입'} 심사 결과를 기다리는 중 · 아직 계약 없음`:state.stage==='actor'?'작품과 배역을 준비하는 중':state.stage==='producer'?'후배의 무대와 제작 프로젝트를 준비하는 중':'다음 작품과 계약 일정을 준비하는 중'}</p>`}${state.rivals.length?`<div class="rivals">${getRivals(state).map(r=>`<span>${esc(r.name)} <strong>${Math.round(r.score)}</strong></span>`).join('')}</div><p class="hint">경쟁 연습생의 최근 평가 · 월말과 소속사 사건에 따라 변화</p>`:''}${agency?`<p class="hint">${esc(agency.scale)} · 자원 ${Math.round(agency.resources)} · ${esc(agency.tendency)} 성향<br>${esc(agency.management)}${contract?`<br>${esc(contract.kind)} 계약 · ${dateLabel(contract.startDay)}부터`:''}</p>`:''}<p class="hint">${['student','auditioning'].includes(state.stage)?`진입 심사 ${state.entryAttempts}회 · SNS 친숙도 ${Math.round(state.snsActivity)} · 학교 참여 ${Math.round(state.schoolParticipation)}`:`데뷔 도전 ${state.attempts}회 · 창작 경력 ${state.credits.toFixed(1)}`}</p>`;
 const life=state.studentLife,a=life?.activity,posts=Object.values(life?.posts||{}),performances=Object.values(life?.performances||{});
 document.querySelector('#environment').innerHTML+=`<p class="hint">거주: ${({family_home:'가족과 동거',dorm:'숙소 생활',independent:'독립 거주'})[state.residence]||'가족과 동거'}</p>${a?`<p><strong>${esc(clubs[a.kind].name)}</strong> · ${esc(({active:'연습 중',preparing:'발표 준비',completed:'활동 마침',closed:'진로 변화로 일정 종료'})[a.status])}<br>합동 연습 ${a.practiceEventIds.length}회</p>`:''}${posts.map(p=>`<p class="hint">영상: ${esc(p.title)} · ${({public:'공개',friends:'친구 전용',private:'비공개'})[p.visibility]}<br>${dateLabel(p.uploadedAt)} 게시 · ${p.exposureHistory.length?`게임 내 조회 ${p.views}회`:'외부 노출 집계 없음'}</p>`).join('')}${performances.map(p=>`<p class="hint">공연: ${esc(p.title)} · ${p.visibility==='public'?'공개':'친구 전용'}<br>${dateLabel(p.performedAt)} · 게임 내 외부 관객 ${p.observers}명</p>`).join('')}`;
 renderRelationships();updateSaveStatus();
}
function renderRelationships(){
 const area=document.querySelector('#relationships');
 const people=Object.values(state.world.people);if(!people.length){area.innerHTML='<p class="hint">학교와 일상을 지내며 앞으로 만날 인연들을 기다립니다.</p>';return;}
 // Rebuild only when the persisted people/relations change, keeping expanded details stable.
 const signature=JSON.stringify([people,state.relationships,Math.floor(state.day/365)]);if(area.dataset.signature===signature)return;
 const openIds=new Set(Array.from(area.querySelectorAll('details[open]')).map(d=>d.dataset.person));area.dataset.signature=signature;
 area.innerHTML=people.map(p=>{const r=state.relationships[p.id],history=p.history.map(id=>state.history.find(h=>h.id===id)).filter(Boolean).slice(-4).reverse();return `<details class="person" data-person="${p.id}" ${openIds.has(p.id)?'open':''}><summary>${esc(p.name)} <span class="meta">${personAge(state,p)}세 · ${esc(p.personality)}</span></summary><p class="hint">${esc(state.world.agencies[p.agencyId]?.name)} · ${p.groupId?esc(state.world.groups[p.groupId]?.name):p.status==='trainee'?'연습생':'활동 중'}</p><p class="relationship-values">친밀 ${Math.round(r.closeness)} · 신뢰 ${Math.round(r.trust)}<br>경쟁 ${Math.round(r.rivalry)} · 갈등 기록 ${r.conflicts.length}회</p>${r.commitment?`<p class="hint">${esc(r.commitment)}</p>`:''}${history.map(h=>`<p class="hint">${h.date} · ${esc(h.title)}</p>`).join('')||'<p class="hint">아직 함께한 주요 사건이 없습니다.</p>'}</details>`;}).join('');
}
function renderDecision(){const p=state.pending,key=p?.id||'',area=document.querySelector('#decision'),banner=document.querySelector('#pending-decision');
 const deferred=!!p&&deferredDecisionId===key;banner.hidden=!deferred;
 if(!p){deferredDecisionId='';lastPending='';if(area.open)area.close();area.innerHTML='';return;}
 if(deferred){document.querySelector('#pending-title').textContent=p.title;if(area.open)area.close();return;}
 if(lastPending===key){if(!area.open)area.showModal();return;}lastPending=key;
 let hint='';if(p.kind==='final')hint=`현재 데뷔 가능성 약 ${Math.round(probability(state,'debut')*100)}% · 마지막 준비 기간의 실력에 따라 달라집니다.`;
 area.innerHTML=`<div class="decision-card"><span class="eyebrow">IMPORTANT DECISION · 시간 정지</span><h2 id="decision-title">${esc(p.title)}</h2><p>${esc(p.body)}</p>${hint?`<p class="hint">${hint}</p>`:''}<div class="choices">${p.choices.map((c,i)=>`<button data-choice="${c.id}"><span class="choice-number">0${i+1}</span><span>${esc(c.label)}${c.hint?`<span class="hint">${esc(c.hint)}</span>`:''}</span></button>`).join('')}</div><button id="defer-decision" class="subtle wide">나중에 결정하기 · 지난 소식 보기</button><p class="hint">팝업을 내려도 선택할 때까지 시간은 멈춰 있습니다.</p></div>`;
 area.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{choose(state,b.dataset.choice,p.id);clock.reset(performance.now());persist();refresh();});
 area.querySelector('#defer-decision').onclick=()=>{deferredDecisionId=p.id;clock.reset(performance.now());persist();refresh();document.querySelector('#reopen-decision').focus();};
 area.oncancel=e=>e.preventDefault();
 if(!area.open)area.showModal();
}
function row(h){const changes=h.changes?Object.entries(h.changes).filter(([,v])=>Math.abs(v)>=.1).map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(' · '):'';return `<article data-log-id="${h.id}" class="log-row ${h.important?'important':''}"><div class="meta"><time>${h.date}</time><span>${({daily:'일상',agency:'소속사',career:'커리어',decision:'결정',monthly:'월말',system:'안내',relationship:'인물관계'})[h.category]||'소식'}</span></div><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p>${changes?`<p class="change-line">${changes}</p>`:''}</article>`;}
function renderLog(loadingOlder){
 const key=`${state.history.length}:${visibleCount}:${importantOnly}`;if(key===lastLog)return;
 const log=document.querySelector('#log'),oldTop=log.scrollTop,atTop=oldTop<20;
 const boxTop=log.getBoundingClientRect().top;
 // Anchor the first visible story, not the old scrollHeight: fresh news is prepended.
 const anchor=Array.from(log.children).find(el=>el.getBoundingClientRect().bottom>boxTop+1);
 const anchorId=anchor?.dataset.logId,anchorOffset=anchor?.getBoundingClientRect().top-boxTop;
 const rows=state.history.filter(h=>!importantOnly||h.important).slice().reverse();
 if(!atTop&&anchorId){const index=rows.findIndex(h=>String(h.id)===anchorId);if(index>=visibleCount)visibleCount=index+1;}
 log.innerHTML=rows.slice(0,visibleCount).map(row).join('')||'<p>아직 기록된 주요 소식이 없습니다.</p>';
 document.querySelector('#older').hidden=rows.length<=visibleCount;
 document.querySelector('#filter').setAttribute('aria-pressed',importantOnly);
 if(atTop&&!loadingOlder){log.scrollTop=0;document.querySelector('#latest').hidden=true;}
 else {
  log.scrollTop=oldTop;
  const restored=Array.from(log.children).find(el=>el.dataset.logId===anchorId);
  if(restored)log.scrollTop+=restored.getBoundingClientRect().top-log.getBoundingClientRect().top-anchorOffset;
  if(!loadingOlder)document.querySelector('#latest').hidden=false;
 }
 lastLog=`${state.history.length}:${visibleCount}:${importantOnly}`;
}

function ending(){
 root.className='ending-view';root.innerHTML=header()+`<section class="intro"><span class="eyebrow">THE CAREER YOU MADE</span><h1>${esc(state.name)},<br>당신이 남긴 장면들.</h1><p>${dateLabel(state.day)} · ${state.age}세 · ${esc(state.ending)}</p></section><section class="card"><h2>커리어 결산</h2><div class="metrics"><div class="metric">최고 인기<strong>${Math.round(state.peak)}</strong></div><div class="metric">순자산<strong>${money(state.money)}만</strong></div><div class="metric">데뷔 도전<strong>${state.attempts}회</strong></div></div><p>최전성기 ${dateLabel(state.peakDay)} · 창작 경력 ${state.credits.toFixed(1)}</p><h3>주요 성과</h3><p>${state.achievements.map(esc).join(' · ')||'나만의 커리어를 걸어온 시간'}</p><h3>에필로그</h3><p>${!state.agency&&!state.debuted?'친구와 가족, 좋아하는 것들을 알아가던 시간도 나만의 이야기로 남는다.':state.achievements.includes('글로벌 스타')?'멀리서도 당신의 무대를 기억하는 팬들이 남았다.':state.attempts&&!state.achievements.includes('첫 데뷔')?'데뷔의 문이 열리지 않은 뒤에도 다른 무대에서 쌓은 시간은 사라지지 않는다.':'화려한 순간과 조용한 계절이 모여 하나의 커리어가 됐다.'} 이제 삶의 다음 장이 시작된다.</p></section><section class="card"><h2>주요 커리어 타임라인</h2><div class="log ending-log">${state.history.filter(h=>h.important).map(row).join('')}</div></section><details><summary>전체 기록 ${state.history.length}개 보기</summary><div class="log ending-log">${state.history.map(row).join('')}</div></details><button id="home" class="primary wide">시작 화면 / 새로운 이야기</button>`;
 document.querySelector('#home').onclick=home;
}
document.addEventListener('visibilitychange',()=>{if(clock){clock.visibility(!document.hidden,performance.now());persist();}});
window.addEventListener('pagehide',persist);
home();
