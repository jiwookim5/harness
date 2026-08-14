# All Requests — lab-security-wave

## 요청 1 (EVID-RECON-001, CTL-RECON-001)

```
GET / HTTP/2
Host: lab.security-wave.kro.kr
```

## 요청 2 (EVID-RECON-002, CTL-RECON-002/003)

```
GET /robots.txt HTTP/2
Host: lab.security-wave.kro.kr

GET /login HTTP/2
Host: lab.security-wave.kro.kr
```

## 요청 3 (EVID-RECON-003, CTL-RECON-004)

```
GET /_next/static/5oS3tYmhtJlBfJ0jOLFlb/_buildManifest.js HTTP/2
Host: lab.security-wave.kro.kr
```

## 요청 4 (EVID-RECON-004, CTL-RECON-005/006/007)

```
GET /openapi.json HTTP/2
GET /health HTTP/2
GET /api HTTP/2
GET /auth/login HTTP/2
GET /docs HTTP/2
GET /control HTTP/2
GET /panel HTTP/2
GET /dashboard HTTP/2
GET /admin HTTP/2
GET /status HTTP/2
GET /me HTTP/2
OPTIONS / HTTP/2
POST / HTTP/2
Host: lab.security-wave.kro.kr (전체 공통)
```

## 요청 5 (EVID-RECON-005, CTL-RECON-008)

```
GET /_next/static/chunks/main-4c9cae3348655e81.js HTTP/2
GET /_next/static/chunks/pages/_app-da15c11dea942c36.js HTTP/2
Host: lab.security-wave.kro.kr
```

## 요청 6 (EVID-EXPLOIT-001, CTL-EXEC-002)

```
GET /api/admin/storage HTTP/2
Host: lab.security-wave.kro.kr
```

```
GET /api/admin/storage HTTP/2
Host: lab.security-wave.kro.kr
x-middleware-subrequest: middleware:middleware:middleware:middleware:middleware
```

## 요청 7 (EVID-EXPLOIT-002, CTL-EXEC-003)

```
POST /minio/bootstrap/v1/verify HTTP/2
Host: lab.security-wave.kro.kr
x-lab-ticket: b5e7ff6be25b59b678c308c519683cd3ab45b9616873f6365679e7c38bc6b918
Content-Type: application/json

{}
```

## 요청 8 (EVID-EXPLOIT-003, CTL-EXEC-004)

```
GET /lab-final?list-type=2 HTTP/1.1
Host: lab.security-wave.kro.kr
Authorization: AWS4-HMAC-SHA256 Credential=lab0ed030c5d2039adf/<date>/us-east-1/s3/aws4_request, ...
x-amz-date: <ts>
x-amz-content-sha256: <sha256 of empty body>
```

(SigV4 서명, Python stdlib `hmac`/`hashlib`로 직접 구현 — 로컬에 `aws` CLI/`boto3` 없어 대체)

## 요청 9 (EVID-EXPLOIT-004, CTL-EXEC-005)

```
GET /lab-final/README.txt HTTP/1.1
GET /lab-final/archive/decoy.json HTTP/1.1
GET /lab-final/evidence/final.json HTTP/1.1
Host: lab.security-wave.kro.kr
(각각 SigV4 서명, 위와 동일 credential)
```
