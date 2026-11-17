const all=['trainee','debut_candidate','idol','solo','actor','producer'];
// General reports never stop the clock. Effects happen only when a report occurs.
export const news = [
 {id:'breath',stages:['trainee','debut_candidate','idol','solo'],category:'daily',title:'반복의 성과',text:'호흡이 안정되어 긴 프레이즈를 끝까지 소화했다.',effects:{보컬:.7}},
 {id:'dance',stages:['trainee','debut_candidate','idol','solo'],category:'daily',title:'연습 영상',text:'지난달 영상과 비교하니 동작의 중심이 더 단단해졌다.',effects:{댄스:.7}},
 {id:'rap',stages:['trainee','solo','producer'],category:'daily',title:'노트 한 페이지',text:'떠오른 구절을 녹음했다. 다음 작업에 쓸 작은 재료가 생겼다.',effects:{랩:.7}},
 {id:'tired',stages:all,category:'daily',title:'긴 하루의 끝',text:'바쁜 일정 뒤 오늘은 평소보다 일찍 잠들었다.',effects:{체력:-1,멘탈:.3}},
 {id:'friend',stages:all,category:'daily',title:'동료와의 저녁',text:'비슷한 고민을 나누며 긴장을 조금 내려놓았다.',effects:{멘탈:1}},
 {id:'family',stages:[...all,'student','auditioning'],category:'daily',title:'집에서 온 연락',text:'가족과 짧게 통화했다. 돌아갈 곳이 있다는 감각이 힘이 됐다.',effects:{멘탈:1}},
 {id:'mentor',stages:['trainee','debut_candidate'],category:'agency',title:'연습실의 피드백',text:'트레이너가 장점과 함께 다음 평가에서 보완할 점을 짚었다.',effects:{보컬:.4,댄스:.4}},
 {id:'join',stages:['trainee','debut_candidate'],category:'agency',title:'새로운 얼굴',text:'새 연습생이 합류했다. 연습실의 경쟁 구도가 조금 달라졌다.',environment:'rival'},
 {id:'schedule',stages:['trainee','debut_candidate'],category:'agency',title:'합동 연습 일정',text:'소속사가 합동 연습 시간을 늘렸다. 각자의 강점을 맞춰보는 날이 많아졌다.',effects:{댄스:.4,체력:-.6}},
 {id:'room',stages:['trainee','debut_candidate'],category:'agency',title:'연습실 정비',text:'소속사가 녹음 장비를 점검했다. 피드백을 더 선명하게 들을 수 있게 됐다.',effects:{보컬:.3}},
 {id:'clip',stages:['idol','solo'],category:'career',title:'무대 밖의 반응',text:'짧은 무대 영상이 팬들 사이에서 공유되고 있다.',effects:{popularity:1.2}},
 {id:'fan',stages:['idol','solo','actor'],category:'career',title:'팬의 편지',text:'작은 변화까지 기억해 준 편지를 읽었다.',effects:{멘탈:1,popularity:.5}},
 {id:'stage',stages:['idol','solo'],category:'career',title:'작은 공연',text:'지역 공연에서 새로운 관객과 만났다. 무대 경험이 쌓였다.',effects:{money:12,스타성:.5,체력:-1}},
 {id:'broadcast',stages:['idol','solo'],category:'career',title:'방송 녹화',text:'리허설부터 녹화까지 긴 하루를 마쳤다.',effects:{money:8,연기:.4,체력:-1}},
 {id:'quiet',stages:['idol','solo','actor'],category:'career',title:'조용한 반응',text:'최근 콘텐츠의 반응이 기대보다 잔잔하다. 다음 활동의 과제로 남았다.',effects:{popularity:-.7}},
 {id:'script',stages:['actor'],category:'career',title:'대본의 여백',text:'작은 역할의 대사를 고치며 인물의 말투를 찾았다.',effects:{연기:1,money:8}},
 {id:'set',stages:['actor'],category:'career',title:'현장에 익숙해지다',text:'촬영 동선이 몸에 익었다. 짧은 장면을 한 번에 마쳤다.',effects:{연기:.7,스타성:.3,체력:-.7}},
 {id:'demo',stages:['producer'],category:'career',title:'데모 작업',text:'후배의 목소리에 어울리는 편곡을 찾았다.',effects:{credits:.2,랩:.5,money:10}},
 {id:'coaching',stages:['producer'],category:'career',title:'다른 사람의 첫 무대',text:'후배의 연습을 지도했다. 직접 서던 무대가 다른 의미로 다가왔다.',effects:{credits:.2,멘탈:1,money:8}},
 {id:'school',stages:['trainee'],category:'daily',title:'연습실 밖의 하루',text:'친구들과 근황을 나눴다. 무대 외에도 삶의 장면이 쌓인다.',effects:{멘탈:.7}},
 {id:'class',stages:['student','auditioning'],category:'daily',title:'교실의 하루',text:'모둠 과제를 마치고 친구들과 점심을 먹었다. 평소와 비슷한 하루가 지나갔다.',effects:{멘탈:.3}},
 {id:'exam',stages:['student','auditioning'],category:'daily',title:'시험 공부',text:'어려웠던 단원을 다시 풀어 봤다. 조금씩 이해되는 부분이 늘었다.',effects:{멘탈:.3}},
 {id:'school-friend',stages:['student','auditioning'],category:'daily',title:'친구와의 수다',text:'하굣길에 친구의 이야기를 들었다. 특별한 일 없이 함께 걷는 시간이 좋았다.',effects:{멘탈:.8}},
 {id:'home-meal',stages:['student','auditioning'],category:'daily',title:'가족의 식탁',text:'저녁을 함께 먹으며 학교에서 있었던 일을 나눴다.',effects:{멘탈:.7}},
 {id:'hobby-day',stages:['student','auditioning'],category:'daily',title:'방과 후 취미',text:'노래를 듣고 그림도 그리며 좋아하는 것을 찾아봤다.',effects:{스타성:.2}},
 {id:'school-festival',stages:['student','auditioning'],category:'daily',title:'학교 행사 준비',text:'반 친구들과 행사 준비를 나눠 맡았다. 연습보다 웃고 떠드는 시간이 더 길었다.',effects:{멘탈:.5}},
 {id:'music-interest',stages:['student','auditioning'],category:'daily',title:'자꾸 듣게 되는 노래',text:'마음에 드는 곡을 따라 불렀다. 음악을 좋아하는 마음이 조금 커졌다.',effects:{보컬:.3},studentEffect:'interest'},
 {id:'dance-hobby',stages:['student','auditioning'],category:'daily',title:'친구가 알려 준 춤',text:'쉬는 시간에 짧은 안무를 따라 했다. 틀린 동작에 함께 웃었다.',effects:{댄스:.3}},
 {id:'sns-diary',stages:['student','auditioning'],category:'daily',title:'일상을 남기는 영상',text:'취미로 찍은 짧은 영상을 올리고 친구들과 반응을 나눴다.',studentEffect:'sns'},
 {id:'chance-meeting',stages:['student','auditioning'],category:'daily',title:'새로운 인연',text:'동아리에서 다른 반 친구와 이야기를 나눴다. 서로 좋아하는 것이 비슷했다.',effects:{멘탈:.5}},

];
export function newsAllowed(s,n){return n.stages.includes(s.stage)&&(!(n.category==='agency')||!!s.agency)&&(!['clip','stage','broadcast','fan','quiet'].includes(n.id)||s.debuted||(s.stage==='actor'&&s.popularity>=5&&s.credits>=1))&&(!['clip','stage','broadcast'].includes(n.id)||(['idol','solo'].includes(s.stage)&&s.debuted&&!!s.agency&&(s.stage!=='idol'||!!s.group)))&&(!['mentor','join','schedule','room'].includes(n.id)||(['trainee','debut_candidate'].includes(s.stage)&&!!s.agency));}
const c=(id,label,hint='')=>({id,label,hint});
export const decisions={
 student_future:{title:'꿈을 찾아가는 시간',body:'평범한 일상을 지내며 여러 가능성을 만나왔다. 연예계의 기회를 더 열어 둘지, 다른 일상의 이야기를 이어갈지 생각해 본다.',choices:[c('continue','일상을 지내며 기회를 더 기다린다'),c('finish','다른 꿈을 향해 이야기를 마무리한다')]},
 entry_offer:{title:'일상에서 찾아온 제안',body:'새로운 기회를 검토한다.',choices:[c('apply','심사에 참여'),c('decline','학교생활을 이어간다')]},
 contract:{title:'연습생 계약 제안',body:'오디션 담당자가 계약 조건을 설명했다. 비용과 연습 일정, 재평가 절차를 확인하고 결정한다.',choices:[c('accept','계약하고 연습생 생활 시작','프로젝트 선발 경쟁에 참여'),c('decline','제안을 거절하고 다시 준비','다른 진입 기회를 기다림')]},
 final:{title:'최종 데뷔 평가',body:'수개월의 프로젝트 준비가 끝났다. 누적 실력, 월말 평가, 경쟁 구도와 이전 선택이 함께 반영된다.',choices:[c('challenge','최종 평가에 도전한다','한 달간 데뷔 준비 후 결과 발표'),c('delay','이번 기수는 미룬다','다음 프로젝트에서 재도전'),c('actor','연기로 방향을 바꾼다','배우 활동으로 전향')]},
 retry:{title:'다시 시작할 방향',body:'이번 데뷔조에는 합류하지 못했다. 다음 프로젝트를 기다리거나, 쌓은 경험으로 다른 분야에 도전할 수 있다.',choices:[c('retry','다음 데뷔 프로젝트에 재도전'),c('actor','배우로 전향'),c('producer','제작·트레이닝 분야로 전향'),c('retire','연예계 활동을 마무리')]},
 comeback:{title:'다음 작품의 방향',body:'새 음반 제작 일정이 잡혔다. 오늘 정한 방향의 반응은 발매 후에 알 수 있다.',choices:[c('bold','새로운 콘셉트에 투자','비용 50만원 · 성공 시 큰 반응, 실패 위험'),c('steady','강점을 살린 작품 제작','비용 20만원 · 완만한 반응'),c('break','활동을 쉬며 재정비','90일 공백 · 컨디션 회복, 인기 감소')]},
 career:{title:'계약 갱신과 다음 장',body:'현재 활동을 이어갈지, 다른 이름으로 다음 장을 쓸지 선택할 시간이다.',choices:[c('renew','현재 활동 계약 갱신','그룹 또는 현재 분야 유지'),c('solo','솔로 활동으로 독립','그룹 활동 종료 · 아이돌 활동은 계속'),c('actor','아이돌 은퇴 후 배우 전향'),c('producer','아이돌 은퇴 후 제작자 전향')]},
 acting:{title:'새 작품의 제안',body:'지금의 연기 실력을 시험할 기회다. 선택한 역할의 결과는 촬영 준비 후 전해진다.',choices:[c('lead','주연 오디션에 도전','성공 가능성은 연기 실력과 경력에 따라'),c('support','조연으로 경험을 쌓는다','작은 수입과 안정적인 현장 경험'),c('producer','제작·교육으로 전향')]},
 production:{title:'후배의 데뷔 프로젝트',body:'제작 경험을 어디에 쓸까. 투자한 프로젝트의 반응은 몇 달 뒤에 돌아온다.',choices:[c('invest','제작에 투자','비용 80만원 · 작품 흥행에 따라 수익 변동'),c('coach','트레이너로 참여','안정적인 지도 수입 · 제작 지분 없음')]},
 health:{title:'활동 속도를 조절할 때',body:'컨디션이 크게 떨어졌다. 지금은 회복을 위한 시간이 필요하다.',choices:[c('rest','치료와 휴식에 집중','90일 컨디션 관리 · 비용 30만원'),c('retire','건강을 위해 연예계 은퇴')]},
 late:{title:'준비 기간을 돌아보며',body:'오랜 준비를 이어왔다. 아이돌 데뷔 외에도 그동안의 실력을 활용할 길이 있다.',choices:[c('actor','배우로 새 출발'),c('producer','제작과 교육으로 전향'),c('retire','연예계를 떠나 새로운 일상으로')]},
 future:{title:'커리어의 다음 계절',body:'활동을 이어갈지 삶의 방향을 바꿀지 돌아본다.',choices:[c('continue','현재 활동을 이어간다'),c('producer','제작과 교육으로 옮긴다'),c('retire','연예계 활동을 은퇴한다')]},
};

export function decisionAllowed(s,kind){
 const school=s.stage==='student',preparing=['trainee','debut_candidate'].includes(s.stage)&&!!s.agency&&!!s.project;
 const performing=['idol','solo'].includes(s.stage)&&s.debuted&&!!s.agency&&(s.stage!=='idol'||!!s.group);
 if(kind==='entry_offer'||kind==='student_future')return school&&!s.agency;
 if(kind==='contract')return s.stage==='auditioning'&&!s.agency&&!!s.entryRoute;
 if(kind==='final'||kind==='late')return preparing;
 if(kind==='retry')return preparing&&s.stage==='trainee';
 if(kind==='comeback'||kind==='career')return performing;
 if(kind==='acting')return s.stage==='actor';
 if(kind==='production')return s.stage==='producer';
 if(kind==='future')return ['actor','producer'].includes(s.stage);
 return kind==='health'&&s.stage!=='ended';
}
