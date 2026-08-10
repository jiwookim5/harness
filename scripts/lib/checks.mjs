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

function readJson(root, relative, issues) {
  const content = read(root, relative, issues);
  if (!content) return {};
  try {
    return JSON.parse(content);
  } catch {
    issues.push(relative + ": invalid JSON");
    return {};
  }
}

function isLoopbackTarget(value) {
  return /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(String(value));
}

function checkD2(root) {
  const issues = [];
  const controlPath = "cves/CVE-2021-41773/execution/control.json";
  const observationPath = "cves/CVE-2021-41773/execution/observation.json";
  const composePath = "cves/CVE-2021-41773/lab/compose.yaml";
  const control = readJson(root, controlPath, issues);
  const observation = readJson(root, observationPath, issues);
  const compose = read(root, composePath, issues);

  if (!isLoopbackTarget(control.target)) issues.push(controlPath + ": target must be loopback");
  if (control.decision !== "GO") issues.push(controlPath + ": explicit GO required");
  if (!control.cleanup || control.cleanup === "UNSET") issues.push(controlPath + ": cleanup required");
  if (!Number.isInteger(control.timeout_seconds) || control.timeout_seconds < 1) {
    issues.push(controlPath + ": positive timeout_seconds required");
  }

  if (observation.control_id !== control.control_id) {
    issues.push(observationPath + ": control_id mismatch");
  }
  if (observation.target !== control.target) {
    issues.push(observationPath + ": target mismatch");
  }
  if (observation.matcher !== control.success_matcher) {
    issues.push(observationPath + ": matcher mismatch");
  }
  if (!Number.isInteger(observation.exit_code)) {
    issues.push(observationPath + ": integer exit_code required");
  }
  for (const field of [
    "input_sha256",
    "request_sha256",
    "criteria_sha256",
    "stdout_ref",
    "stderr_ref",
    "request_ref",
    "response_ref",
    "server_log_ref",
    "cleanup_result"
  ]) {
    if (!observation[field] || observation[field] === "UNSET") {
      issues.push(observationPath + ": " + field + " required");
    }
  }

  if (/privileged:\s*true/i.test(compose)) issues.push(composePath + ": privileged forbidden");
  if (/network_mode:\s*host/i.test(compose)) issues.push(composePath + ": host network forbidden");
  if (/0\.0\.0\.0:/.test(compose)) issues.push(composePath + ": non-loopback bind forbidden");
  if (/\/var\/run\/docker\.sock/.test(compose)) issues.push(composePath + ": Docker socket forbidden");
  return issues;
}

export function checkDay(root, day) {
  if (day === "D1") return checkD1(root);
  if (day === "D2") return checkD2(root);
  return ["unsupported day: " + day];
}
