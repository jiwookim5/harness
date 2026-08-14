# All Results — board-login

## 결과 1 (CTL-RECON-001)

```
HTTP/1.1 200
Server: Apache/2.4.58 (Ubuntu)
Apache2 Ubuntu 기본 설치 페이지
```

판정: 루트는 미사용 기본 페이지. 실제 서비스는 `/board/` 하위.

## 결과 2 (CTL-RECON-002)

```
HTTP/1.1 200
Set-Cookie: PHPSESSID=...
로그인 폼: POST login.php, 필드 username/password, hidden csrf_token
```

판정: PHP + 세션 기반. CSRF 토큰 존재.

## 결과 3 (CTL-RECON-003)

```
GET /robots.txt -> 404
GET /board/ -> 302 Found, Location: login.php
```

판정: robots.txt 없음. `/board/`는 로그인 여부와 무관하게 login.php로 리다이렉트(세션 쿠키는 매번 새로 발급).

## 결과 4 (CTL-EXEC-001, baseline)

```
HTTP/1.1 302 Found
Location: login.php?error=1
```

판정: 존재하지 않는 계정으로 로그인 실패 시 `error=1`로 리다이렉트. 이 응답이 baseline.
부가 발견(FACT): 같은 세션에서 이전 GET으로 받은 csrf_token을 재사용해도 정상 처리됨 —
토큰이 페이지 로드마다 아니라 세션(PHPSESSID)에 고정.

## 결과 5 (CTL-EXEC-002, 직접 SQLi 우회 3건)

```
3건 모두 HTTP/1.1 302 Found, Location: login.php?error=1 (baseline과 동일)
```

판정: **실패(FACT)**. `admin' -- `, `' OR '1'='1' -- `, `' OR 1=1 -- -` 전부 baseline과
구분 안 됨 — username 필드를 통한 직접 인증 우회는 안 됨.

## 결과 6 (CTL-EXEC-003, blind/error-based SQLi 3건)

```
1) SLEEP(5): 응답 시간 0.07초 (지연 없음), 302 -> error=1
2) 서브쿼리 SLEEP(5): 응답 시간 0.08초 (지연 없음), 302 -> error=1
3) extractvalue 에러 유도: 302 -> error=1 (에러 노출 없음)
```

판정: **실패(FACT)**. Time-based/error-based 신호 전혀 없음. username 필드는 prepared
statement 등으로 안전하게 처리되는 것으로 추정(INFERENCE) — 확정 아님, UNKNOWN(정확한
서버측 구현은 소스 확인 전까지 모름).

## 누적 판정

- username 필드 SQLi 6/6 실패 (FACT)
- password 필드는 아직 미시도
- 다음 방향: register.php로 정상 가입 후 로그인해 board 기능 자체를 탐색하기로 결정
  (학생 지시, 2026-08-14)
