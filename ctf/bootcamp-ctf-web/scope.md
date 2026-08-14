# Scope — bootcamp-ctf-web

<!-- 값은 한 줄에 하나만 적고 줄 끝에 괄호 설명을 붙이지 않는다 — Gate가 줄 전체를
     값으로 읽는다. 예시는 이 주석에 남긴다.
     대상 예: PicoCTF 2026 — pwn/baby-rop, 또는 HTB 머신 이름
     허용 Target 예: 127.0.0.1:PORT 또는 승인받은 외부 CTF 호스트:포트
     CTF 승인 예 (허용 Target이 loopback이 아닐 때만 필수): 2026-08-14 학생 본인 승인,
     플랫폼: PicoCTF, 문제 URL: https://... -->

## 대상

- 대상: 부트캠프 CTF — 새 웹 문제
- 목표: Flag 제출이 아닌 취약점 발견/증명(Vulnerability Finding). 성공 기준은
  학생이 Evidence를 검토해 확정한다.
- 허용 Target: 100.121.79.125
- CTF 승인: 2026-08-14 학생 본인 승인, 플랫폼: 부트캠프 CTF

## 참고

- 대상 IP는 CTF 측에서 배정받았으며, 기존 `ctf/bootcamp-ctf-auth-login`(Metabase,
  :3000)과 동일한 배정 IP의 다른 문제(:80, 숍위즈 쇼핑몰 솔루션)이다.
- 이 문제는 Flag가 없으므로, 아래 Out of Scope의 "Credential 수집" 예외(flag 값
  자체)는 적용되지 않는다 — Credential/개인정보 수집은 예외 없이 금지한다.

## Out of Scope

- 위 "허용 Target"(100.121.79.125) 이외의 어떤 호스트·포트에도 요청·스캔하지 않는다.
- Credential 수집(실제 회원 계정/비밀번호/개인정보 등), 파괴적 동작, 지속성
  (persistence), Reverse Shell을 만들지 않는다. (이 문제는 Flag가 없어 "flag 값
  자체는 예외" 조항이 적용되지 않음 — 위 "참고" 참조)
- 무제한 Scan(전체 포트 스윕, 무차별 디렉터리/서브도메인 스캔)은 하지 않는다 — 화면에
  노출된 기능·엔드포인트 확인에 한정한다.

## STOP 조건

- 요청 대상이 위 "허용 Target"(100.121.79.125)이 아니면 즉시 중지한다.
- Control Card 없이, 또는 정확한 `GO <control_id>` 형식이 아닌 승인으로 실행을
  요청받으면 중지한다 — 단, "진행해"/"알아서 해"로 작업을 맡긴 경우는
  AGENTS.md "실제 Control" 절에 따라 그 작업 범위 안 Control 실행에 대한 포괄
  승인으로 간주하고, 개별 GO 없이 연속 진행하되 각 Control의 목적·명령·결과는
  빠짐없이 로그로 남긴다.
- 포괄 승인이 있어도 아래 경우는 개별 `GO <control_id>`를 다시 받아야 하며,
  받지 못하면 중지한다 (AGENTS.md "실제 Control" 절):
  - Target이 100.121.79.125를 벗어나는 경우
  - Cleanup이 불가능하거나 되돌릴 수 없는 영향(비가역적 변경)이 예상되는 경우
  - 최초 Scope에 없던 새로운 Target·명령 범주가 추가되는 경우 (예: 실제 회원
    데이터 추출, Credential 수집)
- Cleanup 없이 실행을 종료하려는 요청이 오면 중지한다.

## Human과 AI의 역할·승인 계약

- AI는 Recon 보조, 초안 작성, Tool Observation 실행, 공격 경로 후보 제시까지만 한다.
- AI는 Scope·실행 권한·성공 여부·Evidence 채택을 승인하지 않는다.
- 학생(Human)은 Scope를 승인하고, 포괄 승인 범위를 벗어나는 실행 전 `GO <control_id>`로
  승인하며, 최종 성공 여부(취약점 확정 여부)와 Evidence 채택을 확정한다.
