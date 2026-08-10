# 고정 불변조건

- Target은 localhost 또는 현재 저장소의 격리 Compose Service다.
- 실제 Control은 GO <control_id> 뒤 실행한다.
- AI Draft와 Tool Observation을 분리한다.
- stdout, stderr, exit code, 요청, 응답, 로그, Cleanup을 보존한다.
- 취약/조치 환경에 같은 Control과 Matcher를 적용한다.
- 성공 Claim은 검토된 Evidence Ref가 있어야 한다.
- 실패, REJECTED, UNKNOWN을 삭제하지 않는다.
