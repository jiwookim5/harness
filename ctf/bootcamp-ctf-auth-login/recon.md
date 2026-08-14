# Recon — bootcamp-ctf-auth-login

AI Draft. Source Ref 없는 문장은 FACT로 확정하지 않으며, 학생 확정 전까지 최종
결론으로 취급하지 않는다.

## 대상 정보

- 문제/머신: 부트캠프 CTF — 로그인/인증 문제
- 플랫폼: 부트캠프 CTF (Tailscale VPN 경유, 100.121.79.125:3000)
- 알려진 서비스/포트: 100.121.79.125:3000 — Metabase (Java, Jetty 11.0.14)

## 상세 근거

- FACT: `CTL-RECON-001` (`GET /auth/login?redirect=%2F`) 응답 헤더에
  `Set-Cookie: metabase.DEVICE=...`, `Server: Jetty(11.0.14)`가 확인됨 —
  대상은 Metabase(오픈소스 BI 툴)이다. [SRC-001 관찰]
- FACT: `CTL-RECON-002` (`GET /api/session/properties`, 인증 불필요) 응답에서
  `"version":{"tag":"v0.46.6","date":"2023-06-29","hash":"1bb88f5"}` 확인됨. [SRC-001 관찰]
- FACT: 같은 응답에 `"setup-token":"17de1587-39de-4144-b17f-410bc5100b24"`,
  `"has-user-setup":true`가 포함돼 있음 — 초기 설정이 이미 끝난 상태인데도
  setup-token이 인증 없이 노출되고 있다. [SRC-001 관찰]
- FACT: Metabase 공식 보안 공지에 따르면 CVE-2023-38646(Pre-auth RCE)은
  0.46.6 이하(패치: 0.46.6.1) 등 여러 버전대에 영향을 미치며, "setup-token이
  초기 설정 완료 후에도 유효하게 남아 `/api/setup/validate`를 통한 H2 JDBC
  드라이버 기반 RCE에 재사용될 수 있다"는 것이 알려진 익스플로잇 체인이다. [SRC-002]
- INFERENCE: 이 대상의 버전(0.46.6)과 setup-token 노출 상태가 CVE-2023-38646의
  전제 조건과 일치하므로, 이 CVE의 익스플로잇 체인이 성립할 가능성이 높다.
  반증 조건: 실제 `/api/setup/validate` 요청에서 H2 커스텀 클래스 로딩이
  차단되거나(패치 백포트, WAF, 추가 방어 로직 등) 다른 예외가 발생하면 이 추론은 기각된다.
- UNKNOWN: 이 인스턴스가 실제로 이 체인에 취약한지는 아직 실제 요청으로
  확인하지 않았다.

## Source Ref

- [SRC-001] 관찰 — `CTL-RECON-001`/`CTL-RECON-002` 실제 응답 (evidence 예정)
- [SRC-002] Metabase 공식 보안 공지 / GHSA — CVE-2023-38646
