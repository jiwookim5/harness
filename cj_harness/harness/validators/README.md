# Validator 작업 공간

반복 누락이 실제로 발생한 조건부터 결정적 검사로 만든다.

우선순위는 Source 없는 FACT, Scope 밖 Target, Observation 필드 누락, Same-Control 불일치,
Report Evidence 누락, 비어 있거나 오래된 Intake다.

## 알려진 한계

Day Gate는 정해진 필드와 문자열을 검사한다. 형식은 맞지만 내용이 오래됐거나 실행 전 문구가
남은 경우를 모두 판별하지는 못한다. 새 Day를 시작하거나 완료할 때 `intake.md`, Control 결정,
Evidence Review 상태와 보고서 문구를 직접 읽고 실제 Observation과 일치하는지 확인한다.
