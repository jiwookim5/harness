# lab-security-wave retrospective

상태: PENDING — 학생 검토/확정 대기 (AI Draft)

Blocker 3건, 실제 재현 결과는 `reuse-check.md` 참고.

- Blocker 1(경로 추측형 Recon 무신호) → 전략 전환(클라이언트 번들 분석)으로 해결, 정책 변경 없음
- Blocker 2(로컬 환경에 SigV4 서명 도구 부재) → Python stdlib로 직접 구현, harness 변경 없음
- Blocker 3(Decoy flag 트랩) → README 힌트 + 파일 경로 대조로 식별, 사례로 기록
