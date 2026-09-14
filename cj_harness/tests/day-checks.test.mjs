import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { checkDay, classifyDecision } from "../scripts/lib/checks.mjs";

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "cve-day-"));
  for (const [relative, content] of Object.entries(files)) {
    const file = resolve(root, relative);
    mkdirSync(resolve(file, ".."), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
}

const d1Files = {
  "scope.md": "# Scope\n허용 Target: localhost\nSTOP: 외부 Domain\nCleanup: docker compose down\n",
  "cves/CVE-2021-41773/sources/source-map.md": "# Source Map\nSRC-001 | Apache | https://httpd.apache.org/ | 2026-08-10 | 영향 버전\n",
  "cves/CVE-2021-41773/analysis/root-cause.md": "# Root Cause\nFACT: [SRC-001] 코드 검증 경계를 확인했다.\nINFERENCE: 영향 흐름 후보.\nUNKNOWN: 설정 전제.\n반증 조건: Patch Diff가 다른 흐름을 보이면 기각.\n",
  "cves/CVE-2021-41773/analysis/cwe.md": "# CWE\n후보: CWE-UNKNOWN\n근거: [SRC-001]\n반증 조건: 입력 경계가 다르면 재분류.\n",
  "cves/CVE-2021-41773/intake.md": "# CVE Intake\n- CVE ID: CVE-2021-41773\n- 제품: Apache HTTP Server\n- Repository: UNKNOWN\n- 취약 버전 후보: UNKNOWN\n- 조치 버전 후보: UNKNOWN\n- 공식 Source 후보: SRC-001\n- 로컬 재현 가능성: UNKNOWN\n- 위험과 제약: UNKNOWN\n- 완료 기준: UNKNOWN\n",
  "harness/workflow.md": "# Harness v0\nPLAN → HUMAN GO → RUN → CHECK\n",
  "harness/CHANGELOG.md": "# Changelog\nv0 시작\n"
};

test("D1 is GO with scope, sourced analysis, and harness v0", () => {
  assert.deepEqual(checkDay(fixture(d1Files), "D1"), []);
});

test("D1 rejects a FACT without a source reference", () => {
  const files = { ...d1Files };
  files["cves/CVE-2021-41773/analysis/root-cause.md"] =
    "# Root Cause\nFACT: 출처 없는 단정\nINFERENCE: 후보\nUNKNOWN: 조건\n반증 조건: 반례\n";
  assert.ok(checkDay(fixture(files), "D1").some((issue) => issue.includes("FACT")));
});

test("D1 rejects a scope without STOP and Cleanup", () => {
  const files = { ...d1Files, "scope.md": "# Scope\n허용 Target: localhost\n" };
  const issues = checkDay(fixture(files), "D1");
  assert.ok(issues.some((issue) => issue.includes("STOP")));
  assert.ok(issues.some((issue) => issue.includes("Cleanup")));
});

const d2Files = {
  "cves/CVE-2021-41773/execution/control.json": JSON.stringify({
    control_id: "CTL-LOCAL-001",
    purpose: "비파괴 로컬 Proof",
    command: "./fixed-probe.sh",
    target: "127.0.0.1:8080",
    expected_impact: "교육용 Marker 확인",
    success_matcher: "marker-and-log",
    failure_matcher: "marker-absent",
    timeout_seconds: 10,
    cleanup: "docker compose down",
    decision: "GO"
  }),
  "cves/CVE-2021-41773/execution/observation.json": JSON.stringify({
    observation_id: "OBS-LOCAL-001",
    control_id: "CTL-LOCAL-001",
    environment: "vulnerable",
    target: "127.0.0.1:8080",
    input_sha256: "a".repeat(64),
    request_sha256: "b".repeat(64),
    criteria_sha256: "c".repeat(64),
    matcher: "marker-and-log",
    stdout_ref: "evidence/masked/stdout.txt",
    stderr_ref: "evidence/masked/stderr.txt",
    exit_code: 0,
    request_ref: "evidence/masked/request.txt",
    response_ref: "evidence/masked/response.txt",
    server_log_ref: "evidence/masked/server.log",
    cleanup_result: "PASS"
  }),
  "cves/CVE-2021-41773/lab/compose.yaml":
    "services:\n  vulnerable:\n    image: example.invalid/apache@sha256:" + "b".repeat(64) + "\n    ports:\n      - 127.0.0.1:8080:80\n"
};

test("D2 is GO for an approved loopback control and complete observation", () => {
  assert.deepEqual(checkDay(fixture(d2Files), "D2"), []);
});

test("D2 stops an external target", () => {
  const files = { ...d2Files };
  const control = JSON.parse(files["cves/CVE-2021-41773/execution/control.json"]);
  control.target = "example.com";
  files["cves/CVE-2021-41773/execution/control.json"] = JSON.stringify(control);
  assert.ok(checkDay(fixture(files), "D2").some((issue) => issue.includes("target")));
});

test("D2 rejects missing approval and incomplete cleanup", () => {
  const files = { ...d2Files };
  const control = JSON.parse(files["cves/CVE-2021-41773/execution/control.json"]);
  control.decision = "PENDING";
  control.cleanup = "UNSET";
  files["cves/CVE-2021-41773/execution/control.json"] = JSON.stringify(control);
  const issues = checkDay(fixture(files), "D2");
  assert.ok(issues.some((issue) => issue.includes("GO")));
  assert.ok(issues.some((issue) => issue.includes("cleanup")));
});

test("D2 rejects unsafe Compose settings", () => {
  const files = {
    ...d2Files,
    "cves/CVE-2021-41773/lab/compose.yaml":
      "services:\n  vulnerable:\n    privileged: true\n    network_mode: host\n"
  };
  const issues = checkDay(fixture(files), "D2");
  assert.ok(issues.some((issue) => issue.includes("privileged")));
  assert.ok(issues.some((issue) => issue.includes("host network")));
});

const vulnerableObservation = {
  observation_id: "OBS-VULNERABLE",
  control_id: "CTL-SAME-001",
  environment: "vulnerable",
  target: "127.0.0.1:8080",
  input_sha256: "c".repeat(64),
  request_sha256: "d".repeat(64),
  criteria_sha256: "e".repeat(64),
  matcher: "marker-and-log",
  exit_code: 0,
  cleanup_result: "PASS"
};

const patchedObservation = {
  ...vulnerableObservation,
  observation_id: "OBS-PATCHED",
  environment: "patched",
  target: "127.0.0.1:8081",
  exit_code: 1
};

const d3Files = {
  "cves/CVE-2021-41773/execution/vulnerable.json": JSON.stringify(vulnerableObservation),
  "cves/CVE-2021-41773/execution/patched.json": JSON.stringify(patchedObservation),
  "cves/CVE-2021-41773/evidence/index.json": JSON.stringify({
    cve_id: "CVE-2021-41773",
    entries: [
      {
        evidence_id: "EVID-001",
        review_status: "ACCEPTED",
        report_eligible: true,
        preserve_in_trace: true
      },
      {
        evidence_id: "EVID-002",
        review_status: "REJECTED",
        report_eligible: false,
        preserve_in_trace: true
      }
    ]
  }),
  "cves/CVE-2021-41773/report.md":
    "# Report\n검토된 결과 [evidence:EVID-001]\n기각 기록은 Trace에 보존한다.\n",
  "cves/CVE-2021-41773/evidence/all-requests.md":
    "# All Requests\nGET /marker.txt HTTP/1.1\n",
  "cves/CVE-2021-41773/evidence/all-results.md":
    "# All Results\nEVID-001: HTTP 200\nEVID-002: HTTP 404\n",
  "cves/CVE-2021-41773/evidence/same-control-check.md":
    "# Same-Control Hash Check\ninput_sha256/request_sha256/criteria_sha256 비교\n판정: Same-Control.\n",
  "cves/CVE-2021-41773/evidence/finding-summary.md":
    "# Finding Summary\n## 대상 (Target)\n## 보낸 요청\n## 결과\n",
  "cves/CVE-2021-41773/retrospective/reuse-check.md":
    "# Reuse\nBlocker: Matcher 설명 누락\nHarness 변경: Report Gate 추가\n다음 CVE: 공통 Gate 재사용\n",
  "harness/CHANGELOG.md":
    "# Harness Changelog\nv1\n실패 Ref: OBS-PATCHED\n변경: Report Gate\n재실행: PASS\n"
};

test("D3 is GO for same-control retest and eligible report evidence", () => {
  assert.deepEqual(checkDay(fixture(d3Files), "D3"), []);
});

test("D3 rejects a changed matcher", () => {
  const files = { ...d3Files };
  const patched = { ...patchedObservation, matcher: "status-only" };
  files["cves/CVE-2021-41773/execution/patched.json"] = JSON.stringify(patched);
  assert.ok(checkDay(fixture(files), "D3").some((issue) => issue.includes("matcher")));
});

test("D3 rejects report references to ineligible evidence", () => {
  const files = {
    ...d3Files,
    "cves/CVE-2021-41773/report.md": "# Report\n[evidence:EVID-002]\n"
  };
  assert.ok(checkDay(fixture(files), "D3").some((issue) => issue.includes("report_eligible")));
});

test("D3 rejects a missing all-requests.md", () => {
  const files = { ...d3Files };
  delete files["cves/CVE-2021-41773/evidence/all-requests.md"];
  assert.ok(
    checkDay(fixture(files), "D3").some((issue) => issue.includes("all-requests.md: missing"))
  );
});

test("D3 rejects all-results.md missing a result for a listed evidence_id", () => {
  const files = {
    ...d3Files,
    "cves/CVE-2021-41773/evidence/all-results.md": "# All Results\nEVID-001: HTTP 200\n"
  };
  assert.ok(
    checkDay(fixture(files), "D3").some(
      (issue) => issue.includes("all-results.md") && issue.includes("EVID-002")
    )
  );
});

test("D3 rejects all-requests.md with no HTTP request line", () => {
  const files = {
    ...d3Files,
    "cves/CVE-2021-41773/evidence/all-requests.md": "# All Requests\n아직 안 채움\n"
  };
  assert.ok(
    checkDay(fixture(files), "D3").some((issue) => issue.includes("no HTTP request line"))
  );
});

test("D3 rejects a missing same-control-check.md", () => {
  const files = { ...d3Files };
  delete files["cves/CVE-2021-41773/evidence/same-control-check.md"];
  assert.ok(
    checkDay(fixture(files), "D3").some((issue) => issue.includes("same-control-check.md: missing"))
  );
});

test("D3 rejects same-control-check.md without a sha256 comparison", () => {
  const files = {
    ...d3Files,
    "cves/CVE-2021-41773/evidence/same-control-check.md": "# Same-Control Hash Check\n판정: Same-Control.\n"
  };
  assert.ok(
    checkDay(fixture(files), "D3").some((issue) => issue.includes("missing sha256 comparison"))
  );
});

test("D3 rejects same-control-check.md without a verdict", () => {
  const files = {
    ...d3Files,
    "cves/CVE-2021-41773/evidence/same-control-check.md": "# Same-Control Hash Check\nsha256 비교 결과 표\n"
  };
  assert.ok(
    checkDay(fixture(files), "D3").some((issue) => issue.includes("missing 판정"))
  );
});

test("D3 rejects a missing finding-summary.md", () => {
  const files = { ...d3Files };
  delete files["cves/CVE-2021-41773/evidence/finding-summary.md"];
  assert.ok(
    checkDay(fixture(files), "D3").some((issue) => issue.includes("finding-summary.md: missing"))
  );
});

test("D3 rejects finding-summary.md missing a required section", () => {
  const files = {
    ...d3Files,
    "cves/CVE-2021-41773/evidence/finding-summary.md": "# Finding Summary\n## 대상 (Target)\n## 보낸 요청\n"
  };
  assert.ok(
    checkDay(fixture(files), "D3").some(
      (issue) => issue.includes("finding-summary.md") && issue.includes("결과")
    )
  );
});

test("D3 preserves rejected and unknown evidence in the trace", () => {
  const files = { ...d3Files };
  const index = JSON.parse(files["cves/CVE-2021-41773/evidence/index.json"]);
  index.entries[1].preserve_in_trace = false;
  files["cves/CVE-2021-41773/evidence/index.json"] = JSON.stringify(index);
  assert.ok(checkDay(fixture(files), "D3").some((issue) => issue.includes("preserve_in_trace")));
});

test("D1 rejects an empty or stale placeholder intake.md", () => {
  const files = {
    ...d1Files,
    "cves/CVE-2021-41773/intake.md":
      "# CVE Intake\n- CVE ID: UNSET\n- 제품: UNSET\n- Repository: UNSET\n"
  };
  assert.ok(checkDay(fixture(files), "D1").some((issue) => issue.includes("intake.md")));
});

test("D1 classifies an external allowed target as STOP-worthy", () => {
  const files = {
    ...d1Files,
    "scope.md": "# Scope\n허용 Target: example.com\nSTOP: 외부 Domain\nCleanup: 없음\n"
  };
  const issues = checkDay(fixture(files), "D1");
  assert.ok(issues.some((issue) => issue.includes("allowed target")));
});

test("D2 never treats a pending decision as GO", () => {
  const files = { ...d2Files };
  const control = JSON.parse(files["cves/CVE-2021-41773/execution/control.json"]);
  control.decision = "REVISE";
  files["cves/CVE-2021-41773/execution/control.json"] = JSON.stringify(control);
  assert.ok(checkDay(fixture(files), "D2").some((issue) => issue.includes("explicit GO")));
});

test("D3 rejects a report without any evidence reference", () => {
  const files = {
    ...d3Files,
    "cves/CVE-2021-41773/report.md": "# Report\n근거 없는 성공 주장\n"
  };
  assert.ok(checkDay(fixture(files), "D3").some((issue) => issue.includes("at least one")));
});

test("decision classification separates empty work from scope violations", () => {
  assert.equal(classifyDecision([]), "GO");
  assert.equal(classifyDecision(["scope.md: allowed target required"]), "REVISE");
  assert.equal(classifyDecision(["STOP scope.md: allowed target must be loopback"]), "STOP");
});

test("D2 rejects malformed observation hashes", () => {
  const files = { ...d2Files };
  const observation = JSON.parse(files["cves/CVE-2021-41773/execution/observation.json"]);
  observation.input_sha256 = "not-a-hash";
  files["cves/CVE-2021-41773/execution/observation.json"] = JSON.stringify(observation);
  assert.ok(
    checkDay(fixture(files), "D2").some(
      (issue) => issue.includes("input_sha256") && issue.includes("SHA-256")
    )
  );
});

test("D2 requires an immutable image digest", () => {
  const files = {
    ...d2Files,
    "cves/CVE-2021-41773/lab/compose.yaml":
      "services:\n  vulnerable:\n    image: example.invalid/apache:latest\n    ports:\n      - 127.0.0.1:8080:80\n"
  };
  assert.ok(checkDay(fixture(files), "D2").some((issue) => issue.includes("image digest")));
});
