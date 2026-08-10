import { resolve } from "node:path";
import { checkDay } from "./lib/checks.mjs";

const day = process.argv[2];
if (!["D1", "D2", "D3"].includes(day)) {
  console.error("usage: npm run check -- D1|D2|D3");
  process.exit(2);
}

const root = resolve(import.meta.dirname, "..");
const issues = checkDay(root, day);
if (issues.length) {
  for (const issue of issues) console.error("REVISE " + issue);
  console.error("DAY=" + day + " DECISION=REVISE issues=" + issues.length);
  process.exit(1);
}
console.log("DAY=" + day + " DECISION=GO");
