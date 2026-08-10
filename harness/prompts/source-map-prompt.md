# 공식 Source Map Prompt

## 허용 Source

- 학생이 허용한 Vendor 공식 Advisory, 공식 CVE Record와 공식 Source Repository만 사용한다.
- 블로그, 검색 요약, 공개 PoC 저장소를 공식 Source 대체물로 사용하지 않는다.

## 접근 실패 처리

- 동적 공식 페이지가 자동 Fetch를 거부하면 같은 발행 주체가 제공하는 공식 raw JSON을 찾는다.
- Repository의 revision/view 페이지가 인증 오류를 내면 같은 공식 Repository의 version tag와
  raw 파일 경로를 직접 읽어 비교할 수 있는지 먼저 확인한다.
- 다른 미러나 CLI로 바꾸기 전 학생에게 알리고, 공식 원문을 확인하지 못한 값은 UNKNOWN으로 남긴다.
- 실패한 URL, HTTP 상태와 시도한 대체 경로도 Observation으로 보존한다.

## 기대 출력

- Source Ref, 발행 주체, 원문 URL 또는 commit/tag, 확인일, 지지하는 Claim을 표로 연결한다.
- 실제 코드 차이는 FACT 후보, 그 차이의 런타임 인과는 별도 INFERENCE로 분리한다.
- AI Claim은 학생이 ACCEPTED/CORRECTED/REJECTED/UNKNOWN 중 하나로 검토할 때까지 확정하지 않는다.
