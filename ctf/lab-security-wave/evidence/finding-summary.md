# 취약점 발견 요약 — lab-security-wave

## 대상 (Target)

Security Wave CTF, `lab.security-wave.kro.kr` (Next.js 정적 export 프론트 + `control-portal`
API, 백엔드 스토리지: MinIO)

## 보낸 요청

`GET /` → 클라이언트 번들(`main.js`) 분석으로 `/api/admin/storage` 발견 →
`GET /api/admin/storage` (+ `x-middleware-subrequest` 헤더 우회) →
`POST /minio/bootstrap/v1/verify` (+ `x-lab-ticket`) →
SigV4 서명 S3 `ListObjectsV2`/`GetObject` (상세는 `all-requests.md`)

## 결과

- **취약점 1 — Next.js 미들웨어 인가 우회 (CVE-2025-29927 계열)**: `/api/admin/storage`가
  세션 없이는 `401`이지만, `x-middleware-subrequest` 헤더를 추가하면 미들웨어가 실행되지
  않아 인가 체크를 건너뛰고 `200`으로 통과됨. 우회 응답에 다음 단계(MinIO 검증 엔드포인트,
  1회용 티켓, 대상 버킷명)가 헤더로 그대로 노출됨.
- **취약점 2 — MinIO 정보노출 (CVE-2023-28432 계열)**: 우회로 얻은 티켓으로
  `POST /minio/bootstrap/v1/verify`를 호출하면 인증 없이 서버 환경변수 전체가 반환되고,
  그 안에 `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`(루트 Credential)가 평문으로 포함됨.
- 노출된 루트 Credential로 SigV4 서명 요청을 만들어 `lab-final` 버킷을 조회, 3개 객체 중
  `evidence/final.json`에서 최종 flag를 확보함. `archive/decoy.json`에는 의도적으로 배치된
  미끼 flag(`FLAG{not_the_final_evidence}`)가 있었음.

## 최종 Flag

`FLAG{aa5b51c2cc3f56a7ac44cedf04eceef4}`
