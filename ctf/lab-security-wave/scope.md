# Scope — lab-security-wave

<!-- 값은 한 줄에 하나만 적고 줄 끝에 괄호 설명을 붙이지 않는다 — Gate가 줄 전체를
     값으로 읽는다. -->

## 대상

- 대상: Security Wave CTF 사이트
- 허용 Target: lab.security-wave.kro.kr
- CTF 승인: DRAFT — 학생 본인 확인 대기 (승인 날짜/플랫폼 확정 필요)

## Out of Scope

- 위 "허용 Target"(lab.security-wave.kro.kr) 이외의 어떤 호스트·포트에도 요청·스캔하지 않는다.
- Credential 수집(문제가 요구하는 flag 값 자체는 예외), 파괴적 동작, 지속성(persistence),
  Reverse Shell을 만들지 않는다.
- 무제한 Scan(전체 포트 스윕, 무차별 디렉터리/서브도메인 스캔)은 하지 않는다 — 화면에
  노출된 기능·엔드포인트 확인에 한정한다.

## STOP 조건

- 요청 대상이 lab.security-wave.kro.kr(및 그 하위 명시 경로)가 아니면 즉시 중지한다.
- Control Card 없이, 또는 정확한 `GO <control_id>` 형식이 아닌 승인으로 실행을
  요청받으면 중지한다.
- "알아서 해", "진행해" 같은 일반 승인은 실행 승인으로 간주하지 않고 중지한다.
- Cleanup 없이 실행을 종료하려는 요청이 오면 중지한다.

## Human과 AI의 역할·승인 계약

- AI는 Recon 보조, 초안 작성, Tool Observation 실행, 공격 경로 후보 제시까지만 한다.
- AI는 Scope·실행 권한·성공 여부·Evidence 채택을 승인하지 않는다.
- 학생(Human)은 Scope를 승인하고, 실 Control 실행 전 `GO <control_id>`로 승인하며,
  최종 성공 여부(Flag 확보 여부)와 Evidence 채택을 확정한다.
