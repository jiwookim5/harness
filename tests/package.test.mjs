import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createPackage } from "../scripts/package-starter.mjs";

const root = resolve(import.meta.dirname, "..");

test("git archive excludes repository metadata and raw evidence", () => {
  const output = resolve(root, "dist/security-wave-cve-harness-starter.zip");
  rmSync(resolve(root, "dist"), { recursive: true, force: true });
  createPackage(root, output);
  assert.equal(existsSync(output), true);
  const entries = execFileSync("unzip", ["-Z1", output], { encoding: "utf8" });
  const unsafeRaw = entries
    .split("\n")
    .filter(Boolean)
    .filter((entry) => entry.includes("/evidence/raw/"))
    .filter((entry) => !entry.endsWith("/evidence/raw/"))
    .filter((entry) => !entry.endsWith("/evidence/raw/.gitkeep"));
  assert.equal(entries.includes(".git/"), false);
  assert.deepEqual(unsafeRaw, []);
  assert.match(entries, /AGENTS\.md/);
  assert.match(entries, /course\/tasks\/CVE-2021-41773\.md/);
});
