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

## v1.7 (요청/결과 전문 기록 누락, 2026-08-13)

- 실패 Ref: CVE-2021-43798 발표 자료를 준비하며 "정확히 어떤 요청을 보내서 어디서
  취약점을 발견했는지"를 물었을 때, 그 답이 `execution/*.json`의 해시값과
  `evidence/raw/`(git 미추적, 대화 세션에서만 열람 가능)에 흩어져 있을 뿐, 사람이
  커밋된 파일 하나만 보고 요청 원문과 결과 원문을 전부 확인할 방법이 없었음
  원인: Same-Control 증거를 설계할 때 "기계가 읽는 구조화 데이터(JSON, 해시)"와
  "사람이 읽는 요약(report.md/html)"만 만들었고, 그 중간에 있어야 할 "가공 없는
  요청/결과 전문 기록"이 아예 산출물 종류로 존재하지 않았음. `evidence/raw/`가
  git에 안 올라가는 것 자체는 의도된 정책(비밀/원본 노출 방지)이라 문제가 아니지만,
  그 정책 때문에 커밋 가능한 대체본이 없다는 게 문제였음
  변경 위치: `harness/templates/all-requests.md`, `harness/templates/all-results.md`
  신규 추가(스켈레톤). `scripts/lib/checks.mjs`에 `checkRequestResultLogs()` 추가,
  `checkD3()`에서 호출 — `evidence/all-requests.md`·`all-results.md` 존재를 요구하고,
  `evidence/index.json`에 등록된 모든 `evidence_id`가 `all-results.md`에 실제로
  등장하는지, `all-requests.md`에 HTTP 요청 라인이 하나라도 있는지 자동 대조.
  `cves/CVE-2021-41773/`·`cves/CVE-2021-43798/` 양쪽에 실제 파일 작성(healthcheck
  포함 전체 요청과 raw 응답 본문을 그대로 옮김). `report.html`(43798)의 "09 신뢰
  근거와 Evidence Ref"에 인용 추가
  재실행: `npm test`(37/37, 신규 테스트 3개 포함), `npm run check -- D1/D2/D3`(두 CVE
  모두 GO). 검사가 실제로 작동하는지 확인하려고 43798의 `all-results.md`에서
  `EVD-D2-HTTP-001-8301`을 일부러 `REMOVED-FOR-TEST`로 바꾼 뒤 재실행 →
  `REVISE ...all-results.md: missing result for EVD-D2-HTTP-001-8301` 정확히 잡힘.
  원상복구 후 다시 GO 확인(diff로 원본과 byte-identical 확인)
  다음 CVE 재사용 영향: 앞으로 모든 CVE는 D3 Gate를 통과하려면 `evidence/all-requests.md`·
  `all-results.md`를 채워야 하고, `index.json`에 새 evidence_id를 추가하면
  `all-results.md`도 같이 업데이트해야 Gate가 통과함 — 결과만 JSON에 적고 사람이 읽을
  전문을 빼먹는 실수를 Gate 단계에서 막음

## v1.8 (근거 요약 문서가 관례로만 존재, Gate 강제 없음, 2026-08-14)

- 실패 Ref: `evidence/same-control-check.md`와 `evidence/finding-summary.md`가
  CVE-2021-43798에는 있었지만 CVE-2021-41773에는 `finding-summary.md`가 아예 없었음.
  두 파일 다 어떤 Gate도 존재를 요구하지 않아서, 있으면 좋고 없어도 통과되는 "관례"에
  불과했음 — v1.7로 요청/결과 전문은 강제했지만, 그걸 사람이 읽고 이해하도록 정리한
  요약 문서는 강제하지 않은 사각지대
  원인: `evidence/` 산출물을 설계할 때 "기계가 대조할 수 있는 것"(all-requests.md/
  all-results.md의 evidence_id 존재 여부)만 Gate 규칙으로 만들고, "사람이 근거를
  재구성할 수 있는가"는 검사 대상에서 빠졌음
  변경 위치: `scripts/lib/checks.mjs`에 `checkEvidenceWriteups()` 추가, `checkD3()`에서
  호출 — `evidence/same-control-check.md`(sha256 비교 + 판정 문구 포함) ·
  `evidence/finding-summary.md`(대상/보낸 요청/결과 세 섹션 포함) 존재를 요구.
  `harness/templates/same-control-check.md`, `finding-summary.md` 신규 추가.
  `cves/CVE-2021-41773/evidence/finding-summary.md` 신규 작성(같은 CVE의
  root-cause.md·same-control-check.md 내용을 그대로 반영)
  재실행: `npm test`(42/42, 신규 테스트 5개 포함), `npm run check -- D1/D2/D3`(두 CVE
  모두 GO). 43798의 `finding-summary.md`를 잠깐 옮겨서 없앤 뒤 재실행 →
  `REVISE ...finding-summary.md: missing`부터 각 섹션 누락까지 4건 정확히 잡힘.
  원상복구 후 다시 GO 확인
  다음 CVE 재사용 영향: 앞으로 모든 CVE는 D3 Gate를 통과하려면 `evidence/
  same-control-check.md`·`finding-summary.md`도 채워야 함 — "요청/결과 원문은 있는데
  그게 뭘 의미하는지 정리한 사람용 요약이 없는" 상태로는 더 이상 GO를 받을 수 없음

