import { resolve, extname, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { walk, read, rel } from "./lib/files.mjs";

const executableExtensions = new Set([".sh", ".mjs", ".js", ".yaml", ".yml", ".json"]);
const unsafe = [
  [/privileged:\s*true/i, "privileged container"],
  [/network_mode:\s*host/i, "host network"],
  [/0\.0\.0\.0:/, "non-loopback bind"],
  [/\/var\/run\/docker\.sock/, "Docker socket mount"]
];
const secretPatterns = [
  /AKIA[0-9A-Z]{12,}/,
  /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/
];

export function validateStarter(root) {
  const issues = [];
  for (const file of walk(root)) {
    const relative = rel(root, file);
    if (relative.includes("/evidence/raw/") && basename(file) !== ".gitkeep") {
      issues.push(relative + ": tracked raw evidence");
    }
    const fixtureOrValidator =
      relative.startsWith("tests/") ||
      relative === "scripts/validate-starter.mjs";
    if (fixtureOrValidator) continue;
    const content = read(file);
    if (secretPatterns.some((pattern) => pattern.test(content))) {
      issues.push(relative + ": secret material");
    }
    if (!executableExtensions.has(extname(file))) continue;
    for (const [pattern, label] of unsafe) {
      if (pattern.test(content)) issues.push(relative + ": " + label);
    }
  }
  return issues;
}

function main() {
  const root = resolve(import.meta.dirname, "..");
  const issues = validateStarter(root);
  if (issues.length) {
    for (const issue of issues) console.error("REVISE " + issue);
    console.error("VALIDATION=REVISE issues=" + issues.length);
    process.exitCode = 1;
    return;
  }
  console.log("VALIDATION=GO");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
