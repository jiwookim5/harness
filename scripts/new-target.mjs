import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const idPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{1,62}$/;
const directories = [
  "execution",
  "evidence/raw",
  "evidence/masked",
  "retrospective"
];

export function createTarget(root, targetId) {
  if (!idPattern.test(targetId)) throw new Error("invalid target ID");
  const target = resolve(root, "ctf", targetId);
  if (existsSync(target)) throw new Error("target workspace already exists");

  for (const directory of directories) {
    mkdirSync(resolve(target, directory), { recursive: true });
  }

  const templateRoot = resolve(root, "harness/templates");
  const copy = (template, destination, replace) => {
    let content = readFileSync(resolve(templateRoot, template), "utf8");
    if (replace) content = content.replace(replace[0], replace[1]);
    writeFileSync(resolve(target, destination), content);
  };

  copy("target-scope.md", "scope.md", ["Scope — UNSET", "Scope — " + targetId]);
  copy("recon.md", "recon.md", ["Recon — UNSET", "Recon — " + targetId]);
  copy("ctf-report.md", "report.md");
  copy("all-requests.md", "evidence/all-requests.md");
  copy("all-results.md", "evidence/all-results.md");
  copy("finding-summary.md", "evidence/finding-summary.md");
  writeFileSync(
    resolve(target, "README.md"),
    "# " + targetId + " 작업 공간\n\n공통 Harness를 적용하고 Source Ref와 Tool Observation으로 결론을 검증한다.\n"
  );
  for (const directory of ["execution", "retrospective"]) {
    writeFileSync(
      resolve(target, directory, "README.md"),
      "# " + targetId + " " + directory + "\n\n상태: PENDING\n"
    );
  }
  writeFileSync(resolve(target, "evidence/raw/.gitkeep"), "");
  writeFileSync(resolve(target, "evidence/masked/.gitkeep"), "");
  writeFileSync(
    resolve(target, "evidence/index.json"),
    JSON.stringify({ target_id: targetId, entries: [] }, null, 2) + "\n"
  );
  return target;
}

function main() {
  const targetId = process.argv[2];
  const root = resolve(import.meta.dirname, "..");
  try {
    const target = createTarget(root, targetId ?? "");
    console.log("TARGET_CREATED=" + target);
  } catch (error) {
    console.error("TARGET_CREATE=REVISE reason=" + error.message);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