## v1.9 (CVE 학습 → CTF 모의해킹 전환, D1/D2/D3 단일 Gate로 통합, 2026-08-14)

- 배경: CVE 분석 사이클(CVE-2021-41773/43798)이 끝나서 앞으로의 작업은 CTF 모의해킹에
  포커스한다. 기존에는 D1(분석)/D2(실행)/D3(증거·보고서)를 사흘에 걸쳐 따로 승인받았는데,
  이 3단계 분리 자체를 하나의 Gate로 합쳐달라는 요청을 반영함
  변경 위치:
  - `scripts/lib/checks.mjs`: `checkExecutionConsistency`/`checkRequestResultLogs`가
    받던 `cveId` 인자를 `base`(디렉터리 prefix) 인자로 일반화하고, `checkEvidenceWriteups`를
    `checkSameControlWriteup`/`checkFindingSummaryWriteup`로 분리 — `checkD3`는 동작 변경
    없이 그대로 `cves/${cveId}`를 base로 넘김. 새 `checkRun(root, targetId)`를 추가해
    `ctf/${targetId}/`를 대상으로 D1+D2+D3에 해당하던 검사를 한 번에 수행. `isApprovedTarget()`
    추가 — loopback이거나, `scope.md`에 "허용 Target"과 "CTF 승인"(외부 대상 승인 날짜·
    승인자)이 함께 명시된 경우만 통과. `lab/compose.yaml`이 없는 경우(외부 CTF 플랫폼) Docker
    안전 검사는 건너뜀(`checkTargetCompose`). vulnerable.json/patched.json Same-Control 쌍
    비교는 CTF에 적용되지 않는 개념이라 `checkRun`에서 의도적으로 제외
  - `scripts/check-run.mjs`(신규): `npm run check:run -- <TARGET-ID>` CLI
  - `scripts/new-target.mjs`(신규): `npm run new:target -- <TARGET-ID>`로 `ctf/<TARGET-ID>/`
    작업공간 스캐폴딩 (`new-cve.mjs`와 동일 패턴)
  - `harness/templates/target-scope.md`, `recon.md`, `ctf-report.md`(신규 템플릿)
  - `harness/workflow.md`: CTF 단일 Gate 흐름을 기본으로 재작성하되, 레거시 D1 Gate가
    요구하는 `PLAN`/`HUMAN GO`/`RUN`/`CHECK` 문구는 그대로 유지해 기존 CVE 재검증이 깨지지
    않게 함. 3일 분리 CVE 흐름은 "이전 CVE 사이클(기록·이력)" 절로 보존
  - `harness/policies/invariants.md`: Target 불변조건에 CTF 외부 대상 허용 조건(허용
    Target + CTF 승인) 추가, CVE 학습 사이클은 여전히 loopback 전용임을 명시. Flag 확보는
    Credential 수집 STOP 조건의 예외임을 명시
  - `package.json`: `check:run`, `new:target` 스크립트 추가(기존 스크립트는 변경 없음)
  - `tests/run-check.test.mjs`(신규 7건), `tests/new-target.test.mjs`(신규 3건)
- 발견한 실제 버그: 첫 템플릿(`target-scope.md`)에 `허용 Target: UNSET (예: ...)`처럼 같은
  줄에 괄호 설명을 붙였더니, 정규식이 줄 전체를 값으로 읽어 "UNSET"이 아닌 것으로 오인식되고
  그 값이 자기 자신과 같다는 이유로 "CTF 승인됨"으로 잘못 통과하는 사각지대를 실제 스캐폴딩
  →Gate 실행으로 발견함. 값은 한 줄에 하나만 적고 설명은 별도 HTML 주석으로 옮겨 수정
  (intake.md 템플릿과 동일한 기존 관례를 따름)
  재실행: `npm test`(52/52, 신규 10건 포함). `npm run check -- D1/D2/D3 <CVE-ID>`로
  CVE-2021-41773/43798 둘 다 여전히 GO(레거시 Gate 무변경 확인). `npm run new:target --
  demo-smoke-test`로 실제 워크스페이스를 스캐폴딩하고 `npm run check:run`을 REVISE(빈
  스켈레톤) → 모든 필드를 채운 뒤 GO까지 실제로 재현해 확인. 외부 Target 승인 없음/있음
  두 경우 모두 실제 fixture로 STOP/GO 분기 확인
  다음 Target 재사용 영향: 앞으로 CTF Target은 `npm run new:target -- <TARGET-ID>`로
  시작하고, `npm run check:run -- <TARGET-ID>` 하나로 검증한다. `npm run check -- D1|D2|D3
  <CVE-ID>`는 기존 CVE 재검증용으로 계속 남아있지만 새 CVE 작업에는 더 이상 쓰지 않는다
