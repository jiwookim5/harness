# Claude Code — toIT 펜테스트 프로젝트 지시사항

이 파일은 이 펜테스트 프로젝트에만 적용되는 추가 지시사항입니다.
기본 하네스 규칙은 AGENTS.md를 따릅니다.

## 충돌 시 우선순위

**고객 계약 &gt; 이 파일의 지시사항 &gt; AGENTS.md &gt; 전역 CLAUDE.md**

안전성이나 계약 조건이 충돌하면 항상 더 제한적인 것을 따릅니다.

---

## 펜테스트의 특성

1. **계약 기반**: 고객사(toIT)와의 명시적 계약이 최고 권한
2. **타임라인 엄격**: 정해진 기간 내에 테스트 완료 필수
3. **기밀성 중요**: 고객 정보/발견 취약점은 절대 외부 공개 금지
4. **전문성 요구**: PTES, OWASP 표준을 따른 체계적 접근

---

## 작업 흐름

### Phase 0: Kickoff &amp; Planning

- [ ] scope.md 완성 (고객사 확인 필수)
- [ ] 테스트 환경 접근 (VPN, 계정 등)
- [ ] pentest-plan.md 작성 (평가 계획서)
- [ ] 고객사 최종 승인 ("GO")

**이 단계까지는 AI가 자동 진행하지 않음** — 모든 단계에서 사람의 확인 필요

### Phase 1: Reconnaissance

- 앱 기능 매핑 (UI 테스트, API 엔드포인트 발견)
- 기술 스택 식별 (언어, 프레임워크, 라이브러리)
- 통신 프로토콜 분석 (HTTP/S, 암호화 여부)
- 인증/세션 메커니즘 파악
- 결과 → recon.md

**승인**: "진행해"

### Phase 2: Vulnerability Assessment

- 각 기능별 취약점 테스트 (OWASP Top 10 기준)
- 수동 테스트 (자동 도구 사용 가능하나 고객 승인 필요)
- 발견 로깅 (취약점 후보 기록)
- 결과 → vulnerability-assessment.md

**승인**: "보안 평가 진행해"

### Phase 3: Exploitation &amp; PoC

- 취약점 재현 (고객 테스트 환경에서만)
- PoC 작성 (curl, Python script, 스크린샷 등)
- 영향도 평가 (CVSS, 비즈니스 영향)
- **주의**: 데이터 변조는 절대 금지, 읽기만 하기

**승인**: "PoC 작성 진행해"

### Phase 4: Reporting

- 취약점별 상세 기술서 작성
  - 설명 (What)
  - 재현 방법 (How)
  - 영향도 (Impact + CVSS)
  - 미티게이션 (제안)
- 최종 보고서 (report.md)
- Executive Summary 작성 (경영진용 요약)

**검토**: 고객사에 제출 전 사람의 최종 검토

### Phase 5: Presentation &amp; Remediation

- 고객사에 보고서 설명
- Q&amp;A 세션
- Remediation 기간 동안 클라이언트와 소통
- (선택) 패치 후 재테스트 (Remediation Verification)

---

## 금지 행동 (펜테스트 특화)

### 절대 금지

```
❌ 테스트 기간 외 접근 시도
❌ 스테이징 이외의 환경 테스트 (프로덕션 금지)
❌ 고객 실제 데이터 수정/삭제
❌ 다른 고객/사용자 계정 접근
❌ 웹셸이나 백도어 설치 (PoC 제외)
❌ 외부로 나가는 Reverse Shell
❌ 고객 정보를 GitHub, Slack, 메일 등에서 공유
❌ 보고서 미승인 배포
```

### 신중하게 (고객 승인 필수)

```
⚠️ 자동 스캔 도구 (Nuclei, Burp Pro active scan 등)
⚠️ DoS 테스트 (서비스 중단 위험)
⚠️ 다량의 요청/로드 테스트
⚠️ 고객 실제 데이터 접근 (테스트 계정만 사용)
```

---

## 증거 관리 (고객 기밀 보호)

### evidence/ 폴더 구조

```
evidence/
├── raw/           (원본 — 고객 정보 포함 가능)
│   └── [취약점별 요청/응답 로그]
├── masked/        (마스킹 처리본 — 고객 정보 제거)
│   └── [공개 가능한 버전]
└── poc/           (재현 스크립트 — 민감 정보 제거)
    └── [curl, Python script 등]
```

**규칙**:

- raw/의 파일은 외부 공개 금지
- 보고서에는 masked/ 버전만 사용
- 고객 정보(ID, 이름, 이메일 등) → `[REDACTED]` 처리
- 민감 API 키 → `[CREDENTIAL]` 처리

---

## 고객 커뮤니케이션

### 주간 보고 (필요시)

- 진행률
- 발견된 취약점 수 (조기 경보)
- 문제/이슈
- 다음 주 계획

### 긴급 보고

- **Critical/High 취약점** → 즉시 알림 (이메일/전화)
- 서비스 장애 발생 → 즉시 중단 + 알림
- 계약 범위 외 발견 → 고객 확인 후 진행 여부 결정

---

## 한국어 응답

- 한국어로 답변하되, 기술 용어(CVSS, CWE, PTES 등)는 영어 유지
- 펜테스트 표준용어 정확히 사용

---

## 성공 기준

- ✅ scope.md 완성 + 고객 승인
- ✅ 전체 In-Scope 기능 테스트 완료
- ✅ 취약점 PoC 작성 + 재현 검증
- ✅ 보고서 작성 + 고객 검토 완료
- ✅ 보고서 제출 (기한 내)
- ✅ (선택) Remediation Verification

---

## 참고

- PTES (Penetration Testing Execution Standard): [http://www.pentest-standard.org/](http://www.pentest-standard.org/)
- OWASP Top 10: [https://owasp.org/www-project-top-ten/](https://owasp.org/www-project-top-ten/)
- CVSS 3.1: [https://www.first.org/cvss/v3.1/calculator](https://www.first.org/cvss/v3.1/calculator)
- 모바일 앱 테스트 (필요시): OWASP MASTG (Mobile Application Security Testing Guide)

