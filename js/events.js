// Choices contain conditions, weighted probability, success/failure text and effects.
const choice=(id,label,effects={},extra={})=>({id,label,effects,...extra});
const event=(id,stages,title,body,choices,extra={})=>({id,stages,title,body,choices,...extra});
const audition=(id,label,stat)=>choice(id,label,{}, {roll:{base:.16,stat,weight:.009,training:.025},success:{stage:'trainee',멘탈:5},failure:{멘탈:-4},successText:'가능성을 인정받아 연습생 계약을 맺었다.',failureText:'이번에는 명단에 이름이 없었다. 다른 문은 아직 열려 있다.'});
export const events=[
event('entrance',['entry'],'문을 두드리는 방법','첫 무대로 향하는 길을 직접 고른다.',[audition('audition','공개 오디션에 지원한다','보컬'),audition('street','캐스팅 제안을 검증하고 미팅한다','스타성'),audition('sns','SNS에 퍼포먼스 영상을 올린다','댄스'),choice('train','다음 기회를 위해 준비한다',{보컬:5,댄스:5,체력:-3})],{repeat:true}),
event('debut',['debut'],'데뷔 평가의 날','완벽한 준비는 없다. 지금의 실력으로 무대에 선다.',[choice('debut','팀의 데뷔 평가에 도전한다',{}, {roll:{base:.03,stat:'댄스',weight:.004,second:'보컬',training:.04},success:{stage:'group',popularity:15,money:100},failure:{stage:'trainee',멘탈:-9},successText:'데뷔가 확정됐다. 작은 쇼케이스에서 처음 팬의 목소리를 들었다.',failureText:'데뷔조에서 제외됐다. 연습생으로 돌아가 재도전할 수 있다.'}),choice('delay','평가를 미루고 기초를 다진다',{stage:'trainee',보컬:7,댄스:7,멘탈:-3}),choice('actor','연기 분야로 방향을 바꾼다',{stage:'actor',연기:8}),choice('retire','연예계를 떠난다',{stage:'ended'})],{repeat:true}),
event('crossroads',['group','solo'],'무대 다음의 선택','어떤 이름으로 다음 장을 쓰고 싶은가.',[choice('stay','현재 활동을 이어간다',{popularity:3,체력:-3}),choice('solo','솔로 아티스트로 독립한다',{stage:'solo',money:-80,멘탈:-4}),choice('actor','아이돌 은퇴 후 배우로 전향한다',{stage:'actor',연기:5}),choice('producer','아이돌 은퇴 후 제작자로 전향한다',{stage:'producer',credits:2})],{repeat:true}),
event('training',['trainee'],'연습실의 긴 하루','한정된 시간과 체력. 오늘의 우선순위를 정한다.',[choice('vocal','보컬 레슨에 집중한다',{보컬:9,체력:-6,money:-15}),choice('dance','댄스 기본기를 반복한다',{댄스:9,체력:-8}),choice('rap','자작 랩을 녹음한다',{랩:8,스타성:2,멘탈:-3}),choice('rest','충분히 쉬고 회복한다',{체력:14,멘탈:9})],{repeat:true}),
...[
['mentor',['trainee'],'선배의 조언','평가에 맞출까, 내 색깔을 찾을까?',[choice('learn','기본기를 배운다',{보컬:6,댄스:4,스타성:-2}),choice('own','내 스타일을 밀어본다',{스타성:8,멘탈:-5})]],
['job',['entry','trainee'],'생활비의 무게','수업과 아르바이트 시간이 겹쳤다.',[choice('work','일해서 비용을 마련한다',{money:90,체력:-7}),choice('lesson','연습을 선택한다',{댄스:6,money:-40})]],
['team',['trainee','group'],'팀 안의 온도','파트 배분을 두고 의견이 갈린다.',[choice('talk','대화로 합의한다',{멘탈:5,credits:1,체력:-3}),choice('lead','주도적으로 파트를 맡는다',{스타성:6,멘탈:-6})]],
['evaluation',['trainee'],'월말 평가','새로운 평가 방식이 공지됐다.',[choice('safe','익숙한 곡을 완성한다',{보컬:6,멘탈:2}),choice('risk','고난도 안무에 도전한다',{}, {roll:{base:.2,stat:'댄스',weight:.008},success:{댄스:12,스타성:5},failure:{체력:-10,멘탈:-5},successText:'도전이 통했다. 평가단이 고개를 끄덕였다.',failureText:'동작을 놓쳤다. 기초를 돌아볼 계기가 됐다.'})]],
['school',['entry','trainee'],'교실과 연습실','중요한 학교 일정이 다가왔다.',[choice('school','학교생활에 시간을 쓴다',{멘탈:9,체력:4}),choice('practice','연습 시간을 확보한다',{보컬:5,댄스:5,멘탈:-6})]],
['agency',['trainee'],'새 소속사의 제안','더 작은 회사에서 데뷔 기회를 제안했다.',[choice('move','팀을 옮긴다',{training:1,멘탈:-5,money:-30}),choice('stay','현재 환경에서 준비한다',{보컬:5,멘탈:3})]],
['injury',['trainee','group','solo'],'몸이 보내는 신호','발목에 무리가 왔다. 회복 계획이 필요하다.',[choice('rest','재활에 집중한다',{체력:20,money:-35,popularity:-3}),choice('light','일정을 줄여 소화한다',{체력:6,보컬:4,멘탈:-4})]],
['demo',['trainee','solo','producer'],'데모 파일 한 개','직접 쓴 곡을 공개할 기회다.',[choice('release','곡을 다듬어 공개한다',{랩:6,credits:2,money:-35}),choice('save','다음 기회를 위해 보관한다',{멘탈:5,보컬:3})]],
['showcase',['group'],'첫 팬 쇼케이스','팬과 가까이 만나는 작은 무대.',[choice('live','라이브를 중심으로 꾸민다',{보컬:5,popularity:6,체력:-6}),choice('talk','진솔한 토크를 준비한다',{스타성:5,popularity:4,멘탈:-3})]],
['comeback',['group','solo'],'컴백의 방향','새 앨범의 색을 결정한다.',[choice('bold','실험적인 콘셉트를 고른다',{money:-50,체력:-8},{roll:{base:.18,stat:'스타성',weight:.008},success:{popularity:20,money:180},failure:{popularity:-5},successText:'새로운 색깔이 대중에게 통했다.',failureText:'반응은 조용했다. 다음 작품을 위한 기록이 남았다.'}),choice('steady','강점을 살린 곡을 고른다',{popularity:6,money:45,체력:-5})]],
['viral',['group','solo'],'짧은 영상의 파도','퍼포먼스 영상에 관심이 몰린다.',[choice('ride','추가 콘텐츠로 호응한다',{체력:-9},{roll:{base:.25,stat:'스타성',weight:.007},success:{popularity:23,money:120},failure:{popularity:2},successText:'영상이 해외까지 퍼졌다.',failureText:'짧은 관심이었지만 새 팬들이 남았다.'}),choice('pace','일상적인 활동 속도를 지킨다',{popularity:4,멘탈:6})]],
['tour',['group','solo'],'해외 투어 제안','새 시장의 무대는 비용과 체력이 필요하다.',[choice('tour','투어에 도전한다',{money:-70,체력:-12},{roll:{base:.15,stat:'댄스',weight:.005,second:'스타성'},success:{popularity:24,money:260},failure:{popularity:3,money:20},successText:'여러 도시에서 관객의 합창이 울렸다.',failureText:'공연 규모는 작았지만 경험이 쌓였다.'}),choice('local','국내 활동에 집중한다',{money:60,popularity:5,체력:-4})]],
['fans',['group','solo','actor'],'팬에게 보내는 편지','꾸준한 소통에도 에너지가 든다.',[choice('letter','직접 마음을 전한다',{popularity:7,멘탈:-3}),choice('pause','잠시 개인 시간을 갖는다',{멘탈:12,popularity:-2})]],
['rumor',['group','solo','actor'],'확인되지 않은 이야기','소문이 온라인에서 번지고 있다.',[choice('respond','사실을 정리해 입장을 밝힌다',{money:-35,멘탈:-4,popularity:3}),choice('wait','공식 확인을 기다린다',{멘탈:-7,체력:4,popularity:-3})]],
['brand',['group','solo','actor'],'브랜드의 얼굴','광고 촬영과 연습 일정이 겹친다.',[choice('ad','광고를 촬영한다',{money:160,체력:-9}),choice('craft','작품 준비에 집중한다',{보컬:4,연기:4,멘탈:4})]],
['contract',['group','solo'],'다음 계약서','수익과 창작 자유 사이에서 고민한다.',[choice('stable','안정적인 계약을 맺는다',{money:130,스타성:-3}),choice('indie','창작 자유를 확보한다',{스타성:7,money:-60,credits:1})]],
['acting',['actor'],'첫 대본 리딩','작은 역할도 하나의 삶이다.',[choice('study','인물을 깊이 연구한다',{연기:10,멘탈:-5,money:30}),choice('network','현장 사람들과 호흡을 맞춘다',{연기:5,스타성:3,money:50})]],
['casting',['actor'],'주연 오디션','새 작품의 중심에 설 기회.',[choice('try','주연에 도전한다',{}, {roll:{base:.1,stat:'연기',weight:.009},success:{popularity:18,money:220,credits:2},failure:{멘탈:-6,연기:3},successText:'배역을 얻었다. 새로운 얼굴로 기억되기 시작했다.',failureText:'배역은 다른 사람에게 갔다. 다음 대본을 펼쳤다.'}),choice('support','조연으로 경험을 쌓는다',{연기:6,money:65,popularity:3})]],
['genre',['actor'],'낯선 장르','편안한 역할 밖으로 나갈 때일까?',[choice('new','새 장르를 배운다',{연기:8,체력:-8,스타성:3}),choice('known','익숙한 역할을 완성한다',{money:85,popularity:4,연기:3})]],
['production',['producer'],'다른 사람의 첫 무대','후배의 데뷔 프로젝트를 맡았다.',[choice('invest','제작에 투자한다',{money:-80,credits:3},{roll:{base:.2,stat:'랩',weight:.006,second:'보컬'},success:{money:230,popularity:10},failure:{money:20,멘탈:-5},successText:'후배의 첫 곡이 좋은 반응을 얻었다.',failureText:'흥행은 아쉬웠지만 제작 경험이 남았다.'}),choice('coach','트레이너로 지도한다',{money:80,credits:1,멘탈:5})]],
['collab',['solo','producer'],'협업 제안','다른 음악가와 작업실을 나눈다.',[choice('collab','새로운 스타일로 협업한다',{랩:5,보컬:5,money:50,체력:-6}),choice('focus','개인 작업에 집중한다',{스타성:5,멘탈:4})]],
['burnout',['group','solo','actor','producer'],'마음의 빈자리','좋아했던 일도 가끔 버겁게 느껴진다.',[choice('break','활동을 쉬어간다',{멘탈:20,체력:15,money:-50,popularity:-4}),choice('adjust','일정과 목표를 조정한다',{멘탈:9,체력:6,money:-15})]],
['family',['entry','trainee','group','solo','actor','producer'],'집에서 온 연락','오랜만에 함께 식사하자는 연락.',[choice('visit','시간을 내어 만난다',{멘탈:12,money:-20}),choice('call','통화하고 일정을 이어간다',{멘탈:3,보컬:3,체력:-3})]],
['festival',['group','solo','actor'],'축제의 무대','관객과 직접 만날 기회가 왔다.',[choice('perform','현장에 선다',{money:90,popularity:6,체력:-9}),choice('rest','다음 활동을 준비한다',{체력:10,연기:3})]],
['savings',['group','solo','actor','producer'],'수입을 쓰는 방법','다음 시즌을 위한 자금 계획.',[choice('save','무리하지 않고 저축한다',{money:65,멘탈:3}),choice('learn','레슨과 장비에 투자한다',{money:-60,보컬:5,연기:5,랩:4})]],
['future',['actor','producer'],'다음 장의 모양','연예계 안팎에서 선택지가 생겼다.',[choice('continue','현재 커리어를 이어간다',{멘탈:4,credits:1}),choice('producer','제작과 교육으로 옮긴다',{stage:'producer',credits:1}),choice('retire','연예계를 은퇴한다',{stage:'ended'})]]
].map(args=>event(...args))
];
export const fallback=event('ordinary',Object.keys({entry:1,trainee:1,group:1,solo:1,actor:1,producer:1}),'계절이 흐르는 동안','눈에 띄는 사건이 없어도 일상과 경력은 쌓인다.',[choice('practice','배우고 일하며 지낸다',{보컬:3,연기:3,money:35,체력:-3}),choice('recover','삶의 균형을 돌본다',{멘탈:10,체력:12,money:-15})],{repeat:true});
