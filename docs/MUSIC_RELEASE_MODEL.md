# IDOL LIFE — 음반/음원/컴백 모델 (실제 발매 자료 참고)

상태: 시스템 제안. 현재 코드는 `releaseSerial` 기반 작품 번호 기록 위주로, 발매 유형·개별 곡·활동 일정·분리된 성과 모델이 미완성일 수 있음. 구현 전 현 소스를 감사한다.

## 확인한 현실 자료
- TXT는 2024-04-01 미니 6집, 2024-11-04 미니 7집을 발매했다. 같은 해 두 차례 미니 발매가 실제로 있었다.
  - https://weverse.io/txt/notice/17912
  - https://weverse.io/txt/notice/22807
- LE SSERAFIM은 2024-08-30 미니 4집, 2025-10-24 싱글 앨범을 공지했다.
  - https://weverse.io/lesserafim/notice/21346
  - https://weverse.io/lesserafim/notice/30477
- Stray Kids 공식 JYP 자료는 2025년 정규 4집 `KARMA`, `DO IT` 신보, 별도 디지털 싱글을 구별해 설명한다.
  - https://recruit.jype.com/ko/news/19
- 실제 빈도는 그룹·회사·투어·활동 연차에 따라 다르다. '모두 매년 2회'는 사실이 아니다.

## 6년 12개 작품에 대한 판단
- 6년 12개의 **발매 프로젝트**(미니/싱글/정규 혼합)는 충분히 있을 수 있다.
- 6년 12개의 **정규앨범**을 같은 제작·홍보 과정으로 소비했다면 비현실적이다.
- 그룹·솔로·OST·협업·리패키지·재발매를 동일 '음반 수'로 합산해서는 안 된다.
- 작품의 **존재와 이력**이 있어야 플레이어가 누적된 음악 경력을 기억할 수 있다.

## 타입
| releaseType | 의미 | 카운트 처리 |
| --- | --- | --- |
| digital_single | 온라인 싱글 트랙 | 음원 1곡 또는 소규모 싱글 |
| single_album | 싱글 앨범 | 물리적 발매 가능 |
| ep | 미니앨범(EP) | 그룹 주요 컴백 후보 |
| studio | 정규앨범 | 상대적으로 큰 규모와 준비 |
| repackage | 기존 앨범 확장 | 기존 parentReleaseId에 연결 |
| ost | 드라마/영화 OST 참여 | 그룹 정기 컴백과 구분 |
| collaboration | 타 아티스트 협업 | 개인/그룹 구분 |
| solo | 별도 프로젝트 주체 구분용 플래그 | 유형은 위 항목 중 하나 |

곡 수는 업계 고정 법칙이 아니라 **게임 테스트 범위**에서 유형별로 합리적 구간을 제시할 것. 시판 패키지 여러 버전은 하나의 동일 발매로 계산.

## 데이터 모델 제안
`release`: id, title, type, artistType(group|solo), groupId/playerId, agencyId, plannedAt, productionStartedAt, releaseAt, status(planned|recording|filming|promoting|released|cancelled), trackIds, leadTrackId, budget, promotionPlan, conceptProvidedByAgency, playerPreparationFocus, releaseMetrics, parentReleaseId.

`track`: id, title, genre, strength, quality, marketFit, viralExposure, previousPeakRank, chartHistory, releaseId. 차트가 미구현이면 순위를 출력하지 않는다.

## 상태 전환
1. 회사·프로젝트 상황에서 발매 **제안** 또는 계획이 성립한다(시작부터 플레이어가 전체 콘셉트를 결정하지 않는다).
2. 제작 자원/멤버 가용성/회사 일정/기존 작품과의 간격 확인.
3. 콘셉트·타이틀이 **회사에서 제시**되고 플레이어는 준비 방식(보컬/안무/표현/건강/일정 등) 중 결정.
4. 제작·녹음·촬영·홍보 단계의 소식이 비동기적으로 축적됨.
5. 실제 발매가 이루어진 시점에만 발매 수를 1 증가.
6. 음원, 음반 판매, 방송 반응, 팬덤 성장, 대중 노출, 정산은 서로 다른 계산값으로 갱신.
7. 구곡이 존재하며 이후 조회/확산이 증가할 때 역주행 후보가 될 수 있다.

## 임시 밸런싱 지침 (실증 통계 아님)
- 재정/회사 전략/활동 상황에 따라 연간 발매 프로젝트 수가 0개인 해도 허용.
- 발매 간격은 유형·투어·건강·프로젝트 자원에 따라 다르게. 완전한 고정 주기 금지.
- 6년 간 매년 정확히 2회씩 같은 종류의 컴백이 자동 확정되는 시뮬레이션 방지.
- 신인 그룹은 주어진 콘셉트 표현을 선택하고 베테랑/창작자만 컨셉 협상 가능.

## 테스트
- 같은 작품에 여러 패키지 버전이 있어도 발매 하나로 기록.
- 리패키지가 새 정규앨범으로 집계되지 않음.
- 예정만 된 작품, 취소/연기한 작품은 발매 카운트 증가 없음.
- 그룹 해체 또는 활동 중단이면 그룹 명의 신규 활동 계획 무조건 진행되지 않음.
- 특정 자금/일정/건강 상태에 따라 발매 빈도 분포가 변화.
- 6년 시뮬레이션에서 작품 수·유형·간격과 그 이유를 감사 로그로 설명 가능.
- 정규/EP/싱글 구분 없이 `12번째 음반`만 표시하는 UI 제거.
