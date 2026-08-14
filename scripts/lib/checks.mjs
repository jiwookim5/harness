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
    const trimmed = line.trim();
    if (/^-?\s*FACT:/.test(trimmed) && !/\[(SRC|CLAIM|CLM)-\d+[a-zA-Z]?\]/.test(trimmed)) {
      issues.push(label + ": FACT requires [SRC-NNN] or [CLAIM-NNN]/[CLM-NNN]");
    }
  }
}

function checkD1(root, cveId) {
  const issues = [];
  const scope = read(root, "scope.md", issues);
  requireText(scope, "scope.md", ["localhost", "STOP", "Cleanup"], issues);
  const allowedTarget = scope.match(/허용 Target:\s*(.+)/)?.[1]?.trim();
  if (!allowedTarget) {
    issues.push("scope.md: allowed target required");
  } else if (!/^(localhost|127\.0\.0\.1)/.test(allowedTarget)) {
    issues.push("STOP scope.md: allowed target must be loopback");
  }

  const source = read(root, `cves/${cveId}/sources/source-map.md`, issues);
  if (!/https?:\/\//.test(source) && !/[a-f0-9]{7,40}/.test(source)) {
    issues.push("source-map.md: URL or commit required");
  }

  const rootCause = read(root, `cves/${cveId}/analysis/root-cause.md`, issues);
  requireText(rootCause, "root-cause.md", ["FACT:", "INFERENCE:", "UNKNOWN:", "반증 조건"], issues);
  checkFacts(rootCause, "root-cause.md", issues);

  const cwe = read(root, `cves/${cveId}/analysis/cwe.md`, issues);
  requireText(cwe, "cwe.md", ["후보:", "근거:", "반증 조건"], issues);
  checkFacts(cwe, "cwe.md", issues);

  const intake = read(root, `cves/${cveId}/intake.md`, issues);
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

function isApprovedTarget(target, scope) {
  // CTF targets are not always loopback (a hosted platform instance, an
  // assigned external IP) unlike CVE-analysis labs, which were always
  // localhost-only. An external target is allowed only if scope.md both
  // names it under "허용 Target:" and carries an explicit, non-placeholder
  // "CTF 승인:" line — approval is still required, just not restricted to
  // loopback.
  if (isLoopbackTarget(target)) return true;
  const approval = scope.match(/CTF 승인:\s*(.+)/)?.[1]?.trim();
  if (!approval || approval === "UNSET") return false;
  const scopedTarget = scope.match(/허용 Target:\s*(.+)/)?.[1]?.trim();
  return scopedTarget === String(target);
}

function checkD2(root, cveId) {
  const issues = [];
  const controlPath = `cves/${cveId}/execution/control.json`;
  const observationPath = `cves/${cveId}/execution/observation.json`;
  const composePath = `cves/${cveId}/lab/compose.yaml`;
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

function checkExecutionConsistency(root, base, vulnerable, patched, issues) {
  // input/request/criteria_sha256 tend to get hand-copied across
  // vulnerable.json, patched.json, observation.json and
  // observation-patched.json. Nothing used to cross-check those copies
  // against each other, which is exactly how a manual mismatch (e.g. the
  // matcher naming drift found in CVE-2021-43798) could slip through
  // unnoticed. This checks every one of the four that exists.
  const docs = { "execution/vulnerable.json": vulnerable, "execution/patched.json": patched };
  const optional = {
    "execution/observation.json": `${base}/execution/observation.json`,
    "execution/observation-patched.json": `${base}/execution/observation-patched.json`
  };
  for (const [key, relative] of Object.entries(optional)) {
    const file = resolve(root, relative);
    if (!existsSync(file)) continue;
    try {
      docs[key] = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      issues.push(relative + ": invalid JSON");
    }
  }
  const present = Object.keys(docs).filter((k) => docs[k] && Object.keys(docs[k]).length);
  for (const field of ["input_sha256", "request_sha256", "criteria_sha256"]) {
    const values = new Set(present.map((k) => docs[k][field]).filter(Boolean));
    if (values.size > 1) {
      issues.push(`execution consistency: ${field} differs across ${present.join(", ")}`);
    }
  }
}

function checkRequestResultLogs(root, base, index, issues) {
  // Same-Control evidence used to live only as terse JSON (hashes, refs) plus
  // a single narrative report paragraph — nobody kept a plain, unabridged
  // record of every request actually sent and every result actually
  // received. That gap is exactly how CVE-2021-43798's raw response bodies
  // ended up unreviewable without opening evidence/raw/ (which git doesn't
  // even track). Require the full, uncut request/result logs and cross-check
  // that every evidence_id in index.json is actually accounted for.
  const requestsPath = `${base}/evidence/all-requests.md`;
  const resultsPath = `${base}/evidence/all-results.md`;
  const requests = read(root, requestsPath, issues);
  const results = read(root, resultsPath, issues);
  const entries = Array.isArray(index.entries) ? index.entries : [];
  for (const entry of entries) {
    if (!entry.evidence_id) continue;
    if (results && !results.includes(entry.evidence_id)) {
      issues.push(resultsPath + ": missing result for " + entry.evidence_id);
    }
  }
  if (entries.length && requests && !/\b(GET|POST|PUT|DELETE|PATCH)\b/.test(requests)) {
    issues.push(requestsPath + ": no HTTP request line found");
  }
}

function checkSameControlWriteup(root, base, issues) {
  // Only meaningful when a Control is compared across two paired
  // environments (vulnerable vs patched), which is a CVE-analysis concept.
  const scPath = `${base}/evidence/same-control-check.md`;
  const sameControl = read(root, scPath, issues);
  if (sameControl && !/sha256/i.test(sameControl)) {
    issues.push(scPath + ": missing sha256 comparison");
  }
  if (sameControl && !/판정/.test(sameControl)) {
    issues.push(scPath + ": missing 판정 (verdict)");
  }
}

function checkFindingSummaryWriteup(root, base, issues) {
  // all-requests.md/all-results.md cover the raw transcript, but nothing
  // required the human-facing writeup that explains what it means: what was
  // sent, where the bug/entry point is, what happened. It existed for
  // CVE-2021-43798 by convention only — no Gate enforced it, so a future
  // target could skip straight to raw evidence with no reviewable summary.
  const fsPath = `${base}/evidence/finding-summary.md`;
  const findingSummary = read(root, fsPath, issues);
  requireText(findingSummary, fsPath, ["대상", "보낸 요청", "결과"], issues);
}

function checkD3(root, cveId) {
  const issues = [];
  const base = `cves/${cveId}`;
  const vulnerablePath = `${base}/execution/vulnerable.json`;
  const patchedPath = `${base}/execution/patched.json`;
  const indexPath = `${base}/evidence/index.json`;
  const reportPath = `${base}/report.md`;
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

  checkExecutionConsistency(root, base, vulnerable, patched, issues);
  checkRequestResultLogs(root, base, index, issues);
  checkSameControlWriteup(root, base, issues);
  checkFindingSummaryWriteup(root, base, issues);

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

  const reuse = read(root, `cves/${cveId}/retrospective/reuse-check.md`, issues);
  requireText(reuse, "reuse-check.md", ["Blocker:", "Harness 변경:", "다음 CVE:"], issues);
  const changelog = read(root, "harness/CHANGELOG.md", issues);
  requireText(changelog, "CHANGELOG.md", ["v1", "실패 Ref:", "재실행:"], issues);
  return issues;
}

function checkTargetCompose(root, base, issues) {
  // External CTF platforms (hosted instances, assigned IPs) don't always
  // have a local lab/compose.yaml — only run the Docker-safety checks when
  // one exists, instead of requiring it unconditionally like checkD2 did.
  const composePath = `${base}/lab/compose.yaml`;
  if (!existsSync(resolve(root, composePath))) return;
  const compose = read(root, composePath, issues);
  if (/privileged:\s*true/i.test(compose)) issues.push("STOP " + composePath + ": privileged forbidden");
  if (/network_mode:\s*host/i.test(compose)) issues.push("STOP " + composePath + ": host network forbidden");
  if (/0\.0\.0\.0:/.test(compose)) issues.push("STOP " + composePath + ": non-loopback bind forbidden");
  if (/\/var\/run\/docker\.sock/.test(compose)) issues.push("STOP " + composePath + ": Docker socket forbidden");
  if (compose && !/image:\s*\S+@sha256:[a-f0-9]{64}/i.test(compose)) {
    issues.push(composePath + ": immutable image digest required");
  }
}

// checkRun merges what used to be three separate day-gates (D1 analysis,
// D2 execution, D3 evidence/report) into one CTF-focused Gate, run against
// ctf/<TARGET-ID>/ instead of cves/<CVE-ID>/. Two CVE-specific concepts are
// intentionally dropped rather than ported over:
//   - root-cause.md/cwe.md (vulnerability classification) -> replaced by
//     recon.md (attack-surface/approach notes), same FACT/INFERENCE/UNKNOWN
//     discipline.
//   - vulnerable.json/patched.json Same-Control pairing -> doesn't apply to
//     a single CTF target with no "patched" counterpart, so that comparison
//     and its same-control-check.md writeup are skipped entirely.
export function checkRun(root, targetId) {
  const issues = [];
  const base = `ctf/${targetId}`;

  const scopePath = `${base}/scope.md`;
  const scope = read(root, scopePath, issues);
  requireText(scope, scopePath, ["STOP", "Cleanup", "허용 Target:"], issues);
  const allowedTarget = scope.match(/허용 Target:\s*(.+)/)?.[1]?.trim();
  if (!allowedTarget || allowedTarget === "UNSET") {
    issues.push(scopePath + ": allowed target required");
  } else if (!isApprovedTarget(allowedTarget, scope)) {
    issues.push("STOP " + scopePath + ": external target requires explicit CTF 승인");
  }

  const reconPath = `${base}/recon.md`;
  const recon = read(root, reconPath, issues);
  requireText(recon, reconPath, ["FACT:", "INFERENCE:", "UNKNOWN:"], issues);
  checkFacts(recon, reconPath, issues);

  const controlPath = `${base}/execution/control.json`;
  const observationPath = `${base}/execution/observation.json`;
  const control = readJson(root, controlPath, issues);
  const observation = readJson(root, observationPath, issues);

  if (!control.target) {
    issues.push(controlPath + ": target required");
  } else if (!isApprovedTarget(control.target, scope)) {
    issues.push("STOP " + controlPath + ": target must be loopback or an explicitly CTF-approved scope target");
  }
  if (control.decision !== "GO") issues.push(controlPath + ": explicit GO required");
  if (!control.cleanup || control.cleanup === "UNSET") issues.push(controlPath + ": cleanup required");
  if (!Number.isInteger(control.timeout_seconds) || control.timeout_seconds < 1) {
    issues.push(controlPath + ": positive timeout_seconds required");
  }

  if (observation.control_id !== control.control_id) issues.push(observationPath + ": control_id mismatch");
  if (observation.target !== control.target) issues.push(observationPath + ": target mismatch");
  if (observation.matcher !== control.success_matcher) issues.push(observationPath + ": matcher mismatch");
  if (!Number.isInteger(observation.exit_code)) issues.push(observationPath + ": integer exit_code required");
  for (const field of ["input_sha256", "request_sha256", "criteria_sha256"]) {
    if (!observation[field] || observation[field] === "UNSET") {
      issues.push(observationPath + ": " + field + " required");
    } else if (!/^[a-f0-9]{64}$/i.test(observation[field])) {
      issues.push(observationPath + ": " + field + " must be a SHA-256 hex digest");
    }
  }
  for (const field of ["stdout_ref", "stderr_ref", "request_ref", "response_ref", "cleanup_result"]) {
    if (!observation[field] || observation[field] === "UNSET") {
      issues.push(observationPath + ": " + field + " required");
    }
  }

  checkTargetCompose(root, base, issues);

  const indexPath = `${base}/evidence/index.json`;
  const reportPath = `${base}/report.md`;
  const index = readJson(root, indexPath, issues);
  const report = read(root, reportPath, issues);

  checkRequestResultLogs(root, base, index, issues);
  checkFindingSummaryWriteup(root, base, issues);

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

  const reuse = read(root, `${base}/retrospective/reuse-check.md`, issues);
  requireText(reuse, "reuse-check.md", ["Blocker:", "Harness 변경:", "다음 Target:"], issues);
  const changelog = read(root, "harness/CHANGELOG.md", issues);
  requireText(changelog, "CHANGELOG.md", ["v1", "실패 Ref:", "재실행:"], issues);
  return issues;
}

export function checkDay(root, day, cveId = "CVE-2021-41773") {
  if (day === "D1") return checkD1(root, cveId);
  if (day === "D2") return checkD2(root, cveId);
  if (day === "D3") return checkD3(root, cveId);
  return ["unsupported day: " + day];
}

export function classifyDecision(issues) {
  if (!issues.length) return "GO";
  if (issues.some((issue) => issue.startsWith("STOP "))) return "STOP";
  return "REVISE";
}
