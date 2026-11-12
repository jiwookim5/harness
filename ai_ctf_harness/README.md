# Auto CTF Harness — 반자동 CTF 공격/방어 하네스

IP 주소만 입력하면 자동으로 정찰, 공격 제안, 증거 기록을 수행하는 CTF 해킹 하네스입니다.

## 특징

- **반자동화 (Semi-Automation)**: 공격 제안 후 사용자 승인 필수
- **CTF 원칙 준수**: 서버 장애 유발 공격(브루트포스, DDoS) 금지
- **증거 완전 관리**: FACT/INFERENCE 구분, stdout/stderr 보존
- **시간 추적**: 각 공격마다 소요 시간 기록
- **빠른 회고**: 각 run마다 자동 분석 결과 생성
- **자동 방어** ✨: 발견된 취약점에 맞는 방어 조치 제시 및 적용

## 시작하기

### 사전 설치

```bash
# 필요한 도구 설치
brew install nmap hydra nikto jq

# Python 의존성
pip install pyyaml requests paramiko
```

### 기본 사용법

```bash
# 1. CTF 모드 (문제풀이)
./harness.sh 192.168.1.100 --mode ctf

# 2. KotH 모드 (방어)
./harness.sh 192.168.1.100 --mode koth

# 3. 특정 공격만 수행
./harness.sh 192.168.1.100 --attacks "web_scan,service_enum"

# 4. 방어 기능 활성화 (공격 후 자동 방어 제시)
./harness.sh 192.168.1.100 --defend

# 5. 지원 방어 목록 조회
./harness.sh 192.168.1.100 --list-defenses
```

## 디렉토리 구조

```
auto-ctf-harness/
├── README.md                    (이 파일)
├── CONTRACT.md                  (AI 계약서 & 원칙)
├── harness.sh                   (메인 CLI 진입점)
│
├── core/
│   ├── __init__.py
│   ├── scanner.py               (nmap, 서비스 식별)
│   ├── advisor.py               (공격 제안 AI)
│   ├── executor.py              (공격 실행 엔진)
│   ├── logger.py                (증거 로깅)
│   └── validator.py             (안전성 검증)
│
├── config/
│   ├── attacks.yaml             (모든 공격 규칙)
│   ├── defenses.yaml            (방어 규칙)
│   └── blacklist.yaml           (절대 금지 공격)
│
├── payloads/                    (exploit/payload 모음)
│   ├── web/
│   ├── ssh/
│   ├── database/
│   └── template.py              (새 payload 템플릿)
│
├── runs/                        (각 실행마다 자동 생성)
│   └── {timestamp}/
│       ├── scan.json            (정찰 결과)
│       ├── proposed.json        (제안된 공격)
│       ├── approval.log         (사용자 승인)
│       ├── execution.log        (실행 결과)
│       ├── evidence/            (stdout/stderr)
│       └── report.md            (자동 분석)
│
└── .claude/
    └── CLAUDE.md                (프로젝트 지시사항)
```

## 핵심 원칙

### ✅ 허용되는 공격

- 웹 취약점 스캔 (Nikto, OWASP ZAP)
- 서비스 버전 열거
- SQL injection 테스트
- XSS 취약점 테스트
- 알려진 CVE exploit (제한된 시도)
- SSH 키 스캔

### ✅ 허용되는 방어

- SSH 배너 정보 숨기기
- HTTP 보안 헤더 추가
- PUT/DELETE 메서드 비활성화
- 기본 자격증명 변경
- 입력 검증 강화
- 방화벽 포트 제한
- 시스템 업데이트 및 패치
- 로깅 및 모니터링 활성화

### ❌ 금지되는 공격

- **브루트포스** (비밀번호 추측 - 시간 오래 걸림)
- **DDoS/DoS** (서버 장애)
- **무제한 자동 스캔** (Nuclei full, Burp Pro auto attack)
- **데이터 파괴/삭제**
- **백도어/지속성** (웹셸, cron job, reverse shell)
- **Credential 수집 후 이용** (실제 데이터 조작)

## 예시: 첫 실행 (방어 기능 포함)

