const baseUrl = process.env.CLOAKBROWSER_BASE_URL ?? "https://cloakbrowser.org";

const minimalReport = {
  source: "browser",
  client: {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    screen: { width: 1440, height: 900 },
    devicePixelRatio: 2,
    touchPoints: 0,
    languages: ["en-US"],
    timezone: "America/New_York"
  },
  ip: { countryCode: "US", timezone: "America/New_York" },
  consent: { webrtc: false, geolocation: false, mediaDevices: false }
};

const checks = [];

try {
  await checkHtml("/");
  await checkHtml("/scan");
  await checkHtml("/tools");
  await checkHtml("/tools/playwright-device-preset-generator");
  await checkText("/robots.txt", `Sitemap: ${new URL("/sitemap-index.xml", baseUrl).href}`);
  await checkText("/sitemap-index.xml", "<sitemapindex");
  await checkText("/sitemap.xml", "/tools/timezone-ip-mismatch-checker");
  await checkJson("/api/health", "ok");
  await checkJson("/api/ready", "ok");
  await checkJson("/api/ip", "ip");
  await checkReportLifecycle();

  console.log(JSON.stringify({ baseUrl, checks, ok: true }, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        baseUrl,
        checks,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        cause:
          error instanceof Error && error.cause instanceof Error
            ? { message: error.cause.message, code: "code" in error.cause ? error.cause.code : undefined }
            : undefined
      },
      null,
      2
    )
  );
  process.exitCode = 1;
}

async function checkHtml(path) {
  const response = await fetchWithTimeout(new URL(path, baseUrl));
  const text = await response.text();
  assert(response.ok, `${path} expected 2xx, got ${response.status}`);
  assert(text.includes("<html"), `${path} did not return HTML`);
  checks.push({ path, status: response.status, ok: true });
}

async function checkText(path, expected) {
  const response = await fetchWithTimeout(new URL(path, baseUrl));
  const text = await response.text();
  assert(response.ok, `${path} expected 2xx, got ${response.status}`);
  assert(text.includes(expected), `${path} missing ${expected}`);
  checks.push({ path, status: response.status, ok: true });
}

async function checkJson(path, expectedKey) {
  const response = await fetchWithTimeout(new URL(path, baseUrl));
  const text = await response.text();
  const body = parseJson(text, path);
  assert(response.ok, `${path} expected 2xx, got ${response.status}`);
  assert(expectedKey in body, `${path} missing ${expectedKey}`);
  checks.push({ path, status: response.status, ok: true });
}

async function checkReportLifecycle() {
  const create = await fetchWithTimeout(new URL("/api/report", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(minimalReport)
  });
  const created = parseJson(await create.text(), "/api/report");
  assert(create.status === 201, `/api/report expected 201, got ${create.status}: ${JSON.stringify(created)}`);
  assert(created.id, "created report is missing id");
  assert(!created.report?.ip?.ip, "created report should not include raw stored IP");

  const read = await fetchWithTimeout(new URL(`/api/report/${created.id}`, baseUrl));
  const body = parseJson(await read.text(), `/api/report/${created.id}`);
  assert(read.ok, `/api/report/${created.id} expected 2xx, got ${read.status}`);
  assert(body.id === created.id, "read report id mismatch");

  const pagePath = `/reports/${created.id}`;
  const page = await fetchWithTimeout(new URL(pagePath, baseUrl));
  const pageHtml = await page.text();
  assert(page.ok, `${pagePath} expected 2xx, got ${page.status}`);
  assert(pageHtml.includes("Short-lived browser fidelity report"), `${pagePath} did not render the shared report page`);
  assert(!pageHtml.includes("Page not found"), `${pagePath} rendered the 404 page`);

  checks.push({ path: "/api/report", status: create.status, ok: true });
  checks.push({ path: `/api/report/${created.id}`, status: read.status, ok: true });
  checks.push({ path: pagePath, status: page.status, ok: true });
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(text, path) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${path} did not return valid JSON`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
