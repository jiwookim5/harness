# Reuse Check

lab-security-wave 진행 중 실제로 발생한 Blocker를 기록한다. 실패는 삭제하지 않는다.

## 요약

- Blocker: 경로 추측형 Recon 무신호(1), 로컬에 SigV4 서명 도구 부재(2), Decoy flag 트랩(3)
- Harness 변경: 없음 — 전략/도구 대체로 해결된 사례
- 다음 CTF 문제 재사용: 클라이언트 번들 분석 우선 전략, 수기 SigV4 서명 스크립트, 오브젝트
  스토리지형 문제에서 미끼 파일 식별 절차를 그대로 재사용 가능

## Blocker 1: 경로 추측형 Recon이 신호를 주지 않음

- **실패 Ref**: CTL-RECON-005~007 (`evidence/all-requests.md` 요청 4, `evidence/all-results.md`
  결과 4) — `/openapi.json`, `/health`, `/api`, `/auth/login`, `/docs`, `/control`, `/panel`,
  `/dashboard`, `/admin`, `/status`, `/me` 11개 후보 전부 404(동일 Next.js 커스텀 404,
  동일 etag), `OPTIONS /`·`POST /`는 405(nginx 기본 에러 페이지)
- **원인**: 대상이 Next.js **정적 export**로 빌드돼 서버사이드 라우트가 없고(EVID-RECON-002/003),
  보호 대상 API 경로가 클라이언트 JS 번들 안에서만 참조됨 — 일반적인 관리자 경로 이름
  추측으로는 애초에 맞출 수 없는 구조
- **변경 위치**: 없음 — CTL-RECON-008에서 `main-*.js`/`_app-*.js` 번들을 직접 읽어
  `/api/admin/storage` 라우트 정규식(`/api\/admin\/storage(\.json)?[\/#\?]?$/`)을 발견하는
  전략으로 전환
- **같은 입력 재실행 결과**: 번들 분석 후 `/api/admin/storage` 요청 시 401(세션 없음, 정상
  응답) → CTL-EXEC-002의 헤더 우회로 이어짐(EVID-EXPLOIT-001)
- **다음 문제 재사용 영향**: 프론트가 정적 export/SPA 형태면 경로 추측보다 클라이언트 번들
  Grep(`grep -oE`로 라우트 패턴 찾기)을 recon 초반 단계로 승격하는 게 효율적

## Blocker 2: 로컬 환경에 `aws` CLI/`boto3`가 없어 SigV4 서명 불가

- **실패 Ref**: `evidence/all-requests.md` 요청 8 하단 메모 — SigV4 서명이 필요한 시점에
  표준 도구가 없음을 확인
- **원인**: 로컬 작업 환경에 AWS 관련 패키지가 설치돼 있지 않음(격리된 CTF 환경 기본 구성)
- **변경 위치**: 없음(harness 정책 변경 불필요) — Python stdlib `hmac`/`hashlib`로 SigV4
  서명 로직을 직접 구현해 대체
- **같은 입력 재실행 결과**: 직접 구현한 서명으로 `GET /lab-final?list-type=2` 요청 시 200과
  함께 `ListBucketResult` 정상 반환(EVID-EXPLOIT-003) — 표준 도구와 동일한 결과
- **다음 문제 재사용 영향**: S3 호환 스토리지가 나오는 문제에서 `aws`/`boto3`가 없는 환경이면
  재사용 가능한 최소 SigV4 서명 스크립트를 harness 유틸로 미리 준비해두면 반복 구현 비용을
  줄일 수 있음(제안 — 아직 harness에 반영 안 함)

## Blocker 3: 버킷 안에 미끼(Decoy) flag가 함께 존재

- **실패 Ref**: `evidence/all-results.md` 결과 9 — `archive/decoy.json`에
  `FLAG{not_the_final_evidence}` 형태의 flag形 문자열이 존재, 실제 정답과 형식이 유사해
  혼동 가능
- **원인**: 문제 설계상 의도적으로 배치된 미끼 — `README.txt`에 "evidence object is not
  stored at the bucket root" 힌트가 있었고, 파일명 자체도 `decoy`
- **변경 위치**: 없음 — README 힌트(버킷 루트 저장 아님)와 경로/파일명(`decoy` vs
  `evidence/final.json`)을 대조해 실제 flag를 식별. 두 값 모두 Evidence에 보존하고
  삭제하지 않음(FACT: 두 flag 문자열 모두 응답에 존재, INFERENCE: 어느 쪽이 진짜인지는
  힌트 기반 판단)
- **같은 입력 재실행 결과**: 재조회해도 동일하게 두 객체 모두 반환됨 — 우연이 아니라 문제
  설계임을 확인
- **다음 문제 재사용 영향**: flag 형식 문자열이 여러 개 나오면 즉시 확정하지 말고, 버킷/파일
  구조 힌트(README, 경로, 파일명)를 먼저 대조하는 절차를 recon 체크리스트에 추가할 가치가
  있음(제안)
