# 모바일 펜테스트 도구 셋업 체크리스트

> 설치/실행은 scope.md 승인 이후, 지우님이 직접 실행하는 것을 권장합니다.
> 아래 명령은 macOS(Darwin) 기준이며, 실행 전 각자 검토해주세요.

## 1. 정적 분석

- **jadx** (Android APK → Java 디컴파일)
  ```
  brew install jadx
  ```
- **apktool** (APK 리소스/스모드 분석)
  ```
  brew install apktool
  ```
- **MobSF** (자동 정적 분석, Docker 권장)
  ```
  docker pull opensecurity/mobile-security-framework-mobsf
  docker run -it -p 8000:8000 opensecurity/mobile-security-framework-mobsf
  ```
- **iOS**: class-dump, otool은 Xcode Command Line Tools에 포함
  ```
  xcode-select --install
  ```

## 2. 동적 분석

- **Burp Suite Community**: https://portswigger.net/burp/communitydownload (수동 다운로드)
  - 모바일 기기에 Burp CA 인증서 설치 필요 (프록시 설정 → 인증서 신뢰)
- **Frida** (런타임 후킹 — SSL Pinning 우회 등)
  ```
  pip install frida-tools
  ```
  - 기기에 `frida-server` 배포 필요 (Android: adb push, 루팅된 기기 또는 에뮬레이터 권장 — 실기기 루팅은 별도 승인 필요)
- **objection** (Frida 기반 툴킷, non-root 환경에서도 일부 기능 사용 가능)
  ```
  pip install objection
  ```

## 3. 기기/플랫폼 도구

- **adb** (Android Debug Bridge)
  ```
  brew install android-platform-tools
  ```
- **libimobiledevice** (iOS 기기 통신)
  ```
  brew install libimobiledevice
  ```

## 4. API 테스트 보조

- **curl / httpie**: API 요청 재현 및 PoC 작성용
- **Python 3 + requests**: PoC 스크립트용

---

## 진행 순서 권장

1. Burp 인증서를 테스트 기기에 설치하고 프록시로 트래픽이 잡히는지 먼저 확인 (SSL Pinning 없는 요청부터)
2. jadx/apktool로 APK 정적 분석 → 하드코딩 시크릿, 권한, 딥링크 스킴 파악
3. SSL Pinning이 걸려있다면 Frida/objection 우회 시도 — **이 단계는 Control로 등록하고 승인 후 진행** (앱 동작 방해 가능성 있음)
4. API 엔드포인트 확보되면 Burp Repeater/curl로 IDOR, 인가 우회 등 수동 테스트

> 루팅/탈옥된 실기기를 사용할 경우 회사 자산 정책을 먼저 확인하세요. 가능하면 테스트 전용 기기 또는 에뮬레이터/시뮬레이터 사용을 권장합니다.
