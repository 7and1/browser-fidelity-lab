import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const checks = [];
const ignoredDirs = new Set([
  ".astro",
  ".git",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results"
]);

const requiredFiles = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "ROADMAP.md",
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/false_positive.md",
  ".github/ISSUE_TEMPLATE/preset_request.md",
  "docs/API.md",
  "docs/LAUNCH_CHECKLIST.md",
  ".env.example",
  ".gitignore"
];

for (const file of requiredFiles) {
  check(`file:${file}`, existsSync(join(root, file)), `${file} exists`);
}

const localMetadataFiles = trackedFiles(".DS_Store");
check(
  "repo:local-metadata",
  localMetadataFiles.tracked.length === 0,
  localMetadataFiles.mode === "git"
    ? localMetadataFiles.tracked.length
      ? `remove tracked local metadata files: ${localMetadataFiles.tracked.join(", ")}`
      : "no tracked local metadata files found"
    : localMetadataFiles.local.length
      ? `not a git repo; ignored local metadata files: ${localMetadataFiles.local.join(", ")}`
      : "not a git repo; no local metadata files found"
);

const packageJson = readJson("package.json");
if (packageJson) {
  const scripts = packageJson.scripts ?? {};
  for (const script of ["ci", "lint:content", "typecheck", "test", "build", "check:open-source", "check:launch"]) {
    check(`script:${script}`, typeof scripts[script] === "string", `package script ${script} exists`);
  }
  check("license", packageJson.license === "MIT", "root package uses MIT license metadata");
}

const readme = readText("README.md");
if (readme) {
  check("readme:scope", readme.includes("What It Does Not Do"), "README states non-goals and authorized-use boundary");
  check("readme:affiliation", /not affiliated with CloakHQ or CloakBrowser/i.test(readme), "README carries affiliation disclaimer");
  check("readme:production-acceptance", readme.includes("Production Acceptance"), "README documents production acceptance gates");
}

const envExample = readText(".env.example");
if (envExample) {
  for (const key of ["REPORT_HASH_SECRET", "IPINFO_TOKEN", "PROXYCHECK_TOKEN"]) {
    const value = envValue(envExample, key);
    check(`env-example:${key}`, value === "", `${key} is present without a real value`);
  }
}

const gitignore = readText(".gitignore");
if (gitignore) {
  check("gitignore:env", /^\.env$/m.test(gitignore) && /^\.env\.\*$/m.test(gitignore), ".gitignore excludes env files");
  check("gitignore:macos", /^\.DS_Store$/m.test(gitignore), ".gitignore excludes macOS metadata");
}

const ok = checks.every((item) => item.ok);
console.log(JSON.stringify({ ok, checks }, null, 2));
if (!ok) {
  process.exitCode = 1;
}

function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

function readText(file) {
  try {
    return readFileSync(join(root, file), "utf8");
  } catch {
    return undefined;
  }
}

function readJson(file) {
  const text = readText(file);
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    check(`json:${file}`, false, `${file} parses as JSON`);
    return undefined;
  }
}

function envValue(text, key) {
  const match = text.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : undefined;
}

function findFiles(dir, filename, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        findFiles(join(dir, entry.name), filename, results);
      }
      continue;
    }
    if (entry.name === filename) {
      results.push(relative(root, join(dir, entry.name)));
    }
  }
  return results;
}

function trackedFiles(filename) {
  try {
    execFileSync("git", ["-C", root, "rev-parse", "--is-inside-work-tree"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    const output = execFileSync("git", ["-C", root, "ls-files", "-z"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    return {
      mode: "git",
      tracked: output
        .split("\0")
        .filter((file) => file.endsWith(`/${filename}`) || file === filename),
      local: []
    };
  } catch {
    return { mode: "filesystem", tracked: [], local: findFiles(root, filename) };
  }
}
