import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extname, join } from "node:path";

const blocked = [
  /绕过验证码/u,
  /打穿风控/u,
  /通过 Cloudflare/u,
  /bypass captcha/i,
  /bypass bot/i,
  /evade detection/i
];

const root = fileURLToPath(new URL("..", import.meta.url));
const allowedExtensions = new Set([".md", ".astro", ".tsx", ".ts", ".js", ".mjs", ".json"]);
const ignoredDirs = new Set(["node_modules", "dist", ".astro", ".wrangler", ".git", "coverage"]);
const files = collectFiles(root);

let failed = false;

for (const file of files) {
  if (file === "scripts/check-content-policy.mjs") continue;
  const text = readFileSync(join(root, file), "utf8");
  for (const pattern of blocked) {
    if (pattern.test(text)) {
      console.error(`[content-policy] ${file} matches ${pattern}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exitCode = 1;
}

function collectFiles(dir, prefix = "") {
  const entries = readdirSync(dir);
  const output = [];

  for (const entry of entries) {
    if (ignoredDirs.has(entry)) continue;
    const absolute = join(dir, entry);
    const relative = prefix ? `${prefix}/${entry}` : entry;
    const stat = statSync(absolute);

    if (stat.isDirectory()) {
      output.push(...collectFiles(absolute, relative));
    } else if (allowedExtensions.has(extname(entry))) {
      output.push(relative);
    }
  }

  return output;
}
