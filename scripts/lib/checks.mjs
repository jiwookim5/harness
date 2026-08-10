import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(root, relative, issues) {
  const file = resolve(root, relative);
  if (!existsSync(file)) {
    issues.push(relative + ": missing");
    return "";
  }
  return readFileSync(file, "utf8");
}

function requireText(content, label, terms, issues) {
  for (const term of terms) {
    if (!content.includes(term)) issues.push(label + ": missing " + term);
  }
}

function checkFacts(content, label, issues) {
  for (const line of content.split("\n")) {
    if (line.trim().startsWith("FACT:") && !/\[SRC-\d+\]/.test(line)) {
      issues.push(label + ": FACT requires [SRC-NNN]");
    }
  }
}

function checkD1(root) {
  const issues = [];
  const scope = read(root, "scope.md", issues);
  requireText(scope, "scope.md", ["localhost", "STOP", "Cleanup"], issues);

  const source = read(root, "cves/CVE-2021-41773/sources/source-map.md", issues);
  if (!/https?:\/\//.test(source) && !/[a-f0-9]{7,40}/.test(source)) {
    issues.push("source-map.md: URL or commit required");
  }

  const rootCause = read(root, "cves/CVE-2021-41773/analysis/root-cause.md", issues);
  requireText(rootCause, "root-cause.md", ["FACT:", "INFERENCE:", "UNKNOWN:", "반증 조건"], issues);
  checkFacts(rootCause, "root-cause.md", issues);

  const cwe = read(root, "cves/CVE-2021-41773/analysis/cwe.md", issues);
  requireText(cwe, "cwe.md", ["후보:", "근거:", "반증 조건"], issues);

  const workflow = read(root, "harness/workflow.md", issues);
  requireText(workflow, "workflow.md", ["PLAN", "HUMAN GO", "RUN", "CHECK"], issues);
  read(root, "harness/CHANGELOG.md", issues);
  return issues;
}

export function checkDay(root, day) {
  if (day === "D1") return checkD1(root);
  return ["unsupported day: " + day];
}
