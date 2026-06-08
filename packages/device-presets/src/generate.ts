import type { BrowserFidelityPreset, PresetExport } from "./types";
import { getPreset } from "./presets";

export function exportPreset(id: string): PresetExport {
  const preset = getPreset(id);
  if (!preset) {
    throw new Error(`Unknown preset: ${id}`);
  }

  return {
    preset,
    playwrightConfig: generatePlaywrightConfig(preset),
    nodeSnippet: generateNodeSnippet(preset),
    pythonSnippet: generatePythonSnippet(preset),
    jsonPreset: JSON.stringify(preset, null, 2),
    ciMatrix: generateCiMatrix(preset),
    ciRecipe: generateCiRecipe(preset)
  };
}

export function generatePlaywrightUse(preset: BrowserFidelityPreset): string {
  const geolocation = preset.geolocation
    ? `,\n        geolocation: ${JSON.stringify(preset.geolocation)}`
    : "";

  return `{
        userAgent: ${JSON.stringify(preset.userAgent)},
        viewport: ${JSON.stringify(preset.viewport)},
        screen: ${JSON.stringify(preset.screen)},
        deviceScaleFactor: ${preset.deviceScaleFactor},
        isMobile: ${preset.isMobile},
        hasTouch: ${preset.hasTouch},
        locale: ${JSON.stringify(preset.locale)},
        timezoneId: ${JSON.stringify(preset.timezoneId)},
        permissions: ${JSON.stringify(preset.permissions)},
        colorScheme: ${JSON.stringify(preset.colorScheme)}${geolocation}
      }`;
}

export function generatePlaywrightConfig(preset: BrowserFidelityPreset): string {
  return `import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: ${JSON.stringify(preset.id)},
      use: ${generatePlaywrightUse(preset)}
    }
  ]
});
`;
}

export function generateNodeSnippet(preset: BrowserFidelityPreset): string {
  const browserType = preset.browserName;
  return `import { ${browserType} } from 'playwright';

const browser = await ${browserType}.launch();
const context = await browser.newContext(${generatePlaywrightUse(preset).replace(/\n {6}/g, "\n  ")});
const page = await context.newPage();
await page.goto('https://example.com');
await browser.close();
`;
}

export function generatePythonSnippet(preset: BrowserFidelityPreset): string {
  const geo = preset.geolocation ? `,\n        geolocation=${JSON.stringify(preset.geolocation)}` : "";

  return `from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.${preset.browserName}.launch()
    context = browser.new_context(
        user_agent=${JSON.stringify(preset.userAgent)},
        viewport=${JSON.stringify(preset.viewport)},
        screen=${JSON.stringify(preset.screen)},
        device_scale_factor=${preset.deviceScaleFactor},
        is_mobile=${preset.isMobile ? "True" : "False"},
        has_touch=${preset.hasTouch ? "True" : "False"},
        locale=${JSON.stringify(preset.locale)},
        timezone_id=${JSON.stringify(preset.timezoneId)},
        permissions=${JSON.stringify(preset.permissions)}${geo}
    )
    page = context.new_page()
    page.goto("https://example.com")
    browser.close()
`;
}

export function generateCiMatrix(preset: BrowserFidelityPreset): string {
  return `strategy:
  matrix:
    browser_fidelity_preset:
      - ${preset.id}
`;
}

export function generateCiRecipe(preset: BrowserFidelityPreset): string {
  return `name: browser-fidelity

on:
  pull_request:
  push:
    branches: [main]

jobs:
  browser-fidelity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps ${preset.browserName}
      - run: pnpm exec browser-fidelity audit "$BROWSER_FIDELITY_TARGET_URL" --preset ${preset.id} --fail-under 90 --json
        env:
          BROWSER_FIDELITY_TARGET_URL: https://example.com
`;
}
