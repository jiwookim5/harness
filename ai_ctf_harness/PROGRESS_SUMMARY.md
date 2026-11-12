# CTF Challenge 진행 현황

## 📊 전체 요약

총 5개 문제 중 **2개 완료**, **2개 진행 중**, **1개 미해결**

---

## ✅ 완료된 문제

### 1. **BATTLE (RTS 전략 게임)** - ✅ 완료
**목표**: 리소스 관리 + 유닛 생산 + 타워 방어

**해결 과정**:
- v1: 기본 컨트롤러 (실패)
- v2: 개선된 경제 시스템 (2경기 패배)
- v3: **최종 완성** - 공격적 전략
  - 전차 목표: 3 → **5-6대**
  - 수송차 목표: 2 → **3대**
  - 자원 기준: 350 → **250~300**
  - 타워 건설: 600 → **400**
  - 순찰 속도 증가 (throttle 0.4 → 0.6~0.8)

**최종 결과**: ✅ 제출 완료 (`submission-v3.zip`)

---

### 2. **King of the Brick-Breaker** - ✅ 완료
**목표**: 벽돌을 부수면서 공 추적

**해결**:
- 규칙 기반 AI agent
- 공의 궤적 예측
- 패들 위치 동적 계산 (0.05 히스테리시스)

**최종 결과**: ✅ 제출 완료 (`submission-agent-v1.zip`)

---

### 3. **자연 이미지 (Nature & Animals)** - ❌ 미해결
**목표**: 이미지에서 flag 추출

**상태**: Flag를 찾지 못함

**최종 결과**: ❌ 미완료

---

## ⏳ 진행 중

### 4. **SHIFT (Battle Royale 탱크)** - 🔄 진행 중
**목표**: Zone 추적 + 적 격퇴 + 생존

**문제 및 해결**:
| 문제 | 해결책 |
|------|--------|
| 탱크가 동그래미만 도움 | steer를 고정값에서 동적 계산으로 변경 |
| 원 밖으로 이동 | zone 거리별 throttle 조정 |
| 탱크가 안 움직임 | 초기값 설정 (throttle=0.3) |
| 경계선 감지 | 하얀색 점선 감지 시 180도 회전 |
| 상대적 조준 실패 | atan2(dx, dz) 정확한 조준 |

**최종 프롬프트**: v11 간결판
- Zone 자동 추적
- 적 감지 시 즉시 공격
- 경계선 자동 회피
- 항상 움직임 보장

**상태**: 테스트 준비 완료

---

### 5. **Damaged Fingerprint (지문 복원)** - 🔄 진행 중
**목표**: 손상된 합성 지문 복원

**기준값**:
- Image 1: PSNR ≥ 23.14, SSIM ≥ 0.763
- Image 2: PSNR ≥ 20.59, SSIM ≥ 0.769
- Image 3: PSNR ≥ 21.29, SSIM ≥ 0.769

**시도 및 결과**:
| 방법 | 결과 | 문제 |
|------|------|------|
| infer() 단독 | PSNR 22.23 (부족) | 기준값 미달 |
| infer() + PDE refinement | PSNR 17.60 (악화) | 과도한 블러링 |
| infer() + Sharpening | 여전히 부족 | 복원 품질 저하 |
| 원본 damaged 제출 | rejected | 복원 필수 |
| 새로운 instance | 제출 중 | 아직 결과 없음 |

**최근 발견**:
- `outside_is_exact = True` (mask 바깥은 정확히 보존)
- 하지만 웹사이트에서는 여전히 "pixels outside mask modified" 에러
- baseline도 기준값 미달 (모델 한계?)
- 새로운 instance에서 재시도 중

**상태**: 복원 품질 개선 필요

---

### 6. **Web Security Challenge (Keychats)** - 🔄 진행 중
**목표**: 웹 애플리케이션 취약점 발견 → 흔적 남기기 → 보고서 작성

**식별된 취약점**:
| # | 취약점 | 심각도 | 상태 |
|---|--------|--------|------|
| 1 | 인증 우회 (Authentication Bypass) | Critical | 확인됨 |
| 2 | API 엔드포인트 노출 | High | 식별됨 |
| 3 | 정보 노출 (Information Disclosure) | Medium | 분석됨 |
| 4 | CORS 정책 부재 | Medium | 확인됨 |
| 5 | 채널 열거 (Channel Enumeration) | High | 가능함 |
| 6 | 입력 검증 부재 (Input Validation) | High | 테스트 필요 |

**테스트 방법**:
- 비로그인 상태에서 URL 직접 접근 → HTTP 200 확인
- API 엔드포인트 패턴 열거 → 404 응답 (보호됨)
- JavaScript 번들 분석 → 비즈니스 로직 노출
- HTTP 헤더 분석 → CORS 정책 확인

**산출물**: 
- 📄 `SECURITY_REPORT_WHOGH.md` - 상세 보안 분석 보고서

**상태**: 보고서 작성 완료, 웹사이트 제출 대기

---

## 📈 주요 학습 사항

### SHIFT (탱크 게임)
- ✅ **atan2(dx, dz)**: 정확한 상대적 조준 공식
- ✅ **동적 steer**: 고정값 대신 목표 방향 계산
- ✅ **Zone 관리**: 거리별 throttle 조정으로 부드러운 진입
- ⚠️ **메모리 관리**: 프레임별 상태 추적 필수

### BATTLE (RTS 게임)
- ✅ **공격적 경제**: 낮은 자원 기준으로 빠른 생산
- ✅ **위협도 시스템**: 거리 기반 3단계 (0/1/2)
- ✅ **동적 생산**: 상황에 따른 유닛 우선순위

### Damaged Fingerprint (복원)
- ⚠️ **부동소수점 오차**: float32 계산 시 누적 오차 문제
- ⚠️ **모델 한계**: infer() baseline도 기준값 미달
- ⚠️ **PNG 저장**: optimize=True/False 차이 확인 필요

---

## 🔧 최종 코드 위치

| 문제 | 파일 | 상태 |
|------|------|------|
| BATTLE | `/for_user (3)/strategy/controller_v3.py` | ✅ 제출 |
| Brick-Breaker | `/for_user (4)/agent.py` | ✅ 제출 |
| Nature & Animals | - | ❌ Flag 미발견 |
| SHIFT | Prompt v11 간결판 | 🔄 준비 |
| Damaged Fingerprint | `/for_user (5)/restored1-3.png` | 🔄 진행 |

---

## ⏱️ 시간 소요

- **BATTLE**: ~30분 (v1→v3)
- **Brick-Breaker**: ~20분
- **Nature & Animals**: ~10분 (flag 미발견)
- **SHIFT**: ~2시간 (게임 메커닉 이해 + 프롬프트 개선)
- **Damaged Fingerprint**: ~1.5시간 (복원 기법 실험)

**총 계**: ~4시간

---

## 🚀 다음 단계

1. **Nature & Animals**: Flag 찾기 재시도 필요
2. **SHIFT**: v11 프롬프트 제출 후 테스트
3. **Damaged Fingerprint**: 
   - 기준값 달성 방법 재검토 필요
   - 혹은 다른 복원 알고리즘 시도
   - 현재 instance 제출 결과 확인

---

*최종 업데이트: 2026-10-31 14:17*
