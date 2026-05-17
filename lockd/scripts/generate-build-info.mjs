#!/usr/bin/env node
// Generates public/build.json with commit+timestamp on each build.
// Run automatically via `next build`.

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");
mkdirSync(publicDir, { recursive: true });

let commit, short, date;
try {
  commit = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  short = commit.slice(0, 7);
} catch {
  commit = "unknown";
  short = "unknown";
}
try {
  date = execSync("git log -1 --format=%ci", { encoding: "utf-8" }).trim();
} catch {
  date = new Date().toISOString();
}

const info = {
  build: short,
  commit,
  date,
  builtAt: new Date().toISOString(),
};

writeFileSync(resolve(publicDir, "build.json"), JSON.stringify(info, null, 2));
console.log(`[build] ${short} — ${date}`);