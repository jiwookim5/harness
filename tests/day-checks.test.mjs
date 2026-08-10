import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { checkDay } from "../scripts/lib/checks.mjs";

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
