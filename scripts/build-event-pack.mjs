import fs from 'node:fs';
const files=['ambient_student','ambient_trainee','ambient_debut'];
const rows=files.flatMap(f=>JSON.parse(fs.readFileSync(`data/event-pack-v03/${f}.json`,'utf8')));
for(const e of rows)if(typeof e.id!=='string'||e.kind!=='ambient'||typeof e.text!=='string'||typeof e.title!=='string'||!Array.isArray(e.when?.phase_in)||!e.when.phase_in.every(p=>typeof p==='string')||!Number.isFinite(e.weight)||e.weight<=0||e.max_occurrences!==1||!Number.isInteger(e.cooldown_days)||!Array.isArray(e.tags))throw Error(`Malformed ambient data ${e.id}`);
const rules=[];
function take(prefix,numbers,topic,guard,title){for(const n of numbers)rules.push({id:`news_${prefix}_${String(n).padStart(3,'0')}`,topic,guard,title});}
take('school_daily',[3,4,8,10,13,16],'school','school','교실에서 생긴 일');
take('school_music',[1,2,5,7,8,11,12,16],'interest','student','음악을 만나는 하루');
take('entry_signal',[11,12],'opportunity','student','모집 공고를 읽으며');
take('trainee_daily',[1,2,4,6,8,9,12,15],'practice','training','연습을 바꾸는 작은 발견');
take('trainee_people',[4,6,8,10],'relationship','peer','같은 연습실의 동료');
take('trainee_eval',[3,5,10,12],'evaluation','training','평가를 준비하는 방식');
take('idol_schedule',[2,4,6,8,9,11,12,16],'schedule','group','활동 현장의 하루');
take('group_dynamics',[3,6,9,14],'relationship','member','멤버 사이의 이야기');
take('comeback_music',[1,3,7,12],'recording','release','새 작품의 준비');
const byId=new Map(rows.map(e=>[e.id,e]));
if(byId.size!==300||rules.length!==48)throw Error('Unexpected content count');
const allowedPaths=new Set(['player.schoolEnrolled','world.activeMusicProject']);
const titles=[
 '점심시간의 농구','진로 희망서의 빈칸','교실 앞 발표','친구의 전학','친구의 새 채널','가족 모임의 질문',
 '쉬는 시간의 안무','노래방에서 찾은 음역','공개 댄스 수업 구경','집에서 따라 한 안무','거리 공연 앞에서','코러스를 녹음해 보니','무대 뒤의 사람들','또래의 춤 계정',
 '지원 영상 제출 기준','선발 공고의 자격 조건',
 '거울 속 작은 자세 차이','호흡 습관 피드백','느린 영상으로 본 동선','자율 연습 시간','힘보다 정확한 박자','다시 찍은 자기소개','컨디션 기록 시작','늦은 연습을 줄인 뒤',
 '동료의 자세 점검','먼저 익힌 동선의 요령','평가 영상 함께 보기','스피커 사용 순서',
 '실력과 긴장 사이','피드백용 평가 영상','협업 태도 안내','추가 카메라 테스트',
 '길어진 리허설','인터뷰 답변 조율','인이어 소리 점검','단체 사진 자리 배치','빠듯한 이동 시간','무대 전 장비 확인','지난 활동 되짚기','방송 전 발언 안내',
 '무대 전의 격려','동선 실수 다시 맞추기','파트 경쟁의 여운','각자의 활동 희망',
 '회사가 전달한 콘셉트','음역에 맞춘 후렴','촬영 카메라 동선','도입부 파트 검토'
];
if(titles.length!==rules.length||new Set(titles).size!==titles.length)throw Error('Distinct reviewed titles required');
const events=rules.map((r,index)=>{
 const e=byId.get(r.id);if(!e||e.kind!=='ambient'||e.max_occurrences!==1||!Array.isArray(e.when.phase_in)||Object.keys(e.when).some(k=>!['phase_in','all'].includes(k))||(e.when.all||[]).some(c=>!allowedPaths.has(c.path)||c.op!=='eq'||c.value!==true)||/[{}]/.test(e.text))throw Error(`Unmapped content ${r.id}`);
 // Only actual engine phases are admitted. 'rookie'/'veteran' are not new states.
 const stages=e.when.phase_in.filter(p=>['student','trainee','debut_candidate','idol','solo'].includes(p));
 return {...r,title:titles[index],stages,text:e.text,weight:e.weight,category:['training','peer'].includes(r.guard)?'agency':r.guard==='student'||r.guard==='school'?'daily':'career',sourceFile:files.find(f=>JSON.parse(fs.readFileSync(`data/event-pack-v03/${f}.json`,'utf8')).some(v=>v.id===r.id))};
});
const arc=JSON.parse(fs.readFileSync('data/event-pack-v03/arcs.json','utf8')).find(a=>a.id==='arc_trainee_rival');
const output='// Generated from reviewed event-pack-v03 IDs. Run npm run build:content.\nexport const packNews = '+JSON.stringify(events,null,2)+';\nexport const rivalArc = '+JSON.stringify({id:arc.id,stageIds:arc.stages.map(s=>s.id)},null,2)+';\n';
if(process.argv.includes('--check')){if(fs.readFileSync('js/event-pack.generated.js','utf8')!==output)throw Error('Content build is stale');}else fs.writeFileSync('js/event-pack.generated.js',output);
