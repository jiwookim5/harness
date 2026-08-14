# All Results — bootcamp-ctf-auth-login

## 결과 1 (EVID-RECON-001)

```
HTTP/1.1 200 OK
Server: Jetty(11.0.14)
Set-Cookie: metabase.DEVICE=44d589f6-1a09-4861-b40b-50a1d2f48ad6;HttpOnly;Path=/;...
```

판정: 대상은 Metabase (Jetty 기반).

## 결과 2 (EVID-RECON-002)

```json
{
  "version": {"date": "2023-06-29", "tag": "v0.46.6", "branch": "release-x.46.x", "hash": "1bb88f5"},
  "setup-token": "17de1587-39de-4144-b17f-410bc5100b24",
  "has-user-setup": true,
  "token-features": {"sso": false, "whitelabel": false, "sandboxes": false, "hosting": false, ...}
}
```

판정: 버전 v0.46.6은 CVE-2023-38646(패치: 0.46.6.1) 취약 버전 범위에 정확히 해당.
setup 완료(`has-user-setup: true`) 후에도 `setup-token`이 계속 노출됨 — 이 CVE의 전제 조건과 일치.

## 결과 3 (EVID-EXPLOIT-001, 1차 시도)

```
HTTP/1.1 400 Bad Request
{"message":"Error creating or initializing trigger \"T1\" object, class \"..source..\",
cause: \"org.h2.message.DbException: Syntax error in SQL statement ...\"}
```

판정: **RCE 미확인**. H2가 CREATE TRIGGER의 JS 소스를 파싱하는 단계에서 syntax error로 실패.
콜백 서버(8765)에 whoami/id 결과 수신 없음.

## 결과 4 (EVID-EXPLOIT-002, 2차 시도 — 원본 PoC 구조로 재현)

```
HTTP/1.1 400 Bad Request
{"message":"Error creating or initializing trigger \"MYPBRXUTSZHE\" object, class \"..source..\",
cause: \"org.h2.message.DbException: Syntax error in SQL statement ...\"}
```

판정: **RCE 미확인**. 공개된 실제 작동 PoC(m3m0o/metabase-pre-auth-rce-poc)의 요청 구조를
그대로(1:1) 재현했음에도(마지막 `{bash,-i}` → `{bash}` 교체만 제외) 동일한 syntax error.
콜백 서버 로그에는 이 요청과 관련된 접근 없음 — 로컬 헬스체크 1건(`GET /`)만 기록됨.

## 비교

| 시도 | exec 형태 | 명령 | 결과 |
| --- | --- | --- | --- |
| 1차 (EVID-EXPLOIT-001) | `Runtime.exec(String[])` (자체 구성) | curl 콜백 | 400, syntax error |
| 2차 (EVID-EXPLOIT-002) | `Runtime.exec(String)` + brace-expansion (원본 PoC 구조 재현) | curl 콜백 | 400, syntax error |

두 시도 모두 실행 명령의 형태만 다르고 나머지(트리거 생성 방식, `$$//javascript` 진입,
JDBC db 문자열 구조)는 동일 — 실패 지점이 명령 자체가 아니라 더 앞단(트리거/스크립트
파싱 자체)일 가능성을 시사함(INFERENCE, 아직 확인 안 됨).
