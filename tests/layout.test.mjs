import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "STUDENT-GUIDE.md",
  "scope.md",
  "course/brief.md",
  "course/tasks/CVE-2021-41773.md",
  "harness/README.md",
  "harness/workflow.md",
  "harness/policies/invariants.md",
  "cves/CVE-2021-41773/intake.md",
  "scripts/validate-starter.mjs"
];

test("starter exposes every required entry point", () => {
  for (const relative of required) {
    assert.equal(existsSync(resolve(root, relative)), true, relative);
  }
});

test("package scripts stay dependency-free and deterministic", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.equal(pkg.type, "module");
  assert.equal(pkg.engines.node, ">=22");
  assert.deepEqual(pkg.dependencies ?? {}, {});
  assert.equal(pkg.scripts.test, "node --test");
  assert.equal(pkg.scripts.validate, "node scripts/validate-starter.mjs");
  assert.equal(pkg.scripts.check, "node scripts/check-day.mjs");
  assert.equal(pkg.scripts["new:cve"], "node scripts/new-cve.mjs");
  assert.equal(pkg.scripts.pack, "node scripts/package-starter.mjs");
});

test("first CVE workspace and harness templates are complete", () => {
  const requiredWorkspace = [
    "harness/templates/intake.md",
    "harness/templates/source-map.md",
    "harness/templates/claim-ledger.json",
    "harness/templates/control.json",
    "harness/templates/observation.json",
    "harness/templates/report.md",
    "cves/CVE-2021-41773/README.md",
    "cves/CVE-2021-41773/sources/source-map.md",
    "cves/CVE-2021-41773/analysis/README.md",
    "cves/CVE-2021-41773/lab/README.md",
    "cves/CVE-2021-41773/weaponization/README.md",
    "cves/CVE-2021-41773/execution/README.md",
    "cves/CVE-2021-41773/evidence/raw/.gitkeep",
    "cves/CVE-2021-41773/evidence/masked/.gitkeep",
    "cves/CVE-2021-41773/evidence/index.json",
    "cves/CVE-2021-41773/retrospective/README.md",
    "cves/CVE-2021-41773/report.md"
  ];
  for (const relative of requiredWorkspace) {
    assert.equal(existsSync(resolve(root, relative)), true, relative);
  }
});
