import { readFile } from "node:fs/promises";
import { join } from "node:path";

const baseUrl = process.env.CLOAKBROWSER_BASE_URL ?? process.env.OPENCLAW_PREVIEW_URL ?? "https://cloakbrowser.org";
const canonicalOrigin = process.env.CLOAKBROWSER_CANONICAL_ORIGIN ?? "https://cloakbrowser.org";
const cacheBust = process.env.CLOAKBROWSER_SMOKE_CACHE_BUST ?? "";
const distDir = process.env.CLOAKBROWSER_DIST_DIR;

const pages = [
  { path: "/", title: "Cloak Browser", links: ["/tools/timezone-ip-mismatch-checker", "/tools/mobile-browser-fingerprint-test", "/tools/playwright-device-preset-generator"] },
  { path: "/scan", title: "Browser Environment Scanner", links: ["/tools/playwright-device-preset-generator", "/docs/ci-browser-fidelity-checks"] },
  {
    path: "/tools",
    title: "Cloak Browser Tools",
    links: [
      "/scan",
      "/tools/mobile-browser-fingerprint-test",
      "/tools/playwright-device-preset-generator",
      "/tools/proxy-geo-consistency-checker",
      "/tools/timezone-ip-mismatch-checker",
      "/tools/user-agent-parser",
      "/tools/webrtc-leak-test"
    ]
  },
  { path: "/tools/mobile-browser-fingerprint-test", title: "Mobile Browser Fingerprint Test", links: ["/scan", "/tools/playwright-device-preset-generator", "/docs/ci-browser-fidelity-checks"] },
  { path: "/tools/playwright-device-preset-generator", title: "Playwright Device Preset Generator", links: ["/scan", "/docs/ci-browser-fidelity-checks"] },
  { path: "/tools/proxy-geo-consistency-checker", title: "Proxy Geo Consistency Checker", links: ["/scan", "/tools/playwright-device-preset-generator", "/docs/ci-browser-fidelity-checks"] },
  { path: "/tools/timezone-ip-mismatch-checker", title: "Timezone IP Mismatch Checker", links: ["/scan", "/tools/playwright-device-preset-generator", "/docs/ci-browser-fidelity-checks"] },
  { path: "/tools/user-agent-parser", title: "User Agent Parser", links: ["/scan", "/tools/playwright-device-preset-generator", "/docs/ci-browser-fidelity-checks"] },
  { path: "/tools/webrtc-leak-test", title: "WebRTC Candidate Check", links: ["/scan", "/tools/playwright-device-preset-generator", "/docs/ci-browser-fidelity-checks"] },
  { path: "/docs/browser-fingerprint-consistency", title: "Browser Fingerprint Consistency Guide", links: ["/tools/timezone-ip-mismatch-checker"] },
  { path: "/docs/cloakbrowser-runtime-compatibility", title: "CloakBrowser Runtime Compatibility", links: ["/tools/mobile-browser-fingerprint-test", "/tools/timezone-ip-mismatch-checker"] },
  { path: "/docs/playwright-mobile-emulation", title: "Playwright Mobile Emulation Checklist", links: ["/tools/playwright-device-preset-generator"] },
  { path: "/docs/ci-browser-fidelity-checks", title: "CI Browser Consistency Checks", links: ["/tools/playwright-device-preset-generator"] }
];

const checks = [];

try {
  for (const page of pages) {
    await checkHtmlPage(page);
  }
  await checkText("/robots.txt", "Sitemap: https://cloakbrowser.org/sitemap-index.xml");
  await checkText("/sitemap-index.xml", "<lastmod>2026-06-09</lastmod>");
  await checkText("/sitemap.xml", "<lastmod>2026-06-09</lastmod>");
  await checkText("/sitemap.xml", "https://cloakbrowser.org/tools/playwright-device-preset-generator");

  console.log(JSON.stringify({ baseUrl, checks, ok: true }, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        baseUrl,
        checks,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    )
  );
  process.exitCode = 1;
}

async function checkHtmlPage(page) {
  const { status, ok, text: html } = await readRoute(page.path);
  assert(ok, `${page.path} expected 2xx, got ${status}`);
  assert(html.includes("<html"), `${page.path} did not return HTML`);
  assert(html.includes(`<title>${page.title}`), `${page.path} title does not include ${page.title}`);
  assert(/<meta name="description" content="[^"]{40,}"/.test(html), `${page.path} missing useful meta description`);
  assert(/<meta name="robots" content="index,follow"/.test(html), `${page.path} missing index robots meta`);
  assert(hasCanonical(html, page.path), `${page.path} missing canonical`);
  assert(html.includes('property="og:image"'), `${page.path} missing Open Graph image`);
  assert(html.includes('name="twitter:image"'), `${page.path} missing Twitter image`);
  for (const link of page.links) {
    assert(html.includes(`href="${link}"`), `${page.path} missing expected internal link ${link}`);
  }
  if (page.path === "/tools") {
    assert(html.includes('"@type":"ItemList"'), "/tools missing ItemList schema");
  }
  checks.push({ path: page.path, status, ok: true });
}

async function checkText(path, expected) {
  const { status, ok, text } = await readRoute(path);
  assert(ok, `${path} expected 2xx, got ${status}`);
  assert(text.includes(expected), `${path} missing ${expected}`);
  checks.push({ path, status, ok: true });
}

async function readRoute(path) {
  if (distDir) {
    const text = await readFile(routeFile(path), "utf8");
    return { status: 200, ok: true, text };
  }

  const response = await fetchWithTimeout(buildUrl(path));
  return { status: response.status, ok: response.ok, text: await response.text() };
}

function routeFile(path) {
  if (path === "/") return join(distDir, "index.html");
  if (path.endsWith(".xml") || path.endsWith(".txt")) return join(distDir, path.slice(1));
  return join(distDir, path.slice(1), "index.html");
}

function buildUrl(path) {
  const url = new URL(path, baseUrl);
  if (cacheBust) {
    url.searchParams.set("t", cacheBust);
  }
  return url;
}

function hasCanonical(html, path) {
  const canonical = new URL(path, canonicalOrigin);
  const candidates = new Set([canonical.href]);
  if (path !== "/" && !canonical.href.endsWith("/")) {
    candidates.add(`${canonical.href}/`);
  }
  return [...candidates].some((href) => html.includes(`rel="canonical" href="${href}"`));
}

async function fetchWithTimeout(url, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { Accept: "text/html,application/xml,text/plain" },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
