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
