# Harness Projects

**여러 보안 테스트 및 버그바운티 프로젝트들을 관리하는 통합 레포지토리입니다.**

---

## 📋 프로젝트 구성

### 1. **bugbounty_baemin_harness** 🎯
배민 플랫폼의 보안 취약점을 발굴하는 버그바운티 프로젝트

**포함 항목:**
- Scope: 테스트 대상 범위 정의
- Recon: 정보 수집 및 분석
- Techniques: 사용된 테스트 기법
- POC Templates: 개념 증명 템플릿
- Findings: 발견된 취약점 요약
- Report: 최종 리포트

**관련 파일:**
- `README.md` - 프로젝트 상세 설명
- `AGENTS.md` - AI 에이전트 설정
- `CLAUDE.md` - Claude AI 사용 지침

---

### 2. **cj_harness** 🛍️
CJ 관련 보안 테스트 및 개발 프로젝트

**포함 항목:**
- Package.json: Node.js 프로젝트 설정
- Student Guide: 학생용 가이드
- Release Checklist: 배포 체크리스트
- My.md: 개인 메모 및 노트

**관련 파일:**
- `README.md` - 프로젝트 설명
- `AGENTS.md` - 에이전트 구성
- `CLAUDE.md` - Claude 통합 설정

---

### 3. **find_CVE_harness** 🔍
공개된 CVE(취약점)를 분석하고 발굴하는 프로젝트

**포함 항목:**
- Scope: CVE 검색 범위
- Targets: 대상 시스템 목록
- Analysis: CVE 분석 결과

**관련 파일:**
- `README.md` - CVE 분석 프로세스
- `AGENTS.md` - 자동화 에이전트
- `CLAUDE.md` - AI 보조 도구 설정

---

### 4. **toit_test_harness** 🧪
Toit 플랫폼의 기능 및 보안 테스트 프로젝트

**목적:**
- 자동화된 테스트 케이스 관리
- 테스트 결과 추적
- 품질 보증 프로세스

---

## 🚀 빠른 시작

### 프로젝트 클론
```bash
git clone https://github.com/jiwookim5/harness.git
cd harness
```

### 특정 프로젝트 접근
```bash
# 배민 버그바운티
cd bugbounty_baemin_harness
cat README.md

# CJ 프로젝트
cd cj_harness
cat README.md

# CVE 발굴
cd find_CVE_harness
cat README.md

# Toit 테스트
cd toit_test_harness
```

---

## 📁 디렉토리 구조

```
harness/
├── bugbounty_baemin_harness/
│   ├── README.md
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── scope.md
│   ├── recon.md
│   ├── techniques.md
│   ├── poc-templates.md
│   ├── report.md
│   └── finding-summary.md
│
├── cj_harness/
│   ├── README.md
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── STUDENT-GUIDE.md
│   ├── RELEASE-CHECKLIST.md
│   ├── package.json
│   └── my.md
│
├── find_CVE_harness/
│   ├── README.md
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── scope.md
│   └── targets.md
│
└── toit_test_harness/
```

---

## 🛠️ 사용 기술

- **보안 테스트**: 취약점 스캔, 침투 테스트
- **버그바운티**: 보안 이슈 리포팅
- **CVE 분석**: 공개 취약점 연구
- **자동화 테스트**: Harness 프레임워크

---

## 📝 기여하기

각 프로젝트의 README와 AGENTS.md를 참고하여:

1. 새로운 기능이나 테스트 케이스 추가
2. 발견된 취약점 문서화
3. 개선사항 제안

---

## 📖 관련 문서

- `CLAUDE.md` - Claude AI를 활용한 개발 지침
- `AGENTS.md` - 에이전트 자동화 설정

각 프로젝트 디렉토리의 README.md를 참고하세요.

---

## ✨ 주요 특징

✅ **체계적 관리**: 여러 보안 프로젝트를 한 곳에서 관리  
✅ **자동화**: AI와 에이전트를 활용한 효율적 운영  
✅ **문서화**: 각 프로젝트별 상세한 문서  
✅ **확장 가능**: 새로운 프로젝트 추가 용이

---

**마지막 업데이트**: 2026년 9월 14일
