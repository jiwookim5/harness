# Scope — UNSET

<!-- 값은 한 줄에 하나만 적고 줄 끝에 괄호 설명을 붙이지 않는다 — Gate가 줄 전체를
     값으로 읽는다. 예시는 이 주석에 남긴다.
     대상 예: PicoCTF 2026 — pwn/baby-rop, 또는 HTB 머신 이름
     허용 Target 예: 127.0.0.1:PORT 또는 승인받은 외부 CTF 호스트:포트
     CTF 승인 예 (허용 Target이 loopback이 아닐 때만 필수): 2026-08-14 학생 본인 승인,
     플랫폼: PicoCTF, 문제 URL: https://... -->

## 대상

- 대상: UNSET
- 허용 Target: UNSET
- CTF 승인: UNSET

## Out of Scope

- 위 "허용 Target" 이외의 어떤 호스트에도 요청·스캔하지 않는다.
- Credential 수집(문제가 요구하는 flag 값 자체는 예외), 파괴적 동작, 지속성(persistence),
  Reverse Shell을 만들지 않는다.
- 무제한 Scan(전체 포트 스윕, 무차별 디렉터리/서브도메인 스캔)은 하지 않는다 — 문제가
  명시한 범위 안의 확인된 서비스만 다룬다.

## STOP 조건

- 요청 대상이 위 "허용 Target"이 아니면 즉시 중지한다.
- 허용 Target이 loopback이 아닌데 "CTF 승인"이 없으면 중지한다.
- Control Card 없이, 또는 정확한 `GO <control_id>` 형식이 아닌 승인으로 실행을
  요청받으면 중지한다.
- "알아서 해", "진행해" 같은 일반 승인은 실행 승인으로 간주하지 않고 중지한다.
- Cleanup 없이 실행을 종료하려는 요청이 오면 중지한다.

## Human과 AI의 역할·승인 계약

- AI는 Recon 보조, 초안 작성, Tool Observation 실행, 공격 경로 후보 제시까지만 한다.
- AI는 Scope·실행 권한·성공 여부·Evidence 채택을 승인하지 않는다.
- 학생(Human)은 Scope를 승인하고, 실 Control 실행 전 `GO <control_id>`로 승인하며,
  최종 성공 여부(Flag 확보 여부)와 Evidence 채택을 확정한다.
