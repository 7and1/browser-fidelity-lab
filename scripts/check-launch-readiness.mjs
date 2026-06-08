import { Resolver } from "node:dns/promises";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = new Set(process.argv.slice(2));
const publicChecks = args.has("--public");
const baseUrl =
  process.argv
    .slice(2)
    .find((arg) => arg.startsWith("--base-url="))
    ?.slice("--base-url=".length) ??
  process.env.CLOAKBROWSER_BASE_URL ??
  "https://cloakbrowser.org";
const url = new URL(baseUrl);
const checks = [];

check("wrangler:exists", existsSync(join(root, "apps/web/wrangler.toml")), "apps/web/wrangler.toml exists");

const wrangler = readText("apps/web/wrangler.toml");
if (wrangler) {
  check(
    "wrangler:d1-binding",
    /binding\s*=\s*"REPORTS"/.test(wrangler),
    "REPORTS D1 binding is declared"
  );
  check(
    "wrangler:d1-database-id",
    !/replace-with-cloudflare-d1-database-id/.test(wrangler),
    "D1 database_id has been replaced with a real Cloudflare database id"
  );
  check("wrangler:cron", /crons\s*=\s*\[/.test(wrangler), "scheduled cleanup cron is configured");
}

check(
  "secret:REPORT_HASH_SECRET",
  Boolean(process.env.REPORT_HASH_SECRET),
  "REPORT_HASH_SECRET is present in the current deploy shell"
);
check(
  "auth:cloudflare",
  Boolean(process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || process.env.CLOUDFLARE_API_KEY),
  "a Cloudflare API auth environment key is present in the current shell"
);
check("script:deploy", existsSync(join(root, "deploy.sh")), "deploy.sh exists");

if (publicChecks) {
  await checkPublicDns(url.hostname);
  await checkJsonEndpoint(url, "/api/health", 200, "ok");
  await checkJsonEndpoint(url, "/api/ready", 200, "ok");
}

const ok = checks.every((item) => item.ok);
console.log(JSON.stringify({ ok, baseUrl: url.href, publicChecks, checks }, null, 2));
if (!ok) {
  process.exitCode = 1;
}

function check(name, ok, detail, extra = undefined) {
  checks.push({ name, ok: Boolean(ok), detail, ...(extra ? { extra } : {}) });
}

function readText(file) {
  try {
    return readFileSync(join(root, file), "utf8");
  } catch {
    return undefined;
  }
}

async function checkPublicDns(hostname) {
  const resolver = new Resolver();
  resolver.setServers(["1.1.1.1", "8.8.8.8"]);

  try {
    const records = await resolver.resolve4(hostname);
    check(
      "public-dns:a-record",
      records.length > 0 && records.some((record) => isPublicIpv4(record)),
      "public resolvers return at least one public A record",
      { records }
    );
  } catch (error) {
    check("public-dns:a-record", false, "public resolver lookup failed", {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function checkJsonEndpoint(origin, path, expectedStatus, expectedKey) {
  const target = new URL(path, origin);
  try {
    const response = await fetchWithTimeout(target.href);
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
    check(
      `public:${path}`,
      response.status === expectedStatus && body && body[expectedKey] === true,
      `${path} returns ${expectedStatus} JSON with ${expectedKey}=true`,
      { status: response.status, contentType: response.headers.get("content-type") }
    );
  } catch (error) {
    check(`public:${path}`, false, `${path} request failed`, {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function fetchWithTimeout(target, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(target, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isPublicIpv4(address) {
  const octets = address.split(".").map((value) => Number(value));
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }

  const [first, second, third] = octets;
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 168) return false;
  if (first === 192 && second === 0 && third === 2) return false;
  if (first === 198 && (second === 18 || second === 19)) return false;
  if (first === 198 && second === 51 && third === 100) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
}
