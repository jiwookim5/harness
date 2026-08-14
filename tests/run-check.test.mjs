import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkRun, classifyDecision } from "../scripts/lib/checks.mjs";

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "ctf-run-"));
  for (const [relative, content] of Object.entries(files)) {
    const file = resolve(root, relative);
    mkdirSync(resolve(file, ".."), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
}

const observation = {
  observation_id: "OBS-001",
  control_id: "CTL-001",
  target: "127.0.0.1:9001",
  input_sha256: "a".repeat(64),
  request_sha256: "b".repeat(64),
  criteria_sha256: "c".repeat(64),
  matcher: "FLAG_MATCH",
  exit_code: 0,
  stdout_ref: "evidence/masked/stdout.txt",
  stderr_ref: "evidence/masked/stderr.txt",
  request_ref: "evidence/masked/request.txt",
  response_ref: "evidence/masked/response.txt",
  cleanup_result: "PASS"
};

const control = {
  control_id: "CTL-001",
  purpose: "flag 획득 시도",
  command: "./exploit.sh",
  target: "127.0.0.1:9001",
  expected_impact: "flag 파일 읽기",
  success_matcher: "FLAG_MATCH",
  failure_matcher: "NO_MATCH",
  timeout_seconds: 10,
  cleanup: "docker compose down",
  decision: "GO"
};

const runFiles = {
  "ctf/target-1/scope.md":
    "# Scope\n허용 Target: 127.0.0.1:9001\nSTOP: 외부 Domain\nCleanup: docker compose down\n",
  "ctf/target-1/recon.md":
    "# Recon\nFACT: [SRC-001] 서비스 배너로 버전을 확인했다.\nINFERENCE: 취약할 수 있다.\nUNKNOWN: 정확한 진입점.\n",
  "ctf/target-1/execution/control.json": JSON.stringify(control),
  "ctf/target-1/execution/observation.json": JSON.stringify(observation),
  "ctf/target-1/evidence/index.json": JSON.stringify({
    target_id: "target-1",
    entries: [{ evidence_id: "EVID-001", preserve_in_trace: true, report_eligible: true }]
  }),
  "ctf/target-1/evidence/all-requests.md": "# All Requests\nGET /flag HTTP/1.1\n",
  "ctf/target-1/evidence/all-results.md": "# All Results\nEVID-001: flag 확인됨\n",
  "ctf/target-1/evidence/finding-summary.md":
    "# Finding Summary\n## 대상 (Target)\n## 보낸 요청\n## 결과\n",
  "ctf/target-1/report.md": "# Report\n결과 확보 [evidence:EVID-001]\n",
  "ctf/target-1/retrospective/reuse-check.md":
    "# Reuse\nBlocker: 없음\nHarness 변경: 없음\n다음 Target: 공통 Gate 재사용\n",
  "harness/CHANGELOG.md": "# Changelog\nv1\n실패 Ref: 없음\n재실행: PASS\n"
};

test("checkRun is GO for a complete loopback CTF workspace", () => {
  assert.deepEqual(checkRun(fixture(runFiles), "target-1"), []);
});

test("checkRun merges analysis+execution+evidence into a single pass (no D1/D2/D3 split)", () => {
  const files = { ...runFiles };
  delete files["ctf/target-1/recon.md"];
  delete files["ctf/target-1/execution/control.json"];
  delete files["ctf/target-1/evidence/finding-summary.md"];
  const issues = checkRun(fixture(files), "target-1");
  assert.ok(issues.some((issue) => issue.includes("recon.md: missing")));
  assert.ok(issues.some((issue) => issue.includes("control.json: missing")));
  assert.ok(issues.some((issue) => issue.includes("finding-summary.md: missing")));
});

test("checkRun stops an external target with no CTF 승인", () => {
  const files = {
    ...runFiles,
    "ctf/target-1/scope.md":
      "# Scope\n허용 Target: ctf.example.com:8080\nSTOP: 외부 Domain\nCleanup: docker compose down\n",
    "ctf/target-1/execution/control.json": JSON.stringify({ ...control, target: "ctf.example.com:8080" }),
    "ctf/target-1/execution/observation.json": JSON.stringify({ ...observation, target: "ctf.example.com:8080" })
  };
  const issues = checkRun(fixture(files), "target-1");
  assert.ok(issues.some((issue) => issue.startsWith("STOP") && issue.includes("CTF 승인")));
  assert.equal(classifyDecision(issues), "STOP");
});

test("checkRun allows an external target with explicit CTF 승인", () => {
  const files = {
    ...runFiles,
    "ctf/target-1/scope.md":
      "# Scope\n허용 Target: ctf.example.com:8080\nSTOP: 외부 Domain\nCleanup: docker compose down\n" +
      "CTF 승인: 2026-08-14 학생 본인 승인, 플랫폼: ExampleCTF\n",
    "ctf/target-1/execution/control.json": JSON.stringify({ ...control, target: "ctf.example.com:8080" }),
    "ctf/target-1/execution/observation.json": JSON.stringify({ ...observation, target: "ctf.example.com:8080" })
  };
  assert.deepEqual(checkRun(fixture(files), "target-1"), []);
});

test("checkRun does not require lab/compose.yaml when no local lab is used", () => {
  // runFiles already has no lab/compose.yaml at all — external CTF platforms
  // don't necessarily have a local Docker lab.
  assert.deepEqual(checkRun(fixture(runFiles), "target-1"), []);
});

test("checkRun rejects an unsafe compose.yaml when one is present", () => {
  const files = {
    ...runFiles,
    "ctf/target-1/lab/compose.yaml": "services:\n  app:\n    privileged: true\n"
  };
  const issues = checkRun(fixture(files), "target-1");
  assert.ok(issues.some((issue) => issue.startsWith("STOP") && issue.includes("privileged")));
});

test("checkRun does not require a vulnerable/patched Same-Control pair", () => {
  // No execution/vulnerable.json or execution/patched.json anywhere in
  // runFiles, and no same-control-check.md — a single CTF target has no
  // "patched" counterpart to compare against.
  assert.deepEqual(checkRun(fixture(runFiles), "target-1"), []);
});
