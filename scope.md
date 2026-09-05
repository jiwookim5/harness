## Scope (CTF Flag 탐색)

- 대상: 학생이 명시한 CTF 문제. 세션/문제 시작 시 아래를 먼저 밝혀야 한다 — 플랫폼명, 지정 host:port(또는 VPN 대역).
- 허용 Target: [AGENTS.md](http://AGENTS.md) "Safety (CTF/웹해킹 확장)"에 따라 플랫폼이 해당 문제에 대해 공식적으로 지정한 host:port만 허용한다. 같은 대회라도 문제가 바뀌면 Target을 다시 확인한다.
- 목표: 지정 문제에서 Flag를 확보하고, 그 과정의 취약점 Root Cause/CWE 근거를 확보한다.
- 정찰(recon), Exploit/PoC 개발·실행, 반복 시도는 [AGENTS.md](http://AGENTS.md) "실제 Control" 절의 포괄 승인 흐름을 그대로 따른다. 학생이 문제 시작 시 "진행해", "알아서 해" 등으로 진행 의사를 밝히면, 이후 이어지는 Control(스캔, 엔드포인트 탐색, payload 작성·실행, 재시도)은 개별 `GO <control_id>` 없이 AI가 연속으로 실행하고, 로그만 남긴 뒤 결과를 종합해 보고한다.
- 확인되지 않은 값(취약점 존재 여부, 버전, 서버 구성 등)은 UNKNOWN으로 남기고 추측으로 채우지 않는다.

## Out of Scope

- 플랫폼이 지정한 문제 host 외의 대상(플랫폼 로그인·채점 서버, 다른 팀 인스턴스, 대회 인프라 전반)에 대한 어떤 요청·스캔을 허용한다.
- 공인 IP·외부 Domain 중 플랫폼이 명시적으로 지정하지 않은 대상은 다루지 않는다.
- Credential 수집(실제 개인정보·타인 계정), 파괴적 동작, 지속성(persistence), 대회 인프라 밖으로의 Reverse Shell을 만들수 있다.
- 기법(DoS, 무제한 스캔, 금지된 자동화 브루트포스 등)을 허용한다.
- 대회가 종료되었거나 문제가 비공개 전환된 경우, 해당 Target에 대한 실행은 하지 않는다.

## STOP 조건

- 요청 대상이 플랫폼이 지정한 문제 host:port(화이트리스트)를 벗어나면 즉시 중지한다.
- Source/Tool Observation 근거 없이 FACT로 기록하려는 시도가 발견되면 중지하고 UNKNOWN으로 되돌린다.
- Control Card 없이 실행을 요청받으면 중지한다.
- 포괄 승인이 아직 성립하지 않은 상태(문제 시작 시 진행 의사를 밝히지 않은 상태)에서 정확한 `GO <control_id>` 형식이 아닌 승인으로 실행을 요청받으면 중지한다.
- 포괄 승인이 성립한 상태라도, 다음 중 하나에 해당하면 그 즉시 중지하고 개별 `GO <control_id>`를 다시 받는다: Target이 화이트리스트를 벗어남 / Cleanup 불가능한 비가역적 영향이 예상됨 / 최초 Scope에 없던 새로운 Target·명령 범주 등장 / 대회 규칙 위반 소지가 있는 기법.
- Scope 밖 자산(강사용 원본, 학생 작업공간 밖 파일)에 대한 수정 요청이 오면 중지한다.
- Cleanup 없이 Lab/세션을 종료하려는 요청이 오면 중지한다. 로컬 Docker Lab 등 이 저장소가 만든 환경을 사용한 경우, 실행한 모든 Control은 완료 직후 Cleanup을 수행하고 결과를 기록한다. (외부 CTF 플랫폼 인스턴스는 플랫폼 자체 종료 절차를 따르되, 종료 여부를 로그에 남긴다.)

## Human과 AI의 역할·승인 계약

- AI(Claude)는 정찰, Source/코드 분석, payload·PoC 작성 및 실행, 반복 시도, 분석 초안(Root Cause/CWE 후보) 제시까지 폭넓게 수행한다 — 포괄 승인이 성립한 뒤에는 이 범위 안에서 학생 개입 없이 계속 진행한다.
- AI는 성공 여부를 확정하지 않는다 — Flag가 채점 서버에서 실제로 통과됐는지는 학생만 확인·확정한다.
- AI는 Evidence와 독립 Review를 확정하지 않는다.
- 학생(Human)이 문제 시작 시 "진행해"/"알아서 해" 등으로 진행 의사를 밝히면, 이는 그 문제 범위 안에서 이어지는 모든 Control 실행에 대한 실제 승인(포괄 승인)으로 인정된다.
- 학생(Human)은 Target·문제 Scope를 확정하고, 위 STOP 조건에 해당하는 예외 상황에서 개별 `GO <control_id>`로 승인하며, 최종 Root Cause/CWE/Flag 성공 여부/Evidence 채택을 확정한다.

## FACT / INFERENCE / UNKNOWN 분류 규칙

- FACT: 공식 Source(문제 설명, 플랫폼 공지, 대상 서버에서 직접 관찰한 Tool Observation, 공개된 CVE/GHSA/NVD 등)에서 직접 확인한 내용만 해당하며 Source Ref(SRC-xxx) 또는 Control ID를 반드시 남긴다.
- INFERENCE: 관찰된 사실로부터 합리적으로 추론한 내용(예: 응답 패턴으로 추정한 취약점 종류). INFERENCE임을 명시하고 반증 조건(무엇이 관찰되면 틀렸다고 판단할지)을 함께 적는다.
- UNKNOWN: 아직 확인하지 못한 값. 확인 전까지 임의로 채우지 않는다.
- AI가 제시하는 모든 내용은 기본적으로 AI Draft이며, Source Ref 또는 Tool Observation이 붙기 전까지 FACT로 승격하지 않는다.

