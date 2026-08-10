import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { join } from "node:path";
import { validateStarter } from "../scripts/validate-starter.mjs";

const root = resolve(import.meta.dirname, "..");
const read = (name) => readFileSync(resolve(root, name), "utf8");

test("fixed task card gives questions without the technical answer", () => {
  const card = read("course/tasks/CVE-2021-41773.md");
  for (const leaked of ["2.4.49", "2.4.50", "2.4.51", "SECURITY_WAVE_P01_LOCAL_ONLY"]) {
    assert.equal(card.includes(leaked), false, leaked);
  }
  for (const required of ["공식 Advisory", "Patch Diff", "Root Cause", "CWE", "localhost"]) {
    assert.equal(card.includes(required), true, required);
  }
});

test("student guide contains every three-day gate", () => {
  const guide = read("STUDENT-GUIDE.md");
  for (const required of ["D1", "D2", "D3", "Same-Control", "Evidence Ref", "다음 CVE"]) {
    assert.equal(guide.includes(required), true, required);
  }
});

function sandbox(files) {
  const root = mkdtempSync(join(tmpdir(), "cve-starter-"));
  for (const [relative, content] of Object.entries(files)) {
    const target = resolve(root, relative);
    mkdirSync(resolve(target, ".."), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

test("validator rejects executable assets with unsafe Docker settings", () => {
  const root = sandbox({
    "lab/compose.yaml": "services:\n  app:\n    privileged: true\n"
  });
  assert.ok(validateStarter(root).some((issue) => issue.includes("privileged")));
});

test("validator rejects tracked raw evidence", () => {
  const root = sandbox({
    "cves/CVE-TEST/evidence/raw/secret.txt": "secret"
  });
  assert.ok(validateStarter(root).some((issue) => issue.includes("raw evidence")));
});

test("validator accepts an empty raw evidence directory", () => {
  const root = sandbox({
    "cves/CVE-TEST/evidence/raw/.gitkeep": ""
  });
  assert.deepEqual(validateStarter(root), []);
});

test("validator rejects secret material in documentation", () => {
  const root = sandbox({
    "notes/leak.md": "-----BEGIN PRIVATE KEY-----\nredacted fixture\n"
  });
  assert.ok(validateStarter(root).some((issue) => issue.includes("secret material")));
});
