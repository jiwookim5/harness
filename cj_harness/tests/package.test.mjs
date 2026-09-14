import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createPackage } from "../scripts/package-starter.mjs";

const root = resolve(import.meta.dirname, "..");
const hasGitMetadata = existsSync(resolve(root, ".git"));

test("git archive excludes repository metadata and raw evidence", { skip: !hasGitMetadata }, () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "starter-package-test-"));
  const cleanRoot = resolve(tempRoot, "repo");
  const output = resolve(cleanRoot, "dist/security-wave-cve-harness-starter.zip");
  try {
    // live 학생 작업공간의 raw Evidence를 삭제하지 않고 현재 commit의 배포 안전성을 검사한다.
    execFileSync("git", ["clone", "--quiet", "--no-hardlinks", root, cleanRoot]);
    createPackage(cleanRoot, output);
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
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
