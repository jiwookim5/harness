# 개인 Harness

이 디렉터리에는 모든 CVE에 재사용할 Workflow, Policy, Prompt, Validator, Template, Changelog만 둔다.

특정 CVE의 URL, 버전, Payload, 결과는 cves/CVE-ID에 둔다.

학생은 첫 사이클에서 실제 실패를 경험한 뒤 Harness v0을 v1로 개선한다.

## 다음 CVE에 재사용할 최소 패턴

- 취약/조치 환경을 별도 Control로 쪼개지 않고 하나의 lifecycle에서 같은 요청과 Matcher를 적용한다.
- Lab은 deny-by-default로 설정하고 실습 소유 marker 경로만 최소로 연다.
- Setup 실패, transport 실패, 정상 HTTP 차단과 Matcher 결과를 서로 다른 상태로 기록한다.
- Image digest는 태그 재조회가 아니라 실제 실행 중인 container에서 기록한다.
- 공식 Source 페이지가 막혀도 같은 공식 저장소의 raw 파일 경로를 먼저 시도하고, 실패하면 UNKNOWN으로 남긴다.
- Day Gate가 GO여도 intake와 상태 문구가 비어 있거나 오래되지 않았는지 학생이 직접 확인한다.
