# CTF Report — bootcamp-ctf-auth-login

## Executive Summary

대상은 `100.121.79.125:3000`(Tailscale VPN, 부트캠프 CTF 배정 IP)에서 실행 중인
**Metabase v0.46.6**이다. 이 버전은 **CVE-2023-38646**(Pre-auth RCE, 패치: 0.46.6.1)의
영향 범위에 정확히 해당하며, 인증 없이 접근 가능한 `/api/session/properties`에서
`setup-token`이 초기 설정 완료 후에도 계속 노출되고 있어 이 CVE의 알려진 전제 조건과
일치함을 확인했다(FACT, [evidence:EVID-RECON-002]).

이 전제 조건을 바탕으로 공개된 실제 작동 PoC(m3m0o/metabase-pre-auth-rce-poc) 구조를
그대로 재현해 익스플로잇을 2회 시도했으나, 두 시도 모두 서버가 `400 Bad Request`와 함께
H2 트리거 생성 단계의 SQL syntax error를 반환했고, 별도로 준비한 콜백 서버에도 아무
신호가 오지 않았다(FACT, [evidence:EVID-EXPLOIT-001] [evidence:EVID-EXPLOIT-002]).
**즉 취약점 조건은 일치하지만, 실제 코드 실행(RCE) 성립은 아직 확인되지 않았다.**

## Harness 구성

- `ctf/bootcamp-ctf-auth-login/scope.md` — 허용 Target(`100.121.79.125:3000`), CTF 승인
  기록(부트캠프 CTF, 학생 본인 승인)
- Control Card 3개(`CTL-RECON-001`, `CTL-RECON-002`, `CTL-EXPLOIT-001`)를 각각
  `GO <control_id>`로 승인받고 실행. 콜백 리스너(포트 8765, Tailscale 네트워크 노출)는
  별도로 명시적 확인을 받은 뒤 실행.

## Recon

- FACT: `GET /auth/login?redirect=%2F` 응답 헤더에서 `Set-Cookie: metabase.DEVICE=...`,
  `Server: Jetty(11.0.14)` 확인 — Metabase로 식별. [evidence:EVID-RECON-001]
- FACT: `GET /api/session/properties`(인증 불필요) 응답에서 `version.tag: v0.46.6`,
  `setup-token: 17de1587-39de-4144-b17f-410bc5100b24`, `has-user-setup: true` 확인.
  [evidence:EVID-RECON-002]
- FACT: Metabase 공식 보안 공지 기준 CVE-2023-38646은 0.46.6 이하(패치 0.46.6.1) 등
  여러 버전대에 영향을 미치며, "setup 완료 후에도 setup-token이 유효하게 남아
  `/api/setup/validate`를 통한 H2 JDBC 기반 RCE에 재사용될 수 있다"는 것이 알려진
  익스플로잇 체인이다. (상세: `recon.md` Source Ref)

## 실행과 Evidence

| Control | 요청 | 결과 | Evidence |
| --- | --- | --- | --- |
| CTL-RECON-001 | GET /auth/login | 200, Metabase 식별 | EVID-RECON-001 |
| CTL-RECON-002 | GET /api/session/properties | 200, 버전+setup-token 노출 확인 | EVID-RECON-002 |
| CTL-EXPLOIT-001 (1차) | POST /api/setup/validate (자체 구성 payload) | 400, H2 syntax error | EVID-EXPLOIT-001 |
| CTL-EXPLOIT-001 (2차) | POST /api/setup/validate (원본 PoC 구조 재현) | 400, H2 syntax error, 콜백 없음 | EVID-EXPLOIT-002 |

두 익스플로잇 시도는 실행 명령의 형태(exec 호출 방식)만 다르고 나머지 페이로드 구조는
동일했는데 결과가 같았다 — 이는 실패 지점이 우리가 만든 실행 명령 자체가 아니라, 그보다
앞단(H2 트리거의 `$$//javascript` 스크립트 엔진 전환 자체, 또는 이 인스턴스의 H2/Janino
컴파일 경로)일 가능성을 시사한다(INFERENCE, 아직 검증 안 됨).

## AI 활용과 검증

- CVE 식별, Root Cause 설명, 초기 익스플로잇 페이로드 초안은 AI(Claude)가 작성했다.
- 1차 페이로드는 AI가 웹 요약을 바탕으로 재구성한 것이었고, 정확한 문법을 얻기 위해
  공개 PoC 원본 소스(`raw.githubusercontent.com`)를 직접 가져와 2차 페이로드를
  1:1로 재현했다 — 그럼에도 동일한 오류가 발생했다는 게 이번 조사에서 가장 중요한
  사실이다.
- 모든 `GO <control_id>` 승인과, 콜백 리스너처럼 승인 범위가 불명확했던 추가 동작에
  대한 별도 확인은 학생이 직접 했다.

## 신뢰 근거와 Evidence Ref

- `evidence/index.json` — EVID-RECON-001/002, EVID-EXPLOIT-001/002 전부 등록,
  `report_eligible: true`
- `evidence/all-requests.md`, `evidence/all-results.md` — 보낸 요청/받은 결과 전문
- `evidence/finding-summary.md` — 요약본

## 실패와 한계

- UNKNOWN: 왜 원본 PoC와 동일한 구조인데도 syntax error가 나는지 근본 원인을 아직
  모른다. 후보(미검증):
  - 이 인스턴스에 번들된 H2 버전이 `//javascript` 스크립트 엔진 트리거 컴파일 경로를
    다르게 처리할 가능성
  - `zip:/app/metabase.jar!/sample-database.db` 경로가 이 배포 환경(컨테이너 이미지 등)
    에서 다를 가능성 — jar 실제 경로가 `/app/metabase.jar`가 아닐 수 있음
  - JSON 인코딩 과정에서 `\;`, 개행 등이 원본 curl(Python `requests` json=payload)과
    미묘하게 다르게 직렬화됐을 가능성
- 콜백 서버는 두 시도 동안 로컬 헬스체크 요청 1건 외에 타겟에서 온 요청을 전혀
  수신하지 않았다 — 코드 실행 자체가 아예 트리거되지 않았다는 뜻으로 판단한다.

## Harness 개선과 다음 Target

- `checkRun()`이 요구하는 Evidence 구조(요청 전문/결과 전문/finding-summary)가
  "성공 사례"뿐 아니라 지금처럼 "시도했지만 아직 실패"인 상태도 그대로 기록하기에
  적합했다 — 실패를 숨기지 않고 정직하게 남기는 게 이 harness의 원래 설계 의도와
  맞다.
- 다음 Target 재사용 팁: 공개 PoC를 재구성할 때는 처음부터 AI 요약이 아니라 원본
  소스 파일을 직접 받아서 재현하는 게 시행착오를 줄인다(이번에 1차 시도에서
  겪은 것과 같은 재구성 오류를 피할 수 있음).
