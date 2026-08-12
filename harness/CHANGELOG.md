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

## v1.3 (FACT 출처 검사 사각지대 발견, 2026-08-12)

- 실패 Ref: `harness/validators/`에 "Source 없는 FACT를 잡는다"는 의도만 README로 적혀 있고
  실제 코드가 없어서, `harness/validators/`에는 문서만 있고 로직은
  `scripts/lib/checks.mjs`의 `checkFacts()`에 있다는 걸 재확인. 이 함수 자체도 다시 읽어보니
  `line.trim().startsWith("FACT:")`로 검사하고 있었는데, 실제 `root-cause.md`/`cwe.md`의 모든
  FACT 줄은 마크다운 bullet(`- FACT: ...`)로 시작해서 `"- FACT:".startsWith("FACT:")`가 항상
  false — 이 검사기는 만들어진 이후 실제 파일에서 단 한 번도 작동한 적이 없었음. 정규식
  `/\[SRC-\d+\]/`도 `[SRC-003a]`처럼 문자 접미사가 붙은 실제 Source Ref는 매칭 안 됐음
  원인: (1) `checkFacts()`가 cwe.md에는 아예 호출되지 않고 root-cause.md에만 적용됨,
  (2) 줄 시작 검사가 마크다운 bullet 형식을 고려 안 함, (3) 정규식이 `[SRC-NNN]`만 인정하고
  `[CLAIM-NNN]`/`[CLM-NNN]` 인용은 통과시키지 못함(지금은 안 쓰지만 구조적으로 뚫려 있었음)
  변경 위치: `scripts/lib/checks.mjs` — `checkFacts()`의 줄 매칭을 `/^-?\s*FACT:/`로,
  Source 정규식을 `/\[(SRC|CLAIM|CLM)-\d+[a-zA-Z]?\]/`로 확장, `checkD1()`에서
  `checkFacts(cwe, "cwe.md", issues)` 호출 추가
  재실행: `npm test`(회귀, 34/34 그대로 통과), `npm run check -- D1`/`D1 CVE-2021-43798`(둘 다
  여전히 GO — 실제 FACT 줄에 이미 [SRC-NNN] 출처가 다 있었으므로). 이후 `cwe.md`에 출처 없는
  FACT 한 줄과 `[CLAIM-002]`만 인용한 FACT 한 줄을 임시로 추가해 재검증 → 출처 없는 줄만
  REVISE 1건으로 정확히 잡히고 CLAIM 인용 줄은 통과함을 확인, 두 테스트 줄 모두 제거 후 GO로
  복귀
  다음 CVE 재사용 영향: 앞으로 모든 신규 CVE의 root-cause.md·cwe.md는 FACT 줄마다 `[SRC-NNN]`
  또는 `[CLAIM-NNN]`/`[CLM-NNN]` 출처가 있어야 Gate를 통과함 — 두 파일 모두 실제로 검사됨

## v1.4 (report.html 재검토 중 발견, 2026-08-12)

- 실패 Ref: CVE-2021-43798의 `report.html`을 다시 검토하다가 두 가지를 발견함.
  (1) `execution/observation.json`이 취약한 Target(8300)만 harness 표준 Observation
  스키마로 남기고, 조치된 Target(8301)은 더 가벼운 `evidence/index.json`/`patched.json`
  형식에만 있어서 두 CVE 모두 "조치 쪽 Observation"이 정식 형식으로는 없었음.
  (2) `harness/prompts/source-map-prompt.md`가 "실패한 URL과 대체 경로도 기록"을
  요구하는데, `cve.org` 동적 페이지 Fetch가 실패해서 CVEProject raw JSON으로 우회한
  사실이 CVE-2021-43798의 `source-map.md` 어디에도 안 남아 있었음
  원인: (1) Observation 템플릿을 취약/조치 Same-Control 쌍이 아니라 Control당 하나만
  만들면 되는 것으로 오해하고 작업함, (2) source-map-prompt.md의 "접근 실패 기록"
  요구사항을 D1 작업 중 누락함
  변경 위치: `cves/CVE-2021-41773/execution/observation-patched.json`,
  `cves/CVE-2021-43798/execution/observation-patched.json`(조치 Target용 신규 Observation
  추가), `cves/CVE-2021-43798/sources/source-map.md`(접근 실패 기록 절 추가),
  `cves/CVE-2021-43798/report.html`(Source Map·Evidence·Harness 개선 섹션에 반영)
  재실행: `npm test`(34/34), `npm run check -- D1/D2/D3`(두 CVE 모두 여전히 GO —
  `observation-patched.json`은 checkD2가 읽는 고정 경로가 아니라 보완용 파일이라
  Gate 판정에 영향 없음)
  다음 CVE 재사용 영향: 앞으로 Same-Control Observation은 취약/조치 두 Target 모두
  정식 스키마로 남기고, Source 접근이 한 번이라도 실패하면 그 URL·이유·대체 경로를
  source-map.md에 바로 기록한다

