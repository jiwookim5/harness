# Retrospective — 재현 검증 및 사후분석

이 디렉토리는 취약점의 재현 검증(verification) 기록과 사후분석(post-mortem)을 보관합니다.

---

## 디렉토리 구조

```
retrospective/
├── VULN-001/
│   ├── verification.md      # 재현 검증 기록
│   ├── root-cause.md        # 근본 원인 분석
│   └── test-cases.md        # 재현 테스트 케이스
├── VULN-002/
│   └── ...
└── session-review.md        # 세션 전체 사후분석
```

---

## 각 파일 설명

### verification.md (재현 검증)

```markdown
## VULN-001 Verification

**검증 날짜**: 2026-09-??  
**검증자**: (누가 확인했는지)  
**상태**: ✅ 재현 성공 / ⚠️ 부분 재현 / ❌ 재현 실패

### 재현 환경
- 테스트 날짜: (언제)
- 대상 호스트: (어디)
- 테스트 계정: (어떤 것)

### 재현 절차
1. (단계 1)
2. (단계 2)
3. (단계 3)

### 관찰 결과
- **FACT**: (도구 출력, stdout, 스크린샷)
- **INFERENCE**: (이것이 취약점임을 보이는 이유)

### 결론
- ✅ 취약점 확인됨
- 📝 주의사항: (있으면 기술)
```

### root-cause.md (근본 원인 분석)

```markdown
## VULN-001 Root Cause Analysis

### 취약점 타입
- CWE-89: SQL Injection (예시)
- CVSS Score: 7.5 (High)

### 왜 발생했나?
- (기술적 근거)
- (코드 로직 결함)
- (설계 실수)

### 공격 시나리오
1. (공격자가 어떻게 악용하는가)
2. (실제 피해)

### 수정 방안 (제안)
- (배달의민족이 어떻게 고칠 수 있는가)
```

### test-cases.md (테스트 케이스)

```markdown
## VULN-001 Test Cases

| Payload | 예상 결과 | 실제 결과 | 통과 여부 |
|---------|----------|---------|---------|
| `input1` | 취약함 | 취약함 | ✅ |
| `input2` | 안전함 | 취약함 | ❌ (의도치 않은 취약점!) |
```

### session-review.md (세션 전체 사후분석)

```markdown
## 2026-09-?? Session Retrospective

### 진행 요약
- 목표: (이번 세션 목표)
- 기간: (시간)
- 발견된 취약점: (개수)

### 성공 요인
- (무엇이 잘 되었는가)

### 개선점
- (다음에 더 잘하려면)

### 교훈
- (배운 점)
```

---

## AGENTS.md 상속 원칙

- **같은 Control + Matcher 적용** — 취약 환경과 조치 환경에는 동일한 테스트를 진행
- **실패해도 기록** — 실패, REJECTED, UNKNOWN을 보존하고 삭제하지 않음
- **비가역 변경 추적** — 테스트 중 배달의민족 데이터를 수정했다면 필수 기록

---

## 작업 흐름

1. **취약점 발견** (Control 실행 성공)
   → evidence/ 저장
2. **재현 검증** (독립적 재현)
   → retrospective/[VULN-ID]/verification.md 작성
3. **근본 원인 분석**
   → retrospective/[VULN-ID]/root-cause.md 작성
4. **테스트 케이스 작성**
   → retrospective/[VULN-ID]/test-cases.md 작성
5. **파인더갭 제출**
   → evidence/masked/ 의 파일 + report.md 사용
6. **세션 사후분석**
   → session-review.md 작성

---

## 주의사항

- ❌ 배달의민족 실제 데이터 수정/삭제 금지
- ✅ 테스트 데이터/테스트 계정만 사용
- 📝 모든 시도(성공/실패) 기록 유지
