# CTF Report — lab-security-wave

## Executive Summary

대상 `lab.security-wave.kro.kr`은 Next.js 정적 export 프론트 + `control-portal` API +
MinIO(S3 호환) 스토리지로 구성돼 있다. 클라이언트 JS 번들에서 보호 경로
`/api/admin/storage`를 발견했고, 이 경로는 세션 없이는 `401`이지만 `x-middleware-subrequest`
헤더(**CVE-2025-29927**, Next.js Middleware Authorization Bypass)로 인가 체크를 우회하면
`200`과 함께 다음 단계 정보(MinIO 검증 엔드포인트, 1회용 티켓, 버킷명)가 그대로 노출됐다
(FACT, [evidence:EVID-EXPLOIT-001]).

이 정보로 `POST /minio/bootstrap/v1/verify`를 호출하면(**CVE-2023-28432**, MinIO
Information Disclosure) 인증 없이 서버 환경변수 전체가 반환되고, 그 안에 루트
Access/Secret Key가 평문으로 포함돼 있었다(FACT, [evidence:EVID-EXPLOIT-002]). 이
Credential로 SigV4 서명 요청을 만들어 `lab-final` 버킷을 조회했고, `evidence/final.json`
에서 최종 flag `FLAG{aa5b51c2cc3f56a7ac44cedf04eceef4}`를 확보했다(FACT,
[evidence:EVID-EXPLOIT-004]).

## Harness 구성

- `ctf/lab-security-wave/scope.md` — 허용 Target(`lab.security-wave.kro.kr`), CTF 승인
  기록
- Control Card 12개(`CTL-RECON-001`~`008`, `CTL-EXEC-001`~`005`, 일부 묶음 실행)를
  각각 `GO <control_id>`로 승인받고 실행

## Recon → Exploit 체인

| 단계 | Control | 요청 | 결과 | Evidence |
| --- | --- | --- | --- | --- |
| 서비스 조사 | CTL-RECON-001~004 | GET /, /robots.txt, /login, buildManifest.js | Next.js 정적 export + control-portal API 식별, 실제 화면 페이지 없음 확인 | EVID-RECON-001~003 |
| 서비스 조사(경로 추측 실패) | CTL-RECON-005~007 | GET 11개 후보 경로, OPTIONS/POST / | 전부 404/405, 신호 없음 | EVID-RECON-004 |
| 다음 단계 정보 획득 준비 | CTL-RECON-008 | GET main-*.js | `/api/admin/storage` 라우트 매처 발견 | EVID-RECON-005 |
| 인증 우회 | CTL-EXEC-002 | GET /api/admin/storage (+x-middleware-subrequest) | 401 → 200, 다음 단계 정보(티켓/경로/버킷) 노출 | EVID-EXPLOIT-001 |
| 저장소 취약점 분석 → Credential 획득 | CTL-EXEC-003 | POST /minio/bootstrap/v1/verify (+ticket) | 200, MinIO 루트 Credential 노출 | EVID-EXPLOIT-002 |
| S3 객체 조사 | CTL-EXEC-004 | SigV4 ListObjectsV2 (lab-final) | 객체 3개 확인 | EVID-EXPLOIT-003 |
| 최종 Flag 획득 | CTL-EXEC-005 | SigV4 GetObject x3 | evidence/final.json에서 flag 확보 (decoy.json은 미끼) | EVID-EXPLOIT-004 |

## 최종 Flag

`FLAG{aa5b51c2cc3f56a7ac44cedf04eceef4}`

## AI 활용과 검증

- 경로 탐색 전략(클라이언트 번들 분석으로 전환), CVE 후보 추론(CVE-2025-29927,
  CVE-2023-28432), SigV4 서명 스크립트 작성은 AI(Claude)가 초안을 만들었다.
- 모든 실 요청(Control)은 학생이 `GO <control_id>`로 개별 승인한 뒤 실행됐다.
- 최종 flag 값과 Evidence 채택 여부는 학생이 확정한다(AI는 확정하지 않음).
