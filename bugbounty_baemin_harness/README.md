# 배달의민족 버그바운티 — 침투테스트 프로젝트

## 개요

- **플랫폼**: 파인더갭(FinderGap) 공식 버그바운티 프로그램
- **대상**: 배달의민족(baemin.com) 및 관련 서비스
- **목표**: 보안 취약점 발견/보고 및 보상 획득
- **범위**: scope.md에 명시된 in-scope 호스트만

## 프로젝트 구조

```
bugbounty-baemin/
├── README.md           (이 파일)
├── AGENTS.md           (AI 하네스 계약서)
├── scope.md            (파인더갭 공식 규칙 + 대상 범위)
├── CLAUDE.md           (프로젝트별 지시사항)
├── recon.md            (정찰 결과 축적)
├── report.md           (최종 보고서)
├── evidence/           (버그 증거 및 PoC)
│   ├── raw/            (원본 요청/응답)
│   └── masked/         (민감정보 제거본)
└── retrospective/      (재현 검증 및 사후분석)
```

## 하네스 구조

이 프로젝트는 `harnesss/` 저장소의 AGENTS.md 계약서를 상속받습니다:

- **AI는 증거가 아니다** — Tool Observation만 증거로 취급
- **사람에게 남는 결정** — Scope 승인, 성공 확정, Evidence 채택은 항상 사람이 결정
- **증거 규율** — FACT / INFERENCE / UNKNOWN 엄격히 구분
- **Safety 원칙** — 파인더갭 공식 규칙 및 in-scope 범위만 테스트

## 시작하기

1. `scope.md` 읽고 대상 범위 확인
2. `AGENTS.md`로 하네스 규칙 숙지
3. recon 시작 — "진행해"로 포괄 승인 주기
4. 취약점 발견 시 증거 수집 (raw + finding-summary)
5. 최종 보고서 작성 후 파인더갭에 제출

---

**상태**: 초기화 완료, recon 대기 중
