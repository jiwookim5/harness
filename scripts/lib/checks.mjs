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
  const allowedTarget = scope.match(/허용 Target:\s*(.+)/)?.[1]?.trim();
  if (!allowedTarget) {
    issues.push("scope.md: allowed target required");
  } else if (!/^(localhost|127\.0\.0\.1)/.test(allowedTarget)) {
    issues.push("STOP scope.md: allowed target must be loopback");
  }

  const source = read(root, "cves/CVE-2021-41773/sources/source-map.md", issues);
  if (!/https?:\/\//.test(source) && !/[a-f0-9]{7,40}/.test(source)) {
    issues.push("source-map.md: URL or commit required");
  }

  const rootCause = read(root, "cves/CVE-2021-41773/analysis/root-cause.md", issues);
  requireText(rootCause, "root-cause.md", ["FACT:", "INFERENCE:", "UNKNOWN:", "반증 조건"], issues);
  checkFacts(rootCause, "root-cause.md", issues);

  const cwe = read(root, "cves/CVE-2021-41773/analysis/cwe.md", issues);
  requireText(cwe, "cwe.md", ["후보:", "근거:", "반증 조건"], issues);

  const intake = read(root, "cves/CVE-2021-41773/intake.md", issues);
  if (/CVE ID:\s*UNSET/.test(intake) || /제품:\s*UNSET/.test(intake)) {
    issues.push("intake.md: placeholder not filled (CVE ID/제품 still UNSET)");
  }

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

  if (!control.target) issues.push(controlPath + ": target required");
  else if (!isLoopbackTarget(control.target)) issues.push("STOP " + controlPath + ": target must be loopback");
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
  for (const field of ["input_sha256", "request_sha256", "criteria_sha256"]) {
    if (!observation[field] || observation[field] === "UNSET") {
      issues.push(observationPath + ": " + field + " required");
    } else if (!/^[a-f0-9]{64}$/i.test(observation[field])) {
      issues.push(observationPath + ": " + field + " must be a SHA-256 hex digest");
    }
  }
  for (const field of [
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

  if (/privileged:\s*true/i.test(compose)) issues.push("STOP " + composePath + ": privileged forbidden");
  if (/network_mode:\s*host/i.test(compose)) issues.push("STOP " + composePath + ": host network forbidden");
  if (/0\.0\.0\.0:/.test(compose)) issues.push("STOP " + composePath + ": non-loopback bind forbidden");
  if (/\/var\/run\/docker\.sock/.test(compose)) issues.push("STOP " + composePath + ": Docker socket forbidden");
  if (compose && !/image:\s*\S+@sha256:[a-f0-9]{64}/i.test(compose)) {
    issues.push(composePath + ": immutable image digest required");
  }
  return issues;
}

function reportEvidenceRefs(report) {
  return [...report.matchAll(/\[evidence:([A-Z0-9-]+)\]/g)].map((match) => match[1]);
}

function checkD3(root) {
  const issues = [];
  const vulnerablePath = "cves/CVE-2021-41773/execution/vulnerable.json";
  const patchedPath = "cves/CVE-2021-41773/execution/patched.json";
  const indexPath = "cves/CVE-2021-41773/evidence/index.json";
  const reportPath = "cves/CVE-2021-41773/report.md";
  const vulnerable = readJson(root, vulnerablePath, issues);
  const patched = readJson(root, patchedPath, issues);
  const index = readJson(root, indexPath, issues);
  const report = read(root, reportPath, issues);

  for (const field of [
    "control_id",
    "input_sha256",
    "request_sha256",
    "criteria_sha256",
    "matcher"
  ]) {
    if (!vulnerable[field] || vulnerable[field] !== patched[field]) {
      issues.push("same-control: " + field + " mismatch");
    }
  }

  const entries = Array.isArray(index.entries) ? index.entries : [];
  const byId = new Map(entries.map((entry) => [entry.evidence_id, entry]));
  for (const entry of entries) {
    if (entry.preserve_in_trace !== true) {
      issues.push(indexPath + ": " + entry.evidence_id + " preserve_in_trace must be true");
    }
  }

  const refs = reportEvidenceRefs(report);
  if (!refs.length) issues.push(reportPath + ": at least one [evidence:ID] required");
  for (const ref of refs) {
    const entry = byId.get(ref);
    if (!entry) issues.push(reportPath + ": missing evidence " + ref);
    else if (entry.report_eligible !== true) {
      issues.push(reportPath + ": " + ref + " report_eligible must be true");
    }
  }

  const reuse = read(root, "cves/CVE-2021-41773/retrospective/reuse-check.md", issues);
  requireText(reuse, "reuse-check.md", ["Blocker:", "Harness 변경:", "다음 CVE:"], issues);
  const changelog = read(root, "harness/CHANGELOG.md", issues);
  requireText(changelog, "CHANGELOG.md", ["v1", "실패 Ref:", "재실행:"], issues);
  return issues;
}

export function checkDay(root, day) {
  if (day === "D1") return checkD1(root);
  if (day === "D2") return checkD2(root);
  if (day === "D3") return checkD3(root);
  return ["unsupported day: " + day];
}

export function classifyDecision(issues) {
  if (!issues.length) return "GO";
  if (issues.some((issue) => issue.startsWith("STOP "))) return "STOP";
  return "REVISE";
}
