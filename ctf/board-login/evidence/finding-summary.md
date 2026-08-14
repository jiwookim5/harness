# 취약점 발견 요약 — board-login

## 대상 (Target)

`3.38.185.178`, PHP + MySQL(mysqli) 기반 게시판 (`/board/` 경로), Apache/2.4.58 (Ubuntu)

## 시도한 벡터와 결과 (FACT, 전부 정리)

| # | 벡터 | 결과 |
|---|---|---|
| 1 | 로그인 폼 SQLi (username, 직접우회 3종 + blind/error-based 3종) | 실패 — prepared statement 확인(소스 검증) |
| 2 | 검색(title/userlist) SQLi | 실패 — 전부 prepared statement |
| 3 | `view.php?id=` SQLi | 실패 — `(int)` 캐스팅 |
| 4 | 게시글 본문 / 댓글 Stored XSS | 실패 — `htmlspecialchars()` 적용 확인(소스 검증). **주의: 이전에 "unescaped 발견"으로 보고했던 `view.php?id=9`는 재검토 결과 오판이었음 — 실제로는 템플릿의 `<p>` 태그였고 content 자체는 정상 escape됨** |
| 5 | 파일 업로드 확장자 우회(.html, .php 직접) | 실패 — 화이트리스트 확장자 필터가 정상 차단 |
| 6 | `edit.php`/`delete.php` IDOR | 실패 — 소유자 검사 정상 동작(`"작성자가 아닙니다"`) |
| 7 | `download.php?id=` IDOR | **성공(FACT)** — 소유자 검사 없음. id 1~28 전수 확인, 타인 첨부파일 자유 열람 가능. 다만 flag로 보이는 파일 없음. 그 중 `cmd.gif`/`shell.php.jpg`/`shell9.php.jpg`는 PHP 웹쉘 코드를 포함하지만, 저장 경로가 웹루트 밖(`/var/www/board_uploads/`)이라 **실행 불가능한 유물로 결론**(소스 코드로 확인) |
| 8 | `/board/.git/` 노출 | **성공(FACT)** — pack 파일 포함 전체 소스 덤프 가능. `config.php`에서 `mysqli_connect("localhost","root","","K_KNOCK")` 확인 — DB root 비밀번호 공란 |
| 9 | 3306 포트 외부 접근 | 실패 — 연결 타임아웃(닫힘/필터링) |
| 10 | git tree에 없는 추가 엔드포인트(admin.php 등) 탐색 | 실패 — 전부 404 |

## 결론 (현재 시점)

- **아직 flag 미확보(UNKNOWN)**
- 전체 소스 코드(`.git` 덤프로 확보한 14개 PHP 파일 전부)를 리뷰한 결과, SQLi/XSS/업로드RCE/edit·delete IDOR는 전부 정상 방어됨
- 실제로 남은 결함은 `.git` 노출(정보노출)과 `download.php` IDOR(권한 우회) 2건이며, 둘 다 아직 flag 획득으로 이어지지 않음
- INFERENCE: 이 문제의 의도된 취약점은 `.git` 노출 또는 `download.php` IDOR 중 하나로 추정되나, 확실한 flag 경로는 아직 특정 못함