```bash
$ ./harness.sh 192.168.1.100 --defend

[1/4] 정찰 중...
      ✓ nmap 스캔 완료
      ✓ 서비스 식별: Apache 2.4.41, OpenSSH 7.4, MySQL 5.7.28

[2/4] 공격 제안 분석...

╔═══════════════════════════════════════════════════════════════╗
║ 추천 공격 순서 (위험도 낮은 것부터)                            ║
╠═══════════════════════════════════════════════════════════════╣
║ [1] Apache/2.4.41 헤더 분석              🟢 LOW    100% ║
║ [2] MySQL 기본 자격증명 테스트           🟡 MED     45% ║
║ [3] SSH 버전 열거                       🟢 LOW     95% ║
║ [4] HTTP OPTIONS 메서드 테스트           🟢 LOW     80% ║
║ [5] SQL Injection (기본 payload)        🟠 HIGH    30% ║
╚═══════════════════════════════════════════════════════════════╝

위 공격들을 실행할까요?
  [1] go         모두 순서대로
  [2] select     선택해서 (번호로: 1,3,5)
  [3] skip       건너뛰기
  [4] custom     커스텀 공격 추가

>>> go

[3/4] 공격 실행 중...
  [1/5] Apache 헤더 분석... ✓ (3초)
        발견: Server: Apache/2.4.41 (Ubuntu)
  [2/5] MySQL 기본 자격증명... ❌ (8초)
        결과: 접근 거부 (정상)
  [3/5] SSH 버전 열거... ✓ (2초)
        발견: OpenSSH 7.4 (CVE-2018-15473 가능)
  [4/5] OPTIONS 메서드... ✓ (1초)
        발견: Allow: GET, POST, PUT, DELETE (PUT은 위험)
  [5/5] SQL Injection... ❌ (45초)
        결과: 취약하지 않음 (쿼리 고정)

[4/4] 방어 제안 및 적용...

╔═══════════════════════════════════════════════════════════════╗
║ 추천 방어 조치 (우선순위 순)                                   ║
╠═══════════════════════════════════════════════════════════════╣
║ [1] 🔴 SSH 배너 정보 숨기기                 (HIGH)   ║
║     ⚡ 트리거: ssh_banner, cve_2018_15473                   ║
║ [2] 🟠 보안 응답 헤더 추가                  (MEDIUM) ║
║     ⚡ 트리거: http_headers, http_options                  ║
║ [3] 🟠 HTTP PUT 메서드 비활성화            (HIGH)   ║
║     ⚡ 트리거: http_options                              ║
║ [4] 🔴 MySQL Root 비밀번호 변경            (CRITICAL) ║
║     ⚡ 트리거: mysql_default_creds                       ║
╚═══════════════════════════════════════════════════════════════╝

위 방어 조치를 적용할까요?
  [1] apply   - 모두 순서대로 적용
  [2] select  - 선택해서 적용 (번호: 1,3 형식)
  [3] skip    - 건너뛰기
  [4] preview - 적용될 변경사항 미리보기

>>> select
공격 번호를 선택하세요 (쉼표로 구분): 1,2,3

[방어 적용 중...]
  [1] SSH 배너 정보 숨기기... ✓ (2초)
  [2] 보안 응답 헤더 추가... ✓ (1초)
  [3] HTTP PUT 메서드 비활성화... ✓ (1초)

[검증 중...]
  [검증] SSH 배너 정보 숨기기... ✓
  [검증] 보안 응답 헤더 추가... ✓
  [검증] HTTP PUT 메서드 비활성화... ✓

검증 완료: 3/3 성공

세션 종료: 총 85초 소요
📄 runs/2026-10-30_14-23-45/report.md
```

## 방어 기능 (Defense)

### 🛡️ 어떻게 동작하나요?

1. **공격 실행** → 취약점 발견
2. **자동 분석** → 발견된 취약점에 맞는 방어 매핑
3. **방어 제시** → 위험도 순으로 정렬해 사용자에게 제시
4. **선택적 적용** → 사용자가 승인한 방어만 적용
5. **자동 검증** → 방어 적용 후 재검증

### 📋 제공되는 방어 카테고리

#### SSH 방어
- SSH 배너 정보 숨기기 (버전 은폐)
- Root 로그인 비활성화
- 인증 방식 강화

#### HTTP/웹 방어
- 보안 응답 헤더 추가 (X-Content-Type-Options, X-Frame-Options 등)
- PUT/DELETE 메서드 비활성화
- 입력 검증 강화 (XSS/SQLi 방지)

#### 데이터베이스 (MySQL) 방어
- Root 비밀번호 변경
- 익명 사용자 제거
- 원격 Root 접근 차단
- 위험 기능 비활성화 (FILE 권한 제거)

#### 시스템 레벨 방어
- 방화벽 포트 제한
- 불필요한 서비스 비활성화
- 시스템 업데이트 및 패치
- 로깅 및 모니터링 활성화

### 🎯 사용 예시

```bash
# 방어 기능 포함해서 실행
$ ./harness.sh 192.168.1.100 --defend

# 공격 후 방어 제안 화면
위 방어 조치를 적용할까요?
  [1] apply   - 모두 순서대로 적용
  [2] select  - 선택해서 적용 (번호: 1,3 형식)
  [3] skip    - 건너뛰기
  [4] preview - 적용될 변경사항 미리보기

>>> apply       # 모두 적용
# 또는
>>> select
공격 번호를 선택하세요: 1,2,4    # 1,2,4번만 적용
```

### 📊 방우 우선순위

- **🔴 CRITICAL**: 즉시 적용 (심각한 취약점)
- **🟠 HIGH**: 긴급 적용 (높은 위험도)
- **🟡 MEDIUM**: 권장 적용 (중간 위험도)
- **🟢 LOW**: 선택 적용 (낮은 위험도)

### ✅ 방어 조합

여러 개의 방어를 함께 적용하면 더욱 효과적입니다:
- **ssh_basic**: SSH 강화 (배너 숨기기 + Root 로그인 비활성화)
- **web_basic**: 웹 강화 (헤더 추가 + PUT 비활성화 + 입력 검증)
- **database_basic**: DB 강화 (암호 변경 + 익명 제거 + 원격 차단)
- **system_basic**: 시스템 강화 (방화벽 + 서비스 정리 + 업데이트)
- **full_hardening**: 전체 강화 (모든 방어 적용)

---

## 다음 단계

1. `CONTRACT.md` 읽고 원칙 숙지
2. `config/attacks.yaml` 확인해서 어떤 공격들이 있는지 파악
3. `config/defenses.yaml` 확인해서 어떤 방어들이 있는지 파악
4. `./harness.sh <IP> --list-attacks` 로 지원 공격 목록 조회
5. `./harness.sh <IP> --list-defenses` 로 지원 방어 목록 조회
6. `./harness.sh <IP> --defend` 로 방어 기능 포함해서 실행
7. 첫 실행 시작!

## 문제 해결

### "permission denied" 에러

```bash
chmod +x harness.sh
```

### nmap/nikto 설치 안 됨

```bash
# macOS
brew install nmap nikto

# Ubuntu/Debian
sudo apt-get install nmap nikto
```

### Python 모듈 없음

```bash
pip install -r requirements.txt
```

---

**상태**: 초기 구현 완료, 테스트 대기 중
