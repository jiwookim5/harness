import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (name) => readFileSync(resolve(root, name), "utf8");

test("AGENTS contract is question-first and human-approved", () => {
  const agents = read("AGENTS.md");
  const required = [
    "AI 출력은 Evidence가 아니다",
    "한 번에 2~3개 행동",
    "GO <control_id>",
    "Scope를 승인하지 않는다",
    "성공을 확정하지 않는다",
    "실패, REJECTED, UNKNOWN을 삭제하지 않는다",
    "같은 Control"
  ];
  for (const phrase of required) assert.match(agents, new RegExp(phrase));
});

test("Claude adapter has no second policy source", () => {
  const claude = read("CLAUDE.md");
  assert.match(claude, /AGENTS\.md를 먼저 읽/);
  assert.ok(claude.split("\n").length <= 8);
});

test("first response waits for student answers", () => {
  const agents = read("AGENTS.md");
  assert.match(agents, /학생 답변 전에는 파일·Docker·PoC를 만들지 않는다/);
});
