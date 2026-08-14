# 취약점 발견 요약 — bootcamp-ctf-auth-login

## 대상 (Target)

Metabase v0.46.6, `100.121.79.125:3000` (부트캠프 CTF, Tailscale VPN 경유)

## 보낸 요청

`GET /auth/login?redirect=%2F` → `GET /api/session/properties` → `POST /api/setup/validate`
(익스플로잇 시도 2회, 상세는 `all-requests.md`)

## 결과

- 버전·setup-token 노출로 CVE-2023-38646(Metabase pre-auth RCE) 전제 조건 일치까지 확인(FACT).
- 실제 RCE 트리거는 **아직 미확인**(400 Bad Request, H2 syntax error, 2회 모두 동일 실패 지점).
- 콜백 서버(포트 8765)에 whoami/id 결과 수신 없음 — 코드 실행까지 도달하지 못한 것으로 판단.
