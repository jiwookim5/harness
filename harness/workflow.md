# Harness Workflow

지금부터 새 작업은 CTF 모의해킹에 포커스한다. Recon → Scope 승인(`ctf/<TARGET-ID>/scope.md`)
→ PLAN(Control Card 초안) → HUMAN GO(정확한 `GO <control_id>` 승인) → RUN(실행과 Evidence
수집) → CHECK(Flag/Evidence 검증) → Evidence Review → Report → Harness Diff.

D1/D2/D3로 3일에 걸쳐 나눠 검증하던 CVE 학습 사이클과 달리, 이 단계 전부를 하나의
Gate(`npm run check:run -- <TARGET-ID>`)로 한 번에 검증한다. 각 단계는 FACT, INFERENCE,
UNKNOWN을 구분하고 보완 가능한 누락은 REVISE, Scope 위반은 STOP한다.

## 이전 CVE 사이클 (기록 · 이력)

CVE-2021-41773/CVE-2021-43798은 아래 3일짜리 Gate로 진행했고, `cves/CVE-*/`와
`harness/CHANGELOG.md`의 v1.1~v1.8에 그 기록이 그대로 남아있다. `npm run check --
D1|D2|D3 <CVE-ID>`로 지금도 재검증할 수 있다.

CVE Intake → Source Map → Patch Diff → Root Cause → CWE → PLAN(Control Card 초안) → HUMAN GO(정확한 `GO <control_id>` 승인) → RUN(Local Observation) → CHECK(Same-Control Retest) → Evidence Review → Report → Harness Diff
