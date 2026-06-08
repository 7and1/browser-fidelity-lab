#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { exportPreset } from "@browser-fidelity/device-presets";
import {
  normalizeReport,
  scoreReport,
  type BrowserSignalReport,
  type ClientSignals,
  type FidelityScore
} from "@browser-fidelity/fidelity-core";
import { renderMarkdownReport } from "@browser-fidelity/report-renderer";

export interface CliOptions {
  command: "audit" | "preset" | "help";
  url?: string;
  presetId: string;
  json: boolean;
  markdown: boolean;
  failUnder?: number;
}

export interface CiThresholdResult {
  score: number;
  failUnder: number;
  passed: boolean;
}

async function main(argv: string[]): Promise<void> {
  const options = parseArgs(argv);

  if (options.command === "help") {
    printHelp();
    return;
  }

  if (options.command === "preset") {
    const exported = exportPreset(options.presetId);
    process.stdout.write(options.json ? `${exported.jsonPreset}\n` : exported.playwrightConfig);
    return;
  }

  if (!options.url) {
    throw new Error("audit requires a URL");
  }

  const report = await runAudit(options.url, options.presetId);
  const score = scoreReport(report);
  const ci = evaluateCiThreshold(score.overall, options.failUnder);
  const envelope = {
    id: "local",
    report,
    score,
    createdAt: report.capturedAt,
    expiresAt: "not stored"
  };

  if (options.markdown) {
    process.stdout.write(renderMarkdownReport(envelope));
    if (ci && !ci.passed) process.exitCode = 1;
    return;
  }

  process.stdout.write(formatAuditOutput(options, envelope, ci));
  if (ci && !ci.passed) process.exitCode = 1;
}

export function parseArgs(argv: string[]): CliOptions {
  const [command = "help", maybeUrl, ...rest] = argv;
  const options: CliOptions = {
    command: command === "audit" || command === "preset" ? command : "help",
    url: command === "audit" ? maybeUrl : undefined,
    presetId: "pixel-8-us",
    json: false,
    markdown: false,
    failUnder: undefined
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--preset") {
      options.presetId = rest[index + 1] ?? options.presetId;
      index += 1;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--markdown") {
      options.markdown = true;
    } else if (arg === "--fail-under") {
      options.failUnder = parseFailUnder(rest[index + 1]);
      index += 1;
    }
  }

  if (command === "preset") {
    options.presetId = maybeUrl ?? options.presetId;
  }

  return options;
}

export function evaluateCiThreshold(
  score: number,
  failUnder: number | undefined
): CiThresholdResult | undefined {
  if (failUnder === undefined) return undefined;
  return {
    score,
    failUnder,
    passed: score >= failUnder
  };
}

export function formatAuditOutput(
  options: Pick<CliOptions, "json">,
  envelope: {
    report: BrowserSignalReport;
    score: FidelityScore;
    id: string;
    createdAt: string;
    expiresAt: string;
  },
  ci: CiThresholdResult | undefined
): string {
  const payload = options.json
    ? { ...envelope, ...(ci ? { ci } : {}) }
    : { score: envelope.score, report: envelope.report, ...(ci ? { ci } : {}) };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function parseFailUnder(value: string | undefined): number {
  if (!value) {
    throw new Error("--fail-under requires a score from 0 to 100");
  }
  const threshold = Number(value);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
    throw new Error("--fail-under requires a score from 0 to 100");
  }
  return threshold;
}

async function runAudit(url: string, presetId: string): Promise<BrowserSignalReport> {
  const exported = exportPreset(presetId);
  const playwright = await importPlaywright();
  const browserType = playwright[exported.preset.browserName];
  if (!browserType) {
    throw new Error(`Playwright browser type is unavailable: ${exported.preset.browserName}`);
  }
  const browser = await browserType.launch();

  try {
    const context = await browser.newContext({
      userAgent: exported.preset.userAgent,
      viewport: exported.preset.viewport,
      screen: exported.preset.screen,
      deviceScaleFactor: exported.preset.deviceScaleFactor,
      isMobile: exported.preset.isMobile,
      hasTouch: exported.preset.hasTouch,
      locale: exported.preset.locale,
      timezoneId: exported.preset.timezoneId,
      geolocation: exported.preset.geolocation,
      permissions: exported.preset.permissions,
      colorScheme: exported.preset.colorScheme
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const client = (await page.evaluate(() => {
      const storage = (name: "localStorage" | "sessionStorage") => {
        try {
          window[name].setItem("__bfl_probe", "1");
          window[name].removeItem("__bfl_probe");
          return "available" as const;
        } catch {
          return "blocked" as const;
        }
      };

      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        screen: {
          width: window.screen.width,
          height: window.screen.height,
          availWidth: window.screen.availWidth,
          availHeight: window.screen.availHeight,
          colorDepth: window.screen.colorDepth
        },
        devicePixelRatio: window.devicePixelRatio,
        touchPoints: navigator.maxTouchPoints,
        pointer: window.matchMedia("(pointer: coarse)").matches ? "coarse" : "fine",
        hover: window.matchMedia("(hover: hover)").matches ? "hover" : "none",
        language: navigator.language,
        languages: [...navigator.languages],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        webdriver: navigator.webdriver,
        cookiesEnabled: navigator.cookieEnabled,
        localStorage: storage("localStorage"),
        sessionStorage: storage("sessionStorage")
      };
    })) as ClientSignals;

    return normalizeReport({
      source: "cli",
      targetUrl: url,
      presetId,
      client,
      consent: { webrtc: false, geolocation: false, mediaDevices: false }
    });
  } finally {
    await browser.close();
  }
}

type PlaywrightModule = Record<string, { launch(): Promise<BrowserLike> }>;

interface BrowserLike {
  newContext(options: Record<string, unknown>): Promise<BrowserContextLike>;
  close(): Promise<void>;
}

interface BrowserContextLike {
  newPage(): Promise<PageLike>;
}

interface PageLike {
  goto(url: string, options: Record<string, unknown>): Promise<unknown>;
  evaluate<T>(fn: () => T): Promise<T>;
}

async function importPlaywright(): Promise<PlaywrightModule> {
  try {
    return (await import("playwright")) as unknown as PlaywrightModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Playwright is required for audit. Install it in your project first. ${message}`);
  }
}

function printHelp(): void {
  process.stdout.write(`browser-fidelity

Commands:
  browser-fidelity audit <url> --preset pixel-8-us --json
  browser-fidelity audit <url> --preset pixel-8-us --markdown
  browser-fidelity audit <url> --preset pixel-8-us --fail-under 90 --json
  browser-fidelity preset pixel-8-us
`);
}

if (isDirectCli(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

function isDirectCli(metaUrl: string): boolean {
  return process.argv[1] ? pathToFileURL(process.argv[1]).href === metaUrl : false;
}
