import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const idPattern = /^CVE-\d{4}-\d{4,7}$/;
const directories = [
  "sources",
  "analysis",
  "lab",
  "weaponization",
  "execution",
  "evidence/raw",
  "evidence/masked",
  "retrospective"
];

export function createCve(root, cveId) {
  if (!idPattern.test(cveId)) throw new Error("invalid CVE ID");
  const target = resolve(root, "cves", cveId);
  if (existsSync(target)) throw new Error("CVE workspace already exists");

  for (const directory of directories) {
    mkdirSync(resolve(target, directory), { recursive: true });
  }

  const templateRoot = resolve(root, "harness/templates");
  const copy = (template, destination) => {
    const content = readFileSync(resolve(templateRoot, template), "utf8")
      .replace("CVE ID: UNSET", "CVE ID: " + cveId);
    writeFileSync(resolve(target, destination), content);
  };

  copy("intake.md", "intake.md");
  copy("source-map.md", "sources/source-map.md");
  copy("report.md", "report.md");
  writeFileSync(
    resolve(target, "README.md"),
    "# " + cveId + " 작업 공간\n\n공통 Harness를 적용하고 Source Ref와 Tool Observation으로 결론을 검증한다.\n"
  );
  for (const directory of ["analysis", "lab", "weaponization", "execution", "retrospective"]) {
    writeFileSync(
      resolve(target, directory, "README.md"),
      "# " + cveId + " " + directory + "\n\n상태: PENDING\n"
    );
  }
  writeFileSync(resolve(target, "evidence/raw/.gitkeep"), "");
  writeFileSync(resolve(target, "evidence/masked/.gitkeep"), "");
  writeFileSync(
    resolve(target, "evidence/index.json"),
    JSON.stringify({ cve_id: cveId, entries: [] }, null, 2) + "\n"
  );
  return target;
}

function main() {
  const cveId = process.argv[2];
  const root = resolve(import.meta.dirname, "..");
  try {
    const target = createCve(root, cveId ?? "");
    console.log("CVE_CREATED=" + target);
  } catch (error) {
    console.error("CVE_CREATE=REVISE reason=" + error.message);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
