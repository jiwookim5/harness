import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { validateStarter } from "./validate-starter.mjs";

export function createPackage(root, output) {
  const issues = validateStarter(root);
  if (issues.length) throw new Error("starter validation failed: " + issues.join("; "));
  mkdirSync(dirname(output), { recursive: true });
  execFileSync("git", ["archive", "--format=zip", "--output", output, "HEAD"], {
    cwd: root,
    stdio: "pipe"
  });
  return output;
}

function main() {
  const root = resolve(import.meta.dirname, "..");
  const output = resolve(root, "dist/security-wave-cve-harness-starter.zip");
  try {
    createPackage(root, output);
    console.log("PACKAGE=GO path=" + output);
  } catch (error) {
    console.error("PACKAGE=REVISE reason=" + error.message);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
