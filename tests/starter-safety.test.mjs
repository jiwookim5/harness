import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
