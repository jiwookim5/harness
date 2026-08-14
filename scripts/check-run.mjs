import { resolve } from "node:path";
import { checkRun, classifyDecision } from "./lib/checks.mjs";

const targetId = process.argv[2];
if (!targetId) {
  console.error("usage: npm run check:run -- <TARGET-ID>");
  process.exit(2);
}

const root = resolve(import.meta.dirname, "..");
const issues = checkRun(root, targetId);
const decision = classifyDecision(issues);
if (decision !== "GO") {
  for (const issue of issues) {
    console.error(issue.startsWith("STOP ") ? issue : "REVISE " + issue);
  }
  console.error("TARGET=" + targetId + " DECISION=" + decision + " issues=" + issues.length);
  process.exit(decision === "STOP" ? 2 : 1);
}
console.log("TARGET=" + targetId + " DECISION=GO");
