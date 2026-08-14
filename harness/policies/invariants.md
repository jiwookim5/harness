# 고정 불변조건

- Target은 localhost, 현재 저장소의 격리 Compose Service, 또는 학생이 `ctf/<TARGET-ID>/
  scope.md`에 "허용 Target"과 "CTF 승인"(날짜·승인자·플랫폼)을 명시한 외부 CTF 대상이다.
  CVE 학습 사이클(`cves/CVE-*`)은 여전히 loopback 전용이다 — 이 완화는 CTF 모의해킹에만
  적용된다.
- 실제 Control은 GO <control_id> 뒤 실행한다.
- AI Draft와 Tool Observation을 분리한다.
- stdout, stderr, exit code, 요청, 응답, 로그, Cleanup을 보존한다.
- 취약/조치 환경에 같은 Control과 Matcher를 적용한다.
- 성공 Claim은 검토된 Evidence Ref가 있어야 한다.
- 실패, REJECTED, UNKNOWN을 삭제하지 않는다.

## 역할

- **AI**: 초안을 제안한다. Scope, 실행, 성공, Evidence Review, 최종 결론을 스스로 승인하지 않는다.
- **Tool**: stdout, stderr, exit code, 요청, 응답, 로그를 Observation으로 기록하며 해석을 더하지 않는다.
- **사람**: Scope, `GO <control_id>`, 성공 판정, Evidence Review와 최종 결론을 확정한다.

## Template 형식

- Root Cause와 CWE는 FACT/INFERENCE/UNKNOWN, 공식 Source Ref와 반증 조건을 포함한다.
- Source Ref가 없는 문장은 FACT로 확정하지 않고 INFERENCE 또는 UNKNOWN으로 남긴다.

## 재사용 패턴

- **Same-Control은 하나의 lifecycle로 통합한다.** 같은 Control ID, 요청, timeout과 Matcher를
  여러 loopback Target에 적용하고 Target별 Observation만 분리한다.
- **Lab은 deny-by-default다.** 전역 기본값을 명시적으로 차단하고 Lab 소유 marker처럼
  재현에 필요한 최소 경로만 예외로 연다. 실제 OS 파일이나 CGI/RCE 경로는 열지 않는다.
- **결과 클래스를 분리한다.** Setup 실패 시 요청 단계로 진행하지 않는다. 연결 거부·timeout 같은
  transport 실패와 대상의 정상적인 403/404 차단을 같은 결과로 취급하지 않는다.
- **실행 환경을 직접 기록한다.** Image digest는 태그를 다시 조회하지 않고 실제 실행 중인
  container의 image에서 확인한다.
- **Lab 실행 스크립트는 macOS 기본 bash(3.2)와 호환되게 작성한다.** 연관 배열(`declare -A`)은
  Bash 4+ 기능이라 macOS 기본 `/usr/bin/bash`에서 실패한다. Digest/버전 매핑처럼 key-value가
  필요하면 `case` 문을 쓴다. (CVE-2021-41773 D2, reuse-check.md Blocker 1)
- **시크릿이 아닌 pinned 설정값은 `.env`/`.env.*` 이름을 피한다.** 저장소 전역 `.gitignore`가
  이 패턴을 시크릿 방지용으로 차단하므로, image digest처럼 공개값만 담은 파일은 별도 이름
  (예: `digests.env`)을 쓰고 compose/스크립트에서 `--env-file`로 명시 참조한다.
  (CVE-2021-41773 D2, reuse-check.md Blocker 2)

## STOP 조건

- `알아서 진행해`, `진행해`, 과제를 맡겼다는 사실 자체는 실제 실행 승인이 아니다.
- 정확한 `GO <control_id>`가 아니면 실행하지 않는다.
- localhost, 127.0.0.1, 현재 저장소가 만든 격리 Compose Service, 또는 scope.md에 명시된
  "CTF 승인" 대상 밖의 Target은 STOP한다. 외부 Target인데 CTF 승인이 없으면 STOP한다.
- Credential 수집, 파괴 행위, 지속성, Reverse Shell, 무제한 Scan은 STOP한다. 문제가 요구하는
  Flag 값 자체를 확보하는 것은 Credential 수집이 아니다.
- Source 또는 Observation 없는 FACT를 최종 결론에 반영하려 하면 REVISE로 되돌린다.
