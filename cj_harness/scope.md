# Scope

## D1 Scope (포함)

- 대상 CVE: CVE-2021-41773 (Apache HTTP Server)
- 허용 Target: 127.0.0.1 (D2/D3에서만 사용, D1은 실행 없음)
- 공식 Source(Apache 공식 `vulnerabilities_24.html`, 보조로 GHSA)와 공식 Repository의 Patch Diff(`server/util.c`, 2.4.49 → 2.4.50)를 비교해 Root Cause/CWE 근거를 확보한다.
- 실행은 127.0.0.1/localhost 또는 이 저장소가 만든 격리 Lab marker에만 한정한다.
- 확인되지 않은 값은 UNKNOWN으로 남기고 추측으로 채우지 않는다.

## Out of Scope

- 공인 IP, 외부 Domain, 실제 운영 Target에 대한 어떤 요청·스캔도 하지 않는다.
- Credential 수집, 파괴적 동작, 지속성(persistence), Reverse Shell을 만들지 않는다.
- D1에서는 실행형 Control(공격 코드 실행, Docker Lab 기동)을 하지 않는다 — 이 단계는 Source·코드 분석에 한정한다.
- Nuclei 등 확장 Scan 도구는 기본 절차에 포함하지 않는다.

## STOP 조건

- 요청 대상이 127.0.0.1/localhost 또는 이 저장소의 격리 Lab marker가 아니면 즉시 중지한다.
- Source 근거 없이 FACT로 기록하려는 시도가 발견되면 중지하고 UNKNOWN으로 되돌린다.
- Control Card 없이, 또는 정확한 `GO <control_id>` 형식이 아닌 승인으로 실행을 요청받으면 중지한다.
- "알아서 해", "진행해" 같은 일반 승인은 실행 승인으로 간주하지 않고 중지한다.
- Scope 밖 자산(강사용 원본, 학생 작업공간 밖 파일)에 대한 수정 요청이 오면 중지한다.
- Cleanup 없이 Lab을 종료하려는 요청이 오면 중지한다. D2/D3에서 실행한 모든 Control은 완료 직후 Cleanup(컨테이너 종료·임시 파일 삭제)을 수행하고 그 결과를 기록해야 한다.

## Human과 AI의 역할·승인 계약

- AI(Claude)는 Source 탐색 보조, 초안 작성, Tool Observation 실행, 분석 초안(Root Cause/CWE 후보) 제시까지만 한다.
- AI는 Scope를 승인하지 않는다.
- AI는 실행 권한을 승인하지 않는다.
- AI는 성공 여부를 확정하지 않는다.
- AI는 Evidence와 독립 Review를 확정하지 않는다.
- 학생(Human)은 공식 Source를 직접 열람·확인하고, Scope를 승인하며, 실 Control 실행 전 `GO <control_id>`로 승인하고, 최종 Root Cause/CWE/성공 여부/Evidence 채택을 확정한다.

## FACT / INFERENCE / UNKNOWN 분류 규칙

- FACT: 공식 Source(1차: Apache 공식 문서·Repository, 보조: GHSA·NVD 등)에서 직접 확인한 내용만 해당하며 Source Ref(SRC-xxx)를 반드시 남긴다.
- INFERENCE: Source에 명시되지 않았지만 Source·코드로부터 합리적으로 추론한 내용. INFERENCE임을 명시하고 반증 조건(무엇이 관찰되면 틀렸다고 판단할지)을 함께 적는다.
- UNKNOWN: 아직 확인하지 못한 값. 확인 전까지 임의로 채우지 않는다.
- AI가 제시하는 모든 내용은 기본적으로 AI Draft이며, Source Ref가 붙기 전까지 FACT로 승격하지 않는다.
