import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createCve } from "../scripts/new-cve.mjs";

function rootWithTemplates() {
  const root = mkdtempSync(join(tmpdir(), "new-cve-"));
  mkdirSync(resolve(root, "harness/templates"), { recursive: true });
  writeFileSync(resolve(root, "harness/templates/intake.md"), "# Intake\n- CVE ID: UNSET\n");
  writeFileSync(resolve(root, "harness/templates/source-map.md"), "# Source Map\n");
  writeFileSync(resolve(root, "harness/templates/report.md"), "# Report\n");
  return root;
}

test("new CVE creates the exact student workspace", () => {
  const root = rootWithTemplates();
  createCve(root, "CVE-2026-12345");
  assert.equal(existsSync(resolve(root, "cves/CVE-2026-12345/README.md")), true);
  assert.equal(existsSync(resolve(root, "cves/CVE-2026-12345/intake.md")), true);
  assert.equal(existsSync(resolve(root, "cves/CVE-2026-12345/evidence/raw/.gitkeep")), true);
  assert.match(
    readFileSync(resolve(root, "cves/CVE-2026-12345/intake.md"), "utf8"),
    /CVE-2026-12345/
  );
});

test("new CVE rejects invalid identifiers", () => {
  const root = rootWithTemplates();
  assert.throws(() => createCve(root, "../../outside"), /invalid CVE ID/);
});

test("new CVE never overwrites an existing workspace", () => {
  const root = rootWithTemplates();
  createCve(root, "CVE-2026-12345");
  assert.throws(() => createCve(root, "CVE-2026-12345"), /already exists/);
});
