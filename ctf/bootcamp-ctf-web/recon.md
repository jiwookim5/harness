# Recon — bootcamp-ctf-web

AI Draft. Source Ref 없는 문장은 FACT로 확정하지 않으며, 학생 확정 전까지 최종
결론으로 취급하지 않는다.

## 대상 정보

- 문제/머신: 부트캠프 CTF — 새 웹 문제 (Flag 없음, 취약점 발견이 목표)
- 플랫폼: 부트캠프 CTF (Tailscale VPN 경유, 100.121.79.125:80)
- 알려진 서비스/포트: 100.121.79.125:80 — Apache/2.2.34 (Unix), PHP/5.2.17, "숍위즈(Shop-Wiz)" 무료 쇼핑몰 솔루션 (매우 오래된 스택)

## 상세 근거

- FACT: `CTL-RECON-001` (`GET /`) 응답 헤더에서 `Server: Apache/2.2.34 (Unix)`, `X-Powered-By: PHP/5.2.17` 확인. 페이지 title에 "숍위즈(http://www.shop-wiz.com)" 명시. [SRC-001]
- FACT: `CTL-RECON-002` (링크/폼 액션 수집) 결과 주요 엔드포인트 확인: `wizhtml.php?html=`, `wizmart.php?query=&optionvalue=`, `wizboard.php?BID=&GID=`, `wizmember.php?query=`, `wizsearch.php?keyword=`. [SRC-001]
- FACT: `CTL-RECON-003` (`GET /wizmart.php?query=option&optionvalue=2`) 응답에 PHP Warning이 그대로 노출됨: `array_flip() ... in /usr/local/apache2/htdocs/wizmart.php on line 161` — `display_errors`가 켜져 있어 서버 절대 경로가 에러 메시지로 노출됨. [SRC-001]
- FACT: `CTL-RECON-004` (`wizhtml.php?html=` traversal/LFI 시도: `../`, `....//`, `..%2f`, null byte, `php://filter`) 전부 동일하게 `<script>alert('잘못된 경로 사용');history.go(-1);</script>` 응답으로 차단됨. 반면 영숫자만으로 구성된 임의 값(`test123`, `nonexistentpage`)은 정상 200 페이지(fallback 렌더링으로 추정)를 반환함. [SRC-001]
- INFERENCE: `wizhtml.php`의 `html` 파라미터 필터는 "허용된 값 화이트리스트"가 아니라 특정 위험 문자(`/`, `<`, 널바이트 등으로 추정)에 대한 블랙리스트 방식일 가능성이 높다 — 영숫자 값은 통과하되 존재하지 않는 파일이어도 에러 없이 기본 페이지가 렌더링되는 점이 근거. 반증 조건: 실제 include()/require() 코드를 확인하거나, 블랙리스트에 없는 다른 구분자(예: 유니코드 정규화, 이중 인코딩, Windows 드라이브 문자 등)로 우회에 성공/실패하는 결과가 나오면 이 추론을 갱신해야 한다.
- FACT: `CTL-RECON-005` (`GET /wizhtml.php?html=test123`) 응답 HTML 중 `<input type="hidden" name="log_from" value="/wizhtml.php?html=test123">` 확인 — 최초 관찰 시 `html` 값이 이스케이프 없이 반사되는 것처럼 보였음. [SRC-001]
- FACT: `CTL-RECON-006` (`html=test"`, `html=test<b>`를 `curl --data-urlencode`로 전송) 결과 `log_from` 값에는 `%22`, `%3cb%3e`처럼 URL-encoded 형태로 남아있어, 실제로는 `$_GET['html']`을 디코딩해서 그대로 출력하는 게 아니라 `$_SERVER['REQUEST_URI']` 등 인코딩이 보존된 값을 쓰는 것으로 보임 — 이 경로로는 즉시 Reflected XSS가 성립하지 않는 것으로 판단됨. [SRC-001]
- FACT: 대상이 후속 테스트 도중 Tailscale VPN 상에서 일시적으로 오프라인이었다가(연결 타임아웃, ping 100% loss, `tailscale status`에 `desktop-coes4ti ... offline`로 표시) 학생이 재접속시킨 뒤 정상 응답으로 복귀함. 우리 요청으로 인한 DoS인지 여부는 확인되지 않았고, 재접속 이후 문제 없이 계속 진행됨. [SRC-001]
- FACT: `CTL-RECON-007` (`GET /wizboard.php?BID=board01%27&GID=root`) 응답은 `<script>alert('\n\n폴더가 존재하지 않습니다.\n\n');</script>` — `BID`는 실제 디렉터리/화이트리스트 존재 여부로 검증되는 것으로 보이며, 이 경로 단독으로는 SQLi 증거가 나오지 않음. [SRC-001]
- FACT: `CTL-RECON-008` (`GET /wizsearch.php?...&keyword=%27`) 응답에서 baseline 대비 `keyword` 값이 `\'`(백슬래시 이스케이프)로 반영됨 — `magic_quotes_gpc`류 이스케이프가 켜져 있음. [SRC-001]
- INFERENCE: 위 결과로 볼 때 문자열 파라미터의 quote 기반 SQLi는 `wizsearch.php`에서 직접 성립하지 않는 것으로 판단된다. 반증 조건: 다른 인코딩(이중 URL 인코딩, 유니코드 등)으로 이스케이프를 우회하는 결과가 나오면 이 추론을 갱신해야 한다.
- FACT (핵심 발견): `CTL-EXPLOIT-001`~`004` (`GET /lib/out.banner.php?uid=`)에서 `uid=1`/`uid=1 AND 1=1`(참)일 때 `Location: /`, `uid=99999`/`uid=1 AND 1=2`(거짓)일 때 빈 `Location`으로 4회 일관되게 갈려 boolean-based blind SQL Injection이 성립함을 확인. [SRC-001, evidence: EVID-EXPLOIT-001~004]
- FACT (핵심 발견): `CTL-EXPLOIT-005`~`009`에서 서버가 MySQL 에러 메시지에 실행된 쿼리 원문(`select url from wizbanner where uid=1 AND ...`)을 그대로 노출함을 확인. `extractvalue()`로 error-based 데이터 추출에 성공해 MySQL 버전 `5.1.73`, DB 계정 `wizmall@172.18.0.3`, 스키마명 `wizmall`을 실제로 뽑아냄 — 완전히 성립하는 error-based SQL Injection (CWE-89). [SRC-001, evidence: EVID-EXPLOIT-005~009]
- FACT: `SUBSTRING`, `UPDATEXML`, `DATABASE` 등 특정 키워드는 서버 필터에 걸려 중간에 공백이 삽입되지만(`sub strING`, `up datexml`, `data base`), `extractvalue()`, `schema()`처럼 필터 목록에 없는 동의어/대체 함수로 손쉽게 우회됨. [SRC-001]
- INFERENCE: 위 필터 동작은 화이트리스트가 아닌 단순 블랙리스트 문자열 치환 방식으로 추정된다. 반증 조건: 실제 필터 소스코드를 확인하거나, 다른 미시도 키워드(예: `SELECT`, `UNION`, `SLEEP`)로도 동일한 공백 삽입 패턴이 재현되지 않으면 이 추론을 갱신해야 한다.
- UNKNOWN: 실제 회원 테이블(`wizmember` 등)의 컬럼/데이터까지는 Scope의 Credential 수집 금지 조항에 따라 추출을 시도하지 않았다 — 학생이 추가 진행 여부를 결정해야 한다.

## Source Ref

- [SRC-001] 관찰 — `CTL-RECON-001`~`008`, `CTL-EXPLOIT-001`~`009` 실제 요청/응답 (`evidence/all-requests.md`, `evidence/all-results.md`, `evidence/finding-summary.md`)
