# v0.2.4 사건 조건 감사

## 상태

- `student`: 일반 학생. 소속사·그룹·프로젝트·데뷔 이력이 없다.
- `auditioning`: 진입 심사 또는 계약 검토 중. 아직 소속사는 없다. 학생 일상 사건을 사용한다.
- `trainee`: 소속사 계약 후 정규 연습생. 프로젝트·경쟁 연습생이 존재한다.
- `debut_candidate`: 후보 선발 또는 최종 평가 준비. 계약과 프로젝트가 필요하다.
- `idol`: 실제 데뷔 후 그룹 활동. `debuted=true`, 소속사와 그룹이 필요하다.
- `solo`: 실제 데뷔 후 솔로 활동. 그룹은 없어도 된다.
- `actor`, `producer`: 계약한 산업 진입 이후 가능한 전향 분야.
- `ended`: 시간·예약·결정이 모두 종료된 상태.

`transition()`은 허용된 전환과 계약·데뷔 전제조건을 검사한다. `newsAllowed()`는 일반 소식, `decisionAllowed()`는 결정, `scheduledAllowed()`는 예약 사건 조건을 검사한다. 저장 데이터도 같은 결정 조건과 단계별 불변조건을 검사한다.

## 일반 소식 전체

| ID | 허용 단계 | 추가 전제 |
| --- | --- | --- |
| class, exam, school-friend, home-meal, hobby-day, school-festival, music-interest, dance-hobby, sns-diary, chance-meeting | student, auditioning | 학교·가족·친구·취미 이야기만 사용 |
| family | student, auditioning 및 산업 진입 후 모든 활동 단계 | 가족과의 일상, 무대 전제 없음 |
| breath, dance | trainee, debut_candidate, idol, solo | 학생용 취미 노래·춤 사건과 분리 |
| rap | trainee, solo, producer | 녹음·작업 경험 |
| tired, friend | trainee, debut_candidate, idol, solo, actor, producer | 기존 바쁜 일정·동료 문구는 학생에서 제외 |
| mentor, schedule, room | trainee, debut_candidate | 소속사 계약 필수 |
| clip, stage, broadcast | idol, solo | 실제 데뷔 필수. idol이면 그룹 필수 |
| fan, quiet | idol, solo, actor | 아이돌은 실제 데뷔, 배우는 작품 경력 1 이상·인기 5 이상 |
| script, set | actor | 배우 전향 이후 |
| demo, coaching | producer | 제작자 전향 이후 |
| school | trainee | 기존 ‘연습실 밖’ 문구는 산업 진입 후에만 사용 |

일상 소식 선택 전 매번 해당 조건과 재사용 간격을 함께 검사한다. 학생 단계는 소속사 평가나 훈련 성과 소식을 사용하지 않는다.

`join` 템플릿은 무작위 일반 소식에서 제외하고 실제 인물 생성 예약으로 대체했다. `friend`는 같은 소속사에 실제로 존재하는 인물을 재사용하고 관계·인물 이력을 연결한다. 모든 일반 소식은 `ended`에서 차단한다.

## 중요한 결정 전체

| 종류 | 허용 단계·조건 |
| --- | --- |
| entry_offer | student, 무소속. 경로별 조건과 추첨을 통과한 제안 한 개만 표시 |
| contract | auditioning, 심사 합격 후, 아직 무소속 |
| student_future | student, 18개월째 진로 회고. 이후 계속 기다리면 1년 뒤 재회고 |
| meet_trainee | trainee, 유효한 소속사·프로젝트와 같은 소속사 신규 인물 ID 필수 |
| final, late | trainee 또는 debut_candidate, 계약·프로젝트 필수 |
| retry | trainee, 계약·탈락 후 프로젝트 기록 필요 |
| comeback, career | idol 또는 solo, 데뷔·소속사 필수. idol이면 그룹 필수 |
| acting | actor |
| production | producer |
| future | actor 또는 producer |
| health | ended 이외, 실제 컨디션 임계치 도달 시 |

## 예약 사건

- trainee-arrival: 정규 trainee이며 소속사·프로젝트가 있을 때만 실제 인물을 생성한다. 소속사당 한 번 예약한다.
- relationship-followup: 첫 만남 선택 25일 뒤, 현재 trainee/debut_candidate이고 해당 인물과 같은 소속사일 때만 실행한다. 전향·은퇴·다른 소속사라면 발생하지 않는다.
- 두 세계 사건도 기존 큐를 사용한다. 세계 범위 예약은 커리어 epoch 대신 실행 시 실제 소속과 상태를 검사한다.


- opportunity/student-future: student일 때만 실행한다.
- audition-result: auditioning이며 실제 선택한 경로가 있을 때만 실행한다.
- project-* / debut-result / retry: 계약과 프로젝트가 있고 준비 단계일 때만 실행한다. 프로젝트 ID도 일치해야 한다.
- comeback/career/release/reaction/return: 데뷔한 아이돌이며 현재 소속·그룹 조건을 충족해야 한다.
- acting 및 acting-result, production 및 production-result, future: 현재 분야가 맞을 때만 실행한다.
- health-return: 종료하지 않은 경우에만 실행한다.

직업 전환 시 이전 예약의 epoch를 무효화한다. 연습생 → 후보 선발은 같은 프로젝트이므로 예약을 유지하고 epoch만 갱신한다. 최종 데뷔는 별도의 확률 평가 뒤에만 가능하다.

## 진입 경로

`js/entry.js`에 발생 조건, 상대 추첨 가중치, 심사 지연, 비용과 합격 계산을 모았다.

| 경로 | 최소 경과일 | 발생 조건 | 심사 기간 |
| --- | --- | --- | --- |
| 공개 오디션 | 35일 | 관심 20 이상 또는 보컬 35 이상. 180일 이후는 관심과 무관하게 모집 공고 접촉 가능 | 14일 |
| 길거리 캐스팅 | 40일 | 외모 45 이상 | 10일 |
| SNS 발탁 | 45일 | SNS 활동 10 이상 | 18일 |
| 학교 축제 | 60일 | 학교 참여 45 이상, 5·6·10·11월 | 12일 |
| 친구·지인 | 40일 | 교류 35 이상 | 16일 |
| 서바이벌 | 75일 | 15세 이상, 관심 45 이상 | 28일 |

첫 기회 검토는 35~65일 후다. 이후 일반적으로 30~60일 간격으로 재검토하며 가능한 경로가 없으면 14일 뒤 다시 확인한다. 같은 경로의 연속 제안은 다른 경로가 가능할 때 피한다. 경로를 고르는 확률과 심사 합격 확률은 다르며 어느 경로도 합격을 보장하지 않는다.

서바이벌도 사전 심사와 계약이 필수다. 통과해 계약하면 정규 연습생을 대신해 프로그램 후보 프로젝트에 들어가며, 최종 데뷔는 다시 평가한다.
