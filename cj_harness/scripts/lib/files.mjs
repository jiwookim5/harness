import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

export function walk(root) {
  if (!existsSync(root)) return [];
  const output = [];
  for (const name of readdirSync(root)) {
    if (name === ".git" || name === "node_modules" || name === "dist") continue;
    const full = resolve(root, name);
    if (statSync(full).isDirectory()) output.push(...walk(full));
    else output.push(full);
  }
  return output;
}

export function read(file) {
  return readFileSync(file, "utf8");
}

export function rel(root, file) {
  return relative(root, file).split("\\").join("/");
}
