# Recon — 배달의민족 버그바운티

정찰 결과를 시간순으로 누적하는 문서입니다.

---

## 세션 1 — [날짜 입력]

### 포트스캔 / 호스트 발견

#### Control: RECON-001-NMAP
- **목적**: In-scope 호스트의 열린 포트 식별
- **명령**: `nmap -sV -p- <TARGET>`
- **대상**: (파인더갭 대시보드에서 확인한 호스트)
- **영향**: Read-Only (네트워크 정찰만)
- **결과**: 
  - **FACT**: (stdout 전체 복사)
  - **INFERENCE**: (어떤 서비스가 실행 중인지, 취약 가능성)

---

### 기술 스택 식별

#### Control: RECON-002-HEADERS
- **목적**: HTTP 헤더/쿠키에서 기술 스택 식별
- **명령**: `curl -I https://<TARGET>`
- **대상**: (In-scope 호스트)
- **결과**:
  - **FACT**: (응답 헤더 전체)
  - **INFERENCE**: (웹서버/프레임워크/버전 식별)

#### Control: RECON-003-SUBDOMAIN
- **목적**: 서브도메인 열거
- **명령**: `subfinder -d <DOMAIN> -o subdomains.txt`
- **대상**: (In-scope 메인 도메인)
- **결과**:
  - **FACT**: (발견된 서브도메인 목록)
  - **INFERENCE**: (추가 In-scope 호스트 여부 확인)

---

### 애플리케이션 흐름 분석

#### Control: RECON-004-MANUAL-BROWSE
- **목적**: 수동으로 웹사이트 주요 기능 탐색
- **명령**: 브라우저에서 주요 페이지 방문
  - 로그인 페이지
  - 주문 페이지
  - 마이페이지
  - 결제 페이지
- **대상**: https://baemin.com (In-scope 확인 후)
- **결과**:
  - **FACT**: (스크린샷, URL 패턴, 폼 필드 목록)
  - **INFERENCE**: (API 엔드포인트 추정, 인증/인가 흐름 분석)

---

## 주요 발견사항

### 열린 포트
- (여기에 추가)

### 호스트 목록
- (여기에 추가)

### API 엔드포인트
- (여기에 추가)

### 인증 메커니즘
- (여기에 추가)

### 의심 지점 (INFERENCE)
- (여기에 추가)

---

## 다음 단계
- [ ] Burp Suite로 HTTP 트래픽 캡처
- [ ] API 엔드포인트별 입력 검증 테스트
- [ ] 인증 우회 시도
- [ ] 권한 상승 테스트

## Evidence 저장

- 각 Control 결과는 `evidence/detailed/[VULN-ID]/` 에 저장
- 파인더갭 제출 직전에 민감정보 제거하여 `evidence/submit/[VULN-ID]/` 로 복사

**참고**: 파인더갭 규칙상 무제한 자동 스캔(Nuclei, Burp 자동 공격)은 승인 필요. 수동 탐색과 목표 지정 테스트만 진행.
