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

## v1.1 (CVE-2021-41773 D2 리허설, 2026-08-12)

- 실패 Ref: `run-ctl-d2-http-001.sh` 첫 실행, `bad array subscript` (exit 1, Target 영향 없음)
  원인: macOS 기본 bash(3.2)가 `declare -A` 미지원
  변경 위치: `harness/policies/invariants.md` "재사용 패턴"에 bash 3.2 호환 항목 추가
  같은 입력 재실행 결과: `case` 문으로 재작성 후 동일 Control ID로 재실행 — digest 검증·healthcheck·traversal 결과 이전과 동일
  다음 CVE 재사용 영향: 이후 모든 Lab 스크립트가 이 제약을 전제해야 함
- 실패 Ref: REVISE #3(digest 이중 관리 정리) 처리 중 `lab/.env`가 `git status`에 안 잡힘
  원인: 저장소 전역 `.gitignore`의 `.env`/`.env.*` 규칙이 시크릿 아닌 값도 차단
  변경 위치: `harness/policies/invariants.md`에 "시크릿 아닌 pinned 값은 `.env`류 이름 회피" 항목 추가; 실제 CVE 작업공간은 `lab/.env` → `lab/digests.env`로 변경
  같은 입력 재실행 결과: `--env-file digests.env`로 재실행 — 이전과 동일 결과, `git check-ignore` 통과 확인
  다음 CVE 재사용 영향: 앞으로 pinned 설정 파일명은 `.env`류를 피해야 함
- 재실행: 위 두 Blocker 모두 같은 Control ID, 같은 명령으로 재실행해 결과가 이전과 동일함을 확인했다.
- 상세 근거: `cves/CVE-2021-41773/retrospective/reuse-check.md`

## v1.2 (신규 CVE-2021-43798 착수, 2026-08-12)

- 실패 Ref: `npm run check -- D1 CVE-2021-43798`을 처음 시도하려 했으나 그 전에
  `scripts/lib/checks.mjs`가 `cves/CVE-2021-41773/...` 경로를 하드코딩하고 있어서
  CVE-2021-41773 외의 어떤 CVE 워크스페이스도 Gate 검증이 불가능했음을 코드 확인으로 발견
  원인: D1/D2/D3 검사 함수(`checkD1`/`checkD2`/`checkD3`)와 `check-day.mjs` CLI가 CVE ID를
  매개변수화하지 않고 practice CVE 하나만 가정하고 작성됨
  변경 위치: `scripts/lib/checks.mjs`(세 함수 + `checkDay`에 `cveId` 매개변수, 기본값
  `CVE-2021-41773`으로 하위 호환 유지), `scripts/check-day.mjs`(두 번째 CLI 인자로 CVE ID
  수신, `npm run check -- D1 CVE-xxxx-xxxxx` 형태로 확장)
  재실행: `npm test`(회귀, 34/34 그대로 통과), `npm run check -- D1`(CVE-2021-41773 기본값,
  여전히 GO), `npm run check -- D1 CVE-2021-43798`(신규 워크스페이스, 스캐폴드가 비어 있어
  REVISE 11건 — 이 REVISE 자체가 검증기가 이제 정상적으로 신규 CVE를 읽고 있다는 증거)
  다음 CVE 재사용 영향: 앞으로 모든 신규 CVE는 `npm run check -- D1|D2|D3 <CVE-ID>`로 Gate를
  즉시 확인할 수 있음 — CVE마다 검증기를 다시 만들 필요 없음
