# Recon — lab-security-wave

AI Draft. Source Ref 없는 문장은 FACT로 확정하지 않으며, 학생 확정 전까지 최종
결론으로 취급하지 않는다.

## 대상 정보

- 문제/머신: Security Wave CTF — "인증 우회" 문제
- 플랫폼: Security Wave CTF (`lab.security-wave.kro.kr`)
- 알려진 서비스/포트: nginx 리버스 프록시 뒤에 Next.js 정적 export 프론트 + `control-portal`
  API + MinIO(S3 호환 오브젝트 스토리지)

## 상세 근거

- FACT: `CTL-RECON-001` (`GET /`) 응답이 `{"service":"control-portal","status":"online"}` —
  HTML이 아니라 API 응답. [SRC-001 관찰]
- FACT: `CTL-RECON-002/003` (`GET /robots.txt`, `GET /login`) 응답이 Next.js 커스텀 404
  페이지이며 `buildId: 5oS3tYmhtJlBfJ0jOLFlb`, `nextExport:true` 확인 — 이 앱은 Next.js
  정적 export. [SRC-001 관찰]
- FACT: `CTL-RECON-004` (`GET /_next/static/<buildId>/_buildManifest.js`)에서
  `sortedPages: ["/_app","/_error"]` — 실제로 빌드된 화면 페이지가 없음. [SRC-001 관찰]
- FACT: `CTL-RECON-005/006/007` 표준/추측 경로 11개(`openapi.json`, `health`, `api`,
  `auth/login`, `docs`, `control`, `panel`, `dashboard`, `admin`, `status`, `me`) 전부
  404, `/`에 대한 `OPTIONS`/`POST`는 nginx 레벨 405. [SRC-001 관찰]
- FACT: `CTL-RECON-008` (`GET main-<hash>.js`)에서 하드코딩된 라우트 매처
  `/api\/admin\/storage(\.json)?[\/#\?]?$/` 발견 — 실제 보호 경로는
  `/api/admin/storage`. [SRC-001 관찰]
- FACT: `CTL-EXEC-002`에서 `/api/admin/storage`가 인증 없이는 `401
  administrator session required`를 반환하지만, `x-middleware-subrequest` 헤더를
  추가하면 `200`으로 통과됨. [SRC-001 관찰]
- FACT: Next.js 공식 보안 공지 기준 CVE-2025-29927(Middleware Authorization Bypass)은
  `x-middleware-subrequest` 헤더로 self-hosted 배포에서 미들웨어 실행 자체를 건너뛸 수
  있다는 것이 알려진 익스플로잇 방식이다. [SRC-002]
- FACT: 우회 응답 헤더에 `x-lab-minio-path: /minio/bootstrap/v1/verify`,
  `x-lab-ticket`, `x-lab-s3-bucket: lab-final`이 노출됨. [SRC-001 관찰]
- FACT: `CTL-EXEC-003`에서 `POST /minio/bootstrap/v1/verify`(+ 티켓 헤더)가 인증 없이
  `200`과 함께 `MinioEnv` 전체(루트 Access/Secret Key 포함)를 반환함. [SRC-001 관찰]
- FACT: MinIO 공개 보안 공지 기준 CVE-2023-28432(Information Disclosure)는
  `/minio/bootstrap/v1/verify`가 클러스터의 모든 노드에서 인증 없이 환경변수를 반환할
  수 있다는 것이 알려진 취약점이다. [SRC-003]
- FACT: `CTL-EXEC-004/005`에서 노출된 루트 Credential로 SigV4 서명 요청을 만들어
  `lab-final` 버킷을 조회, `evidence/final.json`에서 최종 flag를
  확보함. [SRC-001 관찰]

## Source Ref

- [SRC-001] 관찰 — 각 `CTL-*` 실제 요청/응답 (상세는 `evidence/all-requests.md`,
  `evidence/all-results.md`)
- [SRC-002] Next.js 공식 보안 공지 / GHSA — CVE-2025-29927
- [SRC-003] MinIO 공개 보안 공지 / GHSA — CVE-2023-28432
