import { resolve } from "node:path";
import { checkDay, classifyDecision } from "./lib/checks.mjs";

const day = process.argv[2];
const cveId = process.argv[3] || "CVE-2021-41773";
if (!["D1", "D2", "D3"].includes(day)) {
  console.error("usage: npm run check -- D1|D2|D3 [CVE-ID]");
  process.exit(2);
}

const root = resolve(import.meta.dirname, "..");
const issues = checkDay(root, day, cveId);
const decision = classifyDecision(issues);
if (decision !== "GO") {
  for (const issue of issues) {
    console.error(issue.startsWith("STOP ") ? issue : "REVISE " + issue);
  }
  console.error("DAY=" + day + " CVE=" + cveId + " DECISION=" + decision + " issues=" + issues.length);
  process.exit(decision === "STOP" ? 2 : 1);
}
console.log("DAY=" + day + " CVE=" + cveId + " DECISION=GO");
