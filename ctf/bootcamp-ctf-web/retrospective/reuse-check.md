# Reuse Check

bootcamp-ctf-web 진행 중 실제로 발생한 Blocker를 기록한다. 실패는 삭제하지 않는다.

## 요약

- Blocker: 대상이 Tailscale VPN에서 일시적으로 오프라인(1), `SUBSTRING`/`UPDATEXML`/`DATABASE` 키워드 필터로 error-based 페이로드가 깨짐(2)
- Harness 변경: 없음 — 대기/전략 대체로 해결된 사례
- 다음 Target: Tailscale 대상 재확인 절차, 키워드 블랙리스트 필터 우회(동의어 함수 대체) 전략을 그대로 재사용 가능

## Blocker 1: 대상이 Tailscale VPN에서 일시적으로 오프라인

- **실패 Ref**: 세션 중 `curl -m 8 http://100.121.79.125/`가 반복적으로 `curl: (28) Connection timed out`, `tailscale status`에 `desktop-coes4ti ... offline, last seen Nm ago`, `tailscale ping`도 전부 timeout으로 확인
- **원인**: 타겟 머신(desktop-coes4ti, 학생 소유)의 Tailscale 클라이언트가 재부팅 이후 즉시 재연결되지 않음 — 우리 요청으로 인한 DoS는 아닌 것으로 판단(정적 GET 몇 건 수준)
- **변경 위치**: 없음 — harness 정책 변경 불필요. `ScheduleWakeup`으로 일정 시간 후 재확인하는 방식으로 대응
- **같은 입력 재실행 결과**: 재접속 후 `tailscale status`가 `active; direct ...`로 전환되고 동일 요청(`GET /`)이 200으로 정상 응답 — 재실행 시 동일하게 재현/복구됨
- **다음 Target 재사용 영향**: 원격 VPN 경유 CTF 대상에서 연결 끊김이 발생하면 무리하게 재시도 루프를 돌리지 말고 `tailscale status`/`tailscale ping`으로 상태를 먼저 확인한 뒤 학생에게 알리고 대기하는 절차를 recon 체크리스트에 추가할 가치가 있음(제안)

## Blocker 2: 키워드 블랙리스트 필터가 error-based SQLi 표준 페이로드를 깨뜨림

- **실패 Ref**: `CTL-EXPLOIT-005`(`evidence/all-requests.md` 요청 10, `evidence/all-results.md` 결과 10) — `SUBSTRING(VERSION(),1,1)`이 `sub strING(VERSION(),1,1)`로 깨짐; `CTL-EXPLOIT-007`(요청 12/결과 12) — `updatexml`/`database()`가 `up datexml`/`data base()`로 깨짐
- **원인**: `lib/out.banner.php` 앞단(또는 쿼리 조립 직전)에 특정 키워드 하위 문자열(`substr`, `update`, `database` 등으로 추정)을 감지해 공백을 삽입하는 블랙리스트 필터가 존재
- **변경 위치**: 없음 — payload를 필터 목록에 없는 동의어 함수(`extractvalue`, `schema()`)로 교체하는 전략으로 우회
- **같은 입력 재실행 결과**: `extractvalue(1,concat(0x7e,version()))`, `extractvalue(1,concat(0x7e,user()))`, `extractvalue(1,concat(0x7e,schema()))` 전부 필터를 통과해 각각 MySQL 버전(`5.1.73`), DB 계정(`wizmall@172.18.0.3`), 스키마(`wizmall`)를 정상 추출함(`CTL-EXPLOIT-006/008/009`)
- **다음 Target 재사용 영향**: 오래된 PHP 기반 CTF 문제에서 표준 SQLi 페이로드(`SUBSTRING`, `UPDATEXML`, `DATABASE` 등)가 깨지면 블랙리스트 필터를 의심하고, 즉시 동의어/대체 함수(`extractvalue` ↔ `updatexml`, `database()` ↔ `schema()`, `sleep()` ↔ `benchmark()` 등)로 교체 시도하는 것을 error-based SQLi 확인 절차의 기본 스텝으로 재사용할 수 있음
