# toIT 펜테스트 프로젝트

## 개요

- **클라이언트**: toIT (상용 앱)
- **프로젝트 유형**: 고객 계약 기반 펜테스트 (Penetration Testing)
- **목표**: 앱(또는 서비스)의 보안 취약점 발견 및 보고
- **범위**: 계약서에 명시된 in-scope 기능/호스트만
- **산출물**: 펜테스트 보고서 + PoC + 재현 가이드

## 펜테스트 단계

```
1. Kickoff & Planning        (계약 확인, 테스트 계획)
2. Reconnaissance            (정찰, 앱 분석)
3. Vulnerability Assessment  (취약점 탐색)
4. Exploitation              (PoC 작성)
5. Reporting                 (보고서 작성)
6. Presentation              (고객 설명)
7. Remediation Verification  (패치 후 재테스트)
```

## 프로젝트 구조

```
toit-pentest/
├── README.md                    (이 파일)
├── AGENTS.md                    (AI 하네스 계약서)
├── scope.md                     (고객 계약 범위)
├── CLAUDE.md                    (프로젝트별 지시사항)
├── pentest-plan.md              (평가 계획서)
├── recon.md                     (정찰 단계 기록)
├── vulnerability-assessment.md  (취약점 평가)
├── report.md                    (최종 펜테스트 보고서)
├── evidence/
│   ├── raw/                     (원본 요청/응답, 스크린샷)
│   ├── masked/                  (민감정보 제거본)
│   └── poc/                     (PoC 스크립트)
├── execution/
│   ├── control.json             (실행한 Control 로그)
│   └── observation.json         (관찰 결과)
└── retrospective/               (재현 검증, 사후분석)
```

## 계약 기반 작업

- **Scope 승인**: 고객사(toIT) 서명 또는 이메일 승인 필수
- **타임라인**: 계약서에 명시된 테스트 기간 준수
- **NDA**: 발견한 취약점/고객 정보는 계약 기간 동안 비공개 유지
- **보상**: 계약서 조건에 따름

## 하네스 구조

이 프로젝트는 AGENTS.md를 상속받되, **고객 계약**이 추가됨:

- **AI는 증거가 아니다** — 발견 후보는 항상 PoC로 재현 검증
- **사람이 최종 승인** — 고객사와의 모든 주요 결정은 사람이
- **증거 보안** — 고객 정보/민감 데이터는 masked/ 폴더에만 저장
- **계약 준수** — Scope 밖의 테스트는 절대 금지

---

**상태**: 초기화 완료, kickoff meeting 대기 중
