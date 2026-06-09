import { chromium, devices } from "playwright";

const baseUrl =
  process.env.OPENCLAW_QA_BASE_URL ??
  process.env.CLOAKBROWSER_BASE_URL ??
  process.env.OPENCLAW_PREVIEW_URL ??
  "http://127.0.0.1:3290";
const requireShare = process.env.CLOAKBROWSER_QA_REQUIRE_SHARE === "1";
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const checks = [];

const browser = await chromium.launch(chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {});

try {
  await checkViewport("desktop", {});
  await checkViewport(
    "mobile",
    devices["iPhone 14"] ??
      devices["iPhone 13"] ?? {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      }
  );
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
} finally {
  await browser.close();
}

async function checkViewport(name, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  await page.goto(new URL("/", baseUrl).href, { waitUntil: "networkidle" });
  await expectVisible(page, "text=Cloak Browser");
  await expectVisible(page, "text=Start scan");
  await assertNoHorizontalOverflow(page, `${name}: home`);

  await page.getByRole("button", { name: /start scan/i }).click();
  await expectVisible(page, "text=Suggested Playwright use config");
  await assertNoHorizontalOverflow(page, `${name}: scan result`);

  const suggestedConfig = await page.getByLabel("Suggested Playwright use config").textContent();
  assert(suggestedConfig?.includes("userAgent"), `${name}: suggested config missing userAgent`);

  await page.goto(new URL("/tools", baseUrl).href, { waitUntil: "networkidle" });
  await expectVisible(page, "text=Focused checks for browser consistency failures");
  await assertNoHorizontalOverflow(page, `${name}: tools`);

  await page.goto(new URL("/tools/playwright-device-preset-generator", baseUrl).href, { waitUntil: "networkidle" });
  await expectVisible(page, "text=Playwright device preset generator");
  await assertNoHorizontalOverflow(page, `${name}: preset generator`);

  if (requireShare) {
    await page.goto(new URL("/scan", baseUrl).href, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /start scan/i }).click();
    await expectVisible(page, "text=Suggested Playwright use config");
    await page.getByRole("button", { name: /^share$/i }).click();
    await expectVisible(page, "text=Share URL:");
  }

  checks.push({ viewport: name, ok: true });
  await context.close();
}

async function expectVisible(page, selector) {
  await page.locator(selector).first().waitFor({ state: "visible", timeout: 15_000 });
}

async function assertNoHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  assert(
    result.scrollWidth <= result.viewportWidth + 2,
    `${label}: horizontal overflow ${result.scrollWidth}px > ${result.viewportWidth}px`
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
