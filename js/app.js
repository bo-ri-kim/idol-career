import {createState,stats,stages,save,readSave,clear,randomName} from './state.js';
import {begin,choose,nextDecision,setPolicy,finish,probability} from './engine.js';
import {createClock} from './clock.js';
import {config,policies,policyIds} from './config.js';
import {dateLabel} from './calendar.js';
let state=null,clock=null,frame=null,storageOK=true,visibleCount=80,lastLog='',lastPending='',importantOnly=false,lastSaved=0;
const root=document.querySelector('#app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Math.round(n).toLocaleString('ko-KR');
const header=()=>'<header><span class="brand">다음 무대<span class="accent">.</span></span><span class="version">IDOL LIFE / 0.2</span></header>';
function persist(){if(state)storageOK=save(state);}
function stopFrame(){if(frame!==null)cancelAnimationFrame(frame);frame=null;clock=null;}
function home(){stopFrame();state=null;const {state:stored,message}=readSave();root.innerHTML=header()+`<section class="intro"><span class="eyebrow">LIFE BETWEEN THE SPOTLIGHTS</span><h1>결정의 순간 사이에도,<br>당신의 삶은 흐른다.</h1><p>연습실의 하루, 소속사의 소식, 첫 무대의 반응.<br>흘러가는 커리어를 지켜보고 중요한 순간에 선택하세요.</p></section>${message?`<p class="storage-warning" role="status">${esc(message)}</p>`:''}<section class="card"><h2>새로운 이야기</h2><form id="create"><label for="name">활동 이름</label><div class="field-row"><input id="name" maxlength="16" placeholder="비워두면 랜덤 생성" autocomplete="off"><button type="button" id="random">랜덤</button></div><label for="gender">성별</label><select id="gender"><option>랜덤</option><option>남성</option><option>여성</option></select><p class="hint">13~18세 · 배경과 능력치 랜덤 · 성별에 따른 실력 차이 없음</p><button class="primary wide">나의 커리어 시작하기 →</button></form></section><button id="continue" class="wide" ${stored?'':'disabled'}>${stored?`${esc(stored.name)}의 이야기 이어하기`:'저장된 v0.2 이야기가 없습니다'}</button><button id="reset" class="subtle wide">저장 초기화</button><p class="hint">×1에서 현실 60초 ≈ 게임 1년. 시작하면 자동으로 진행됩니다.<br>이 브라우저에 저장되며, 창을 닫거나 다른 탭을 보는 동안에는 시간이 흐르지 않습니다.</p>`;
 document.querySelector('#random').onclick=()=>document.querySelector('#name').value=randomName();
 document.querySelector('#create').onsubmit=e=>{e.preventDefault();const name=document.querySelector('#name').value,gender=document.querySelector('#gender').value;const start=()=>{state=begin(createState(name,gender));persist();openGame();};stored?confirmAction('새 이야기를 시작하면 현재 저장을 덮어씁니다.',start):start();};
 document.querySelector('#continue').onclick=()=>{state=readSave().state;if(state)openGame();};
 document.querySelector('#reset').onclick=()=>confirmAction('이 브라우저의 저장 데이터를 초기화할까요?',()=>{if(!clear())storageOK=false;home();});
}
function confirmAction(text,fn){const d=document.createElement('dialog');d.innerHTML=`<h2>선택을 확인해 주세요</h2><p>${text}</p><div class="dialog-actions"><button id="cancel">취소</button><button class="primary" id="ok">확인</button></div>`;document.body.append(d);d.showModal();d.querySelector('#cancel').onclick=()=>d.close();d.querySelector('#ok').onclick=()=>{d.close();fn();};d.onclose=()=>d.remove();}
function statMarkup(){return stats.map(k=>`<div><div class="stat-head"><span>${k}</span><span data-stat="${k}"></span></div><div class="bar"><i data-bar="${k}"></i></div></div>`).join('');}
function openGame(){stopFrame();visibleCount=80;importantOnly=false;lastLog='';lastPending='';if(state.stage==='ended'){ending();return;}
 root.innerHTML=header()+`<section class="date-heading"><div><span class="eyebrow">CAREER IN MOTION</span><h1 id="date"></h1><p id="identity"></p></div><span id="stage" class="tag"></span></section><section class="time-controls" aria-label="시간 제어"><button id="play" class="primary"></button><div class="speed-buttons" aria-label="배속">${config.speeds.map(speed=>`<button data-speed="${speed}" aria-label="${speed}배속">×${speed}</button>`).join('')}</div><button id="skip">다음 결정까지 »</button><p id="clock-status" role="status"></p></section><section id="decision" aria-live="polite"></section><section class="card log-card"><div class="section-heading"><h2>커리어 소식</h2><button id="filter" class="subtle" aria-pressed="false">주요 소식만</button></div><p class="hint">일상은 흐르고, 결정이 필요한 순간에는 멈춥니다.</p><button id="older" class="subtle wide">이전 소식 더 보기</button><div id="log" class="log" tabindex="0" aria-label="날짜순 커리어 타임라인"></div><button id="latest" class="wide subtle" hidden>새 소식 · 최신 위치로 ↓</button></section><section class="card"><div class="section-heading"><h2>나의 상태</h2><span id="age" class="meta"></span></div><p id="background" class="meta"></p><div class="metrics"><div class="metric">인기<strong id="popularity"></strong></div><div class="metric">최고 인기<strong id="peak"></strong></div><div class="metric">순자산<strong id="money"></strong></div></div><div class="stats">${statMarkup()}</div><p id="idol-status" class="hint"></p></section><section class="card"><h2>평소 활동 방침</h2><p class="hint">바꾸기 전까지 유지됩니다. 효과는 시간이 지나며 누적됩니다.</p><div id="policies" class="policies"></div><p id="policy-hint"></p></section><section class="card"><h2>소속과 다음 목표</h2><div id="environment"></div></section><p id="storage" class="notice"></p><div class="toolbar"><button id="home" class="subtle">저장하고 시작 화면</button><button id="retire" class="subtle">연예계 은퇴</button></div>`;
 document.querySelector('#play').onclick=()=>{if(state.pending)return;state.playing=!state.playing;clock.reset(performance.now());persist();refresh();};
 root.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{clock.tick(performance.now());state.speed=Number(b.dataset.speed);persist();refresh();});
 document.querySelector('#skip').onclick=()=>{nextDecision(state);clock.reset(performance.now());persist();refresh();};
 document.querySelector('#filter').onclick=()=>{importantOnly=!importantOnly;lastLog='';refresh();};
 document.querySelector('#older').onclick=()=>{visibleCount+=80;lastLog='';refresh(true);};
 document.querySelector('#latest').onclick=()=>{const log=document.querySelector('#log');log.scrollTop=log.scrollHeight;document.querySelector('#latest').hidden=true;};
 document.querySelector('#log').onscroll=()=>{const log=document.querySelector('#log');if(log.scrollHeight-log.scrollTop-log.clientHeight<30)document.querySelector('#latest').hidden=true;};
 document.querySelector('#home').onclick=()=>{persist();home();};
 document.querySelector('#retire').onclick=()=>{const wasPlaying=state.playing;state.playing=false;clock.reset(performance.now());refresh();confirmAction('연예계 활동을 마치고 커리어 결산으로 이동할까요?',()=>{finish(state);persist();refresh();});const d=document.querySelector('dialog');d.addEventListener('close',()=>{if(state&&state.stage!=='ended'){state.playing=wasPlaying&&!state.pending;clock.reset(performance.now());persist();refresh();}},{once:true});};
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
 document.querySelector('#clock-status').textContent=state.pending?'선택할 때까지 시간이 멈춰 있습니다.':state.playing?`진행 중 · ×${state.speed} · 현실 ${60/state.speed}초 ≈ 게임 1년`:`일시정지 · ×${state.speed}`;
 renderDecision();renderLog(loadingOlder);
 document.querySelector('#age').textContent=`활동 ${Math.floor(state.day/365)}년 ${Math.floor(state.day%365/30.4375)}개월`;
 document.querySelector('#background').textContent=`${state.family} · 외모 ${state.appearance}`;
 document.querySelector('#popularity').textContent=Math.round(state.popularity)+'/100';document.querySelector('#peak').textContent=Math.round(state.peak);document.querySelector('#money').textContent=money(state.money)+'만';
 stats.forEach(k=>{document.querySelector(`[data-stat="${k}"]`).textContent=state.stats[k].toFixed(1);document.querySelector(`[data-bar="${k}"]`).style.width=state.stats[k]+'%';});
 document.querySelector('#idol-status').textContent=state.idolRetired?'아이돌 활동 은퇴 · 연예계 커리어는 계속됩니다.':state.group?`${state.group} 소속 · 그룹 활동 중`:state.stage==='solo'?'그룹을 떠나 솔로 아이돌로 활동 중':'';
 const policyRoot=document.querySelector('#policies'),ids=policyIds(state.stage);if(policyRoot.dataset.ids!==ids.join(',')){policyRoot.dataset.ids=ids.join(',');policyRoot.innerHTML=ids.map(id=>`<button data-policy="${id}">${policies[id].label}</button>`).join('');policyRoot.querySelectorAll('button').forEach(b=>b.onclick=()=>{clock.tick(performance.now());setPolicy(state,b.dataset.policy);persist();refresh();});}
 policyRoot.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.policy===state.policy);b.disabled=!!state.pending;});
 document.querySelector('#policy-hint').textContent=state.onBreakUntil>state.day?`회복·공백기 ${state.onBreakUntil-state.day}일 남음 · 이 기간에는 컨디션 관리가 우선 적용됩니다.`:policies[state.policy].hint;
 const project=state.project;
 document.querySelector('#environment').innerHTML=`<p><strong>${esc(state.agency?.name||'아직 소속사 없음')}</strong>${state.group?` · ${esc(state.group)}`:''}</p>${project?`<p>프로젝트 ${project.id}기 · ${esc(project.phase)}<br>예정 인원 ${project.slots}명 · 최근 종합 평가 ${state.reviewScore}점</p>`:`<p>${state.stage==='entry'?'첫 진입 기회를 기다리며 실력을 쌓는 중':state.stage==='actor'?'작품과 배역을 준비하는 중':state.stage==='producer'?'후배의 무대와 제작 프로젝트를 준비하는 중':'다음 작품과 계약 일정을 준비하는 중'}</p>`}${state.rivals.length?`<div class="rivals">${state.rivals.map(r=>`<span>${esc(r.name)} <strong>${Math.round(r.score)}</strong></span>`).join('')}</div><p class="hint">경쟁 연습생의 최근 평가 · 월말과 소속사 사건에 따라 변화</p>`:''}<p class="hint">데뷔 도전 ${state.attempts}회 · 창작 경력 ${state.credits.toFixed(1)}</p>`;
 updateSaveStatus();
}
function renderDecision(){const p=state.pending,key=p?.id||'';if(lastPending===key)return;lastPending=key;
 const area=document.querySelector('#decision');if(!p){area.innerHTML='';return;}
 let hint='';if(p.kind==='final')hint=`현재 데뷔 가능성 약 ${Math.round(probability(state,'debut')*100)}% · 마지막 준비 기간의 실력에 따라 달라집니다.`;
 area.innerHTML=`<div class="card decision-card" role="region" aria-labelledby="decision-title"><span class="eyebrow">IMPORTANT DECISION · 시간 정지</span><h2 id="decision-title">${esc(p.title)}</h2><p>${esc(p.body)}</p>${hint?`<p class="hint">${hint}</p>`:''}<div class="choices">${p.choices.map((c,i)=>`<button data-choice="${c.id}"><span class="choice-number">0${i+1}</span><span>${esc(c.label)}${c.hint?`<span class="hint">${esc(c.hint)}</span>`:''}</span></button>`).join('')}</div></div>`;
 area.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{choose(state,b.dataset.choice,p.id);clock.reset(performance.now());persist();refresh();});
 // Announce the decision without pulling a reader away from older news.
}
function row(h){const changes=h.changes?Object.entries(h.changes).filter(([,v])=>Math.abs(v)>=.1).map(([k,v])=>`${k} ${v>0?'+':''}${v}`).join(' · '):'';return `<article class="log-row ${h.important?'important':''}"><div class="meta"><time>${h.date}</time><span>${({daily:'일상',agency:'소속사',career:'커리어',decision:'결정',monthly:'월말',system:'안내'})[h.category]||'소식'}</span></div><h3>${esc(h.title)}</h3><p>${esc(h.text)}</p>${changes?`<p class="change-line">${changes}</p>`:''}</article>`;}
function renderLog(loadingOlder){
 const key=`${state.history.length}:${visibleCount}:${importantOnly}`;if(key===lastLog)return;lastLog=key;
 const log=document.querySelector('#log'),oldTop=log.scrollTop,oldHeight=log.scrollHeight,atBottom=oldHeight-oldTop-log.clientHeight<35;
 const rows=state.history.filter(h=>!importantOnly||h.important);log.innerHTML=rows.slice(-visibleCount).map(row).join('')||'<p>아직 기록된 주요 소식이 없습니다.</p>';
 document.querySelector('#older').hidden=rows.length<=visibleCount;
 document.querySelector('#filter').setAttribute('aria-pressed',importantOnly);
 if(loadingOlder)log.scrollTop=oldTop+log.scrollHeight-oldHeight;
 else if(atBottom)log.scrollTop=log.scrollHeight;
 else {log.scrollTop=oldTop;document.querySelector('#latest').hidden=false;}
}
function ending(){
 root.innerHTML=header()+`<section class="intro"><span class="eyebrow">THE CAREER YOU MADE</span><h1>${esc(state.name)},<br>당신이 남긴 장면들.</h1><p>${dateLabel(state.day)} · ${state.age}세 · ${esc(state.ending)}</p></section><section class="card"><h2>커리어 결산</h2><div class="metrics"><div class="metric">최고 인기<strong>${Math.round(state.peak)}</strong></div><div class="metric">순자산<strong>${money(state.money)}만</strong></div><div class="metric">데뷔 도전<strong>${state.attempts}회</strong></div></div><p>최전성기 ${dateLabel(state.peakDay)} · 창작 경력 ${state.credits.toFixed(1)}</p><h3>주요 성과</h3><p>${state.achievements.map(esc).join(' · ')||'나만의 커리어를 걸어온 시간'}</p><h3>에필로그</h3><p>${state.achievements.includes('글로벌 스타')?'멀리서도 당신의 무대를 기억하는 팬들이 남았다.':state.attempts&&!state.achievements.includes('첫 데뷔')?'데뷔의 문이 열리지 않은 뒤에도 다른 무대에서 쌓은 시간은 사라지지 않는다.':'화려한 순간과 조용한 계절이 모여 하나의 커리어가 됐다.'} 이제 무대 밖의 다음 장이 시작된다.</p></section><section class="card"><h2>주요 커리어 타임라인</h2><div class="log ending-log">${state.history.filter(h=>h.important).map(row).join('')}</div></section><details><summary>전체 기록 ${state.history.length}개 보기</summary><div class="log ending-log">${state.history.map(row).join('')}</div></details><button id="home" class="primary wide">시작 화면 / 새로운 이야기</button>`;
 document.querySelector('#home').onclick=home;
}
document.addEventListener('visibilitychange',()=>{if(clock){clock.visibility(!document.hidden,performance.now());persist();}});
window.addEventListener('pagehide',persist);
home();