## v1.5 (불명확한 성공 Matcher, 2026-08-12)

- 실패 Ref: CVE-2021-43798의 `execution/control.json`/`observation.json`이
  `VULNERABLE_MATCH`/`PATCHED_BLOCK`라는 라벨을 쓰는데, `vulnerable.json`/`patched.json`은
  같은 검사를 `TRAVERSAL_MARKER_CHECK`라는 다른 이름으로 부르고 있었고, 이 라벨들이 실제로
  무엇을 검사하는지(HTTP 코드? marker 문자열?)를 코드나 문서 어디에도 정의하지 않았음.
  `run-ctl-d2-http-001.sh`는 curl 결과(HTTP 코드, 응답 본문)를 출력만 했고, marker 문자열이
  실제로 있는지는 사람이 눈으로 읽고 성공/실패를 판단했음 — 판정 로직이 코드로 존재하지 않았음
  원인: matcher 이름을 지을 때 "무엇을 검사하는가(공유 검사 이름)"와 "그 검사가 낼 수 있는
  기대 결과 라벨"을 구분하지 않고 섞어 씀. 판정 자체를 자동화하지 않고 사람이 대신함
  변경 위치: `cves/CVE-2021-43798/lab/run-ctl-d2-http-001.sh`(marker 문자열을 `grep`으로
  확인해 `MATCHER=TRAVERSAL_MARKER_CHECK LABEL=<VULNERABLE_MATCH|PATCHED_BLOCK|INDETERMINATE>
  VERDICT=<MATCH|NO_MATCH>`를 자동 출력하도록 추가), `evidence/same-control-check.md`("Matcher
  정의" 절 추가, 두 이름 체계의 관계 설명), `report.html`(Same-Control 표에 Matcher 판정 열 추가)
  재실행: `GO CTL-D2-HTTP-001`로 재실행 → 8300=`LABEL=VULNERABLE_MATCH VERDICT=MATCH`,
  8301=`LABEL=PATCHED_BLOCK VERDICT=MATCH` — 이전 수기 판단과 동일한 결과를 이번엔 코드가
  직접 확인함. `npm test` 34/34, D1/D2/D3 GO 유지
  다음 CVE 재사용 영향: 앞으로 Same-Control 스크립트는 marker/matcher 판정을 사람이 읽고
  결정하지 말고 `grep` 등으로 코드가 직접 판정해서 출력해야 함. CVE-2021-41773의
  `run-ctl-d2-http-001.sh`/`run-ctl-d2-http-003.sh`에는 아직 미적용 — 다음에 적용 필요

## v1.6 (반복적인 수작업 — 손으로 중복 입력된 해시, 2026-08-12)

- 실패 Ref: v1.5를 만들던 중 `input_sha256`/`request_sha256`/`criteria_sha256`이
  `execution/vulnerable.json`, `execution/patched.json`, `execution/observation.json`,
  `execution/observation-patched.json`, `evidence/index.json`(entry 2개) 총 6곳에
  손으로 중복 입력돼 있는 걸 발견함(`grep | sort | uniq -c`로 실제 카운트 확인). 이
  중복이 v1.5에서 고친 Matcher 이름 불일치가 아무 자동 검사도 없이 조용히 발생할 수
  있었던 근본 원인이었음
  원인: Observation/Same-Control 관련 JSON 파일을 4~6개로 나눠 만들면서, 각 파일을
  손으로 작성할 때마다 같은 해시값을 그대로 옮겨 적었고, 파일들 사이의 일치 여부를
  검사하는 자동화가 전혀 없었음
  변경 위치: `scripts/lib/checks.mjs`에 `checkExecutionConsistency()` 추가,
  `checkD3()`에서 `execution/vulnerable.json`·`patched.json`·`observation.json`·
  `observation-patched.json`(존재하는 파일만) 사이의 세 해시값이 전부 같은지 자동 대조
  재실행: `npm test`(34/34), `npm run check -- D3`(두 CVE 모두 GO). 검사가 실제로
  작동하는지 확인하려고 `observation-patched.json`의 `input_sha256` 앞 8자를
  `deadbeef`로 일부러 바꾼 뒤 재실행 → `REVISE execution consistency: input_sha256
  differs across ...` 정확히 잡힘. 원상복구 후 다시 GO 확인
  다음 CVE 재사용 영향: 앞으로 Observation류 JSON 파일을 여러 개 만드는 CVE는 이
  자동 대조를 그대로 통과해야 하므로, 해시값을 손으로 옮겨 적다가 생기는 오타/누락이
  Gate 단계에서 바로 걸러짐
