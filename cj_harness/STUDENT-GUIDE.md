# 학생 가이드

## 시작

학생 사본을 Claude Code Sonnet에서 열고 `DAY 1 START`를 입력한다. 강의 PPT를 띄운 뒤 학생이
shell 명령을 외워 입력하지 않고, 각 페이지의 `입력 프롬프트`를 Claude에 순서대로 전달한다.
모델·작업공간·권한이 다르면 시작하지 말고 강사에게 확인한다.

## D1

1. scope.md를 자기 말로 쓴다.
2. 공식 Advisory, Release Note, Repository, Patch Diff를 Source Map에 연결한다.
3. AI Claim을 ACCEPTED, CORRECTED, REJECTED, UNKNOWN으로 검토한다.
4. Root Cause, CWE, 반증 조건과 Harness v0을 기록한다.

Gate: Source 없는 FACT가 없고 CVE 관계를 구분하며 D2 성공·실패 기준이 있다.

## D2

1. localhost 취약/조치 환경과 Cleanup을 만든다.
2. 공개 PoC를 정적 검토하고 비파괴 Probe로 축소한다.
3. 기본 강의에서는 고정 HTTP Probe를 사용하고 Nuclei는 실행하지 않는다.
4. 실제 명령·Target·영향·Matcher·timeout·Cleanup을 읽고 `GO <control_id>` 뒤 실행한다.
5. stdout, stderr, exit code, 요청, 응답, 로그를 보존한다.

Gate: 외부 Target이 없고 Human GO와 실제 Observation이 있다.

## D3

1. 같은 Control과 Matcher를 취약/조치 환경에 적용한다.
2. 성공 Claim마다 Evidence Ref를 연결한다.
3. 보고서에 AI 사용, 검증, 한계, 신뢰 근거를 작성한다.
4. 동료가 Clean clone에서 재현한다.
5. Blocker를 Harness v1 변경으로 연결하고 다음 CVE Intake를 만든다.

Gate: Same-Control Retest, Evidence-backed 보고서, 재사용 가능한 Harness v1이 있다.

Nuclei 사용 여부는 평가하지 않는다. Tool Observation과 검증 품질을 평가한다.
