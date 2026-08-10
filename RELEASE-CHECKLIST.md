# Release Checklist

- [x] npm test 전체 통과
- [x] npm run validate는 GO
- [x] D1, D2, D3 초기 상태는 REVISE
- [x] ZIP 무결성 검사 통과
- [x] ZIP에 .git과 Raw Evidence 없음
- [x] 완성 Root Cause, Exploit, Marker, 보고서 없음
- [x] Codex Student Role 확인
- [ ] Claude Code Student Role 확인
- [x] Scope STOP 확인
- [x] Human GO 대기 확인
- [x] Same-Control 불일치 차단 확인
- [x] Evidence 없는 보고서 차단 확인
- [x] 다음 CVE 생성 확인
- [x] 커밋 메시지 규약을 학생 평가로 강제하지 않음

## Acceptance Evidence — 2026-08-10

- `AUTOMATED=GO`: commit `0bc03ec`, 33 tests passed, starter validation GO.
- `CLEAN_ZIP=GO`: 28 tests passed, source-only packaging test 1 skipped, failures 0; D1/D2/D3 each returned REVISE with exit 1.
- `CODEX_LIVE=GO`: read-only clean distribution session asked only two experience/success-criteria questions and performed no file write or Control.
- `CLAUDE_CONTRACT=GO`: CLAUDE.md adapter and shared AGENTS.md boundary passed automated contract tests.
- `CLAUDE_LIVE=REVISE`: local Claude Code CLI is not authenticated (`loggedIn=false`, `authMethod=none`). Run the unchecked live role acceptance after operator login.

Claude Code 라이브 수용이 GO가 되기 전에는 릴리스 승인 태그를 만들지 않는다.
