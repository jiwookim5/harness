# Harness Changelog

## v0

- Scope, Human GO, Observation, Same-Control Retest, Evidence Report의 최소 Loop를 시작했다.

새 변경은 실패 Ref, 원인, 변경 위치, 같은 입력 재실행 결과, 다음 CVE 재사용 영향을 기록한다.

## v1 starter hardening

- 실제 학생 리허설에서 누락된 Day START Preflight와 평문 질문 fallback을 계약에 추가했다.
- Same-Control 단일 lifecycle, deny-by-default Lab, Setup/Transport/Matcher 결과 분리와
  running-container digest 기록을 공통 불변조건으로 만들었다.
- 공식 Source 접근 실패 시 같은 공식 저장소의 raw 경로를 우선하는 Prompt를 추가했다.
- D1 Gate가 비어 있는 Intake를 놓치지 않도록 결정적 검사와 회귀 테스트를 추가했다.
- live Raw Evidence가 전체 패키징 테스트를 오염시키지 않도록 현재 commit의 clean clone에서
  배포 패키징 테스트를 수행한다.
- 강의용 masked log는 추적할 수 있지만 raw log는 계속 Git에서 제외한다.
