# Security Wave CVE Harness Starter

이 저장소에서 AI 기반 CVE 분석 Harness를 직접 구축합니다.

첫 채팅 입력:

    DAY 1 START

AI가 질문하기 전에 완성 Lab, 공격 코드, 보고서를 만들려고 하면 중지시키세요.

기본 명령:

    npm test
    npm run validate
    npm run check -- D1
    npm run new:cve -- CVE-2026-0001

Nuclei는 선택 도구입니다. 승인된 localhost Lab 밖에서는 어떤 보안 Control도 실행하지 않습니다.

## 배포본 확인

    npm test
    npm run validate
    npm run pack
    unzip -t dist/security-wave-cve-harness-starter.zip

배포본은 D1, D2, D3 학생 산출물이 비어 있으므로 day check가 REVISE인 상태가 정상이다. 완성 답안, Raw Evidence, 실제 Target, Credential은 포함하지 않는다.

Day check 종료 코드는 GO=0, REVISE=1, STOP=2다. 빈 작업이나 증빙 누락은 REVISE이고, 명시적인 Scope 위반과 위험 설정은 STOP이다.
