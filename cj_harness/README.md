# Security Wave CVE Harness Starter

이 저장소에서 AI 기반 CVE 분석 Harness를 직접 구축합니다.

## 학생 시작

1. 이 저장소를 clone하거나 GitHub의 **Code → Download ZIP**으로 내려받아 새 학생 폴더로 연다.
2. 원본 저장소와 강사용 자료는 수정하지 않는다.
3. 학생 폴더에서 Claude Code Sonnet 세션을 열고 강의 PPT의 프롬프트를 순서대로 입력한다.

세션 1은 질문 → Scope → 공식 Source → Claim Review → Root Cause/CWE → D1 GO까지 진행한다.
세션 2는 공식 코드 재확인 → benign loopback Lab → Control Card → 정확한 Human GO →
Evidence Review → 보고서 → Harness v1 → clean-clone 검증까지 진행한다.

첫 채팅 입력:

    DAY 1 START

AI가 질문하기 전에 완성 Lab, 공격 코드, 보고서를 만들려고 하면 중지시키세요.
`GO <control_id>`의 정확한 형식이 아니면 `알아서 해`, `진행해`도 실제 실행 승인이 아닙니다.

기본 명령:

    npm test
    npm run validate
    npm run check -- D1
    npm run new:cve -- CVE-2026-0001

기본 강의는 고정 HTTP Probe를 사용합니다. Nuclei는 선택 확장 도구이며 이번 기본 절차에는 필요하지 않습니다.
승인된 localhost Lab 밖에서는 어떤 보안 Control도 실행하지 않습니다.

## 실습 작업공간과 배포본 검증을 구분한다

    npm test
    npm run validate
학생이 D2/D3에서 만든 Raw Evidence는 삭제하지 않는다. Git에는 포함되지 않지만 live 작업공간에는
존재하므로 배포본 누출 검사인 `npm run validate`가 REVISE를 내는 것이 정상이다. 학생 작업의 완료
판정은 D1/D2/D3 Gate와 전체 테스트로 확인하고, 현재 결과의 재현성은 검토한 산출물을 커밋한 뒤
새 local clean clone에서 확인한다.

강사용 starter 배포본은 별도 기준 저장소에서 다음을 확인한다.

    npm test
    npm run validate
    npm run pack
    unzip -t dist/security-wave-cve-harness-starter.zip

starter 배포본은 D1, D2, D3 학생 산출물이 비어 있으므로 day check가 REVISE인 상태가 정상이다.
완성 답안, Raw Evidence, 실제 Target, Credential은 포함하지 않는다.

Day check 종료 코드는 GO=0, REVISE=1, STOP=2다. 빈 작업이나 증빙 누락은 REVISE이고, 명시적인 Scope 위반과 위험 설정은 STOP이다.
