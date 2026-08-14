import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createTarget } from "../scripts/new-target.mjs";

function rootWithTemplates() {
  const root = mkdtempSync(join(tmpdir(), "new-target-"));
  mkdirSync(resolve(root, "harness/templates"), { recursive: true });
  writeFileSync(resolve(root, "harness/templates/target-scope.md"), "# Scope — UNSET\n허용 Target: UNSET\n");
  writeFileSync(resolve(root, "harness/templates/recon.md"), "# Recon — UNSET\nFACT: UNSET\n");
  writeFileSync(resolve(root, "harness/templates/ctf-report.md"), "# CTF Report\n");
  writeFileSync(resolve(root, "harness/templates/all-requests.md"), "# All Requests\n");
  writeFileSync(resolve(root, "harness/templates/all-results.md"), "# All Results\n");
  writeFileSync(resolve(root, "harness/templates/finding-summary.md"), "# 취약점 발견 요약 — UNSET\n");
  return root;
}

test("new target creates the exact CTF workspace", () => {
  const root = rootWithTemplates();
  createTarget(root, "picoctf-baby-rop");
  assert.equal(existsSync(resolve(root, "ctf/picoctf-baby-rop/README.md")), true);
  assert.equal(existsSync(resolve(root, "ctf/picoctf-baby-rop/scope.md")), true);
  assert.equal(existsSync(resolve(root, "ctf/picoctf-baby-rop/recon.md")), true);
  assert.equal(existsSync(resolve(root, "ctf/picoctf-baby-rop/report.md")), true);
  assert.equal(existsSync(resolve(root, "ctf/picoctf-baby-rop/evidence/all-requests.md")), true);
  assert.equal(existsSync(resolve(root, "ctf/picoctf-baby-rop/evidence/all-results.md")), true);
  assert.equal(existsSync(resolve(root, "ctf/picoctf-baby-rop/evidence/finding-summary.md")), true);
  assert.equal(existsSync(resolve(root, "ctf/picoctf-baby-rop/evidence/raw/.gitkeep")), true);
  assert.equal(existsSync(resolve(root, "ctf/picoctf-baby-rop/evidence/index.json")), true);
  assert.match(
    readFileSync(resolve(root, "ctf/picoctf-baby-rop/scope.md"), "utf8"),
    /Scope — picoctf-baby-rop/
  );
  const index = JSON.parse(readFileSync(resolve(root, "ctf/picoctf-baby-rop/evidence/index.json"), "utf8"));
  assert.deepEqual(index, { target_id: "picoctf-baby-rop", entries: [] });
});

test("new target rejects invalid identifiers", () => {
  const root = rootWithTemplates();
  assert.throws(() => createTarget(root, "../../outside"), /invalid target ID/);
});

test("new target never overwrites an existing workspace", () => {
  const root = rootWithTemplates();
  createTarget(root, "picoctf-baby-rop");
  assert.throws(() => createTarget(root, "picoctf-baby-rop"), /already exists/);
});
