export interface SitePage {
  path: string;
  title: string;
  description: string;
  group: "core" | "tool" | "doc" | "policy";
  changefreq: "weekly" | "monthly";
  priority: string;
  lastmod: string;
  intent?: string;
  tags?: string[];
  nextStep?: string;
}

export const sitePages: SitePage[] = [
  {
    path: "/",
    title: "Cloak Browser",
    description: "Browser consistency tools for checking browser, IP, locale, timezone, WebRTC, and Playwright profiles.",
    group: "core",
    changefreq: "weekly",
    priority: "1.0",
    lastmod: "2026-06-09",
    intent: "Start a complete browser consistency workflow",
    tags: ["scanner", "qa", "playwright"]
  },
  {
    path: "/scan",
    title: "Browser Environment Scanner",
    description: "Run a local browser-visible scan, score consistency, and create a short-lived redacted report for QA review.",
    group: "core",
    changefreq: "weekly",
    priority: "0.9",
    lastmod: "2026-06-09",
    intent: "Generate a whole-environment QA report",
    tags: ["scan", "report", "fix-first"],
    nextStep: "Run the full scan, then copy the highest-ranked fix into your Playwright or CI setup."
  },
  {
    path: "/tools",
    title: "Cloak Browser Tools",
    description: "Choose focused browser consistency tools for mobile fingerprint checks, timezone/IP mismatches, WebRTC candidates, and Playwright presets.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.9",
    lastmod: "2026-06-09",
    intent: "Choose the right focused diagnostic",
    tags: ["tools", "diagnostics", "presets"]
  },
  {
    path: "/tools/mobile-browser-fingerprint-test",
    title: "Mobile Browser Fingerprint Test",
    description: "Check whether a mobile user agent, viewport, screen, DPR, touch, pointer, WebGL, language, and timezone describe one plausible mobile browser.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.8",
    lastmod: "2026-06-09",
    intent: "Validate mobile emulation coherence",
    tags: ["mobile", "touch", "dpr"],
    nextStep: "After the mobile scan is coherent, export a matching Playwright preset for CI."
  },
  {
    path: "/tools/playwright-device-preset-generator",
    title: "Playwright Device Preset Generator",
    description: "Export deterministic Playwright device, locale, timezone, viewport, DPR, permission, and CI preset snippets.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.8",
    lastmod: "2026-06-09",
    intent: "Export repeatable Playwright settings",
    tags: ["playwright", "ci", "preset"],
    nextStep: "Commit the generated preset or CI recipe so browser drift is reviewed like code."
  },
  {
    path: "/tools/proxy-geo-consistency-checker",
    title: "Proxy Geo Consistency Checker",
    description: "Compare edge country, ASN, timezone, locale, and optional proxy or VPN intelligence against browser-visible settings.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.8",
    lastmod: "2026-06-09",
    intent: "Check route, ASN, and region consistency",
    tags: ["proxy", "geo", "asn"],
    nextStep: "Align egress route, timezone, locale, and geolocation before using regional QA evidence."
  },
  {
    path: "/tools/timezone-ip-mismatch-checker",
    title: "Timezone IP Mismatch Checker",
    description: "Detect mismatches between browser timezone, primary language region, and edge IP country for QA presets.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.8",
    lastmod: "2026-06-09",
    intent: "Find timezone and edge-country drift",
    tags: ["timezone", "ip", "locale"],
    nextStep: "Fix route and timezone first, then align locale and optional geolocation."
  },
  {
    path: "/tools/user-agent-parser",
    title: "User Agent Parser",
    description: "Parse browser, operating system, and device class from a user agent string using Cloak Browser heuristics.",
    group: "tool",
    changefreq: "monthly",
    priority: "0.7",
    lastmod: "2026-06-09",
    intent: "Classify claimed browser and device identity",
    tags: ["user-agent", "device", "parser"],
    nextStep: "Run the full scan to verify viewport, DPR, touch, timezone, and network signals match the claim."
  },
  {
    path: "/tools/webrtc-leak-test",
    title: "WebRTC Candidate Check",
    description: "Run an explicit-consent WebRTC candidate check and review whether private or public network candidates appear.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.8",
    lastmod: "2026-06-09",
    intent: "Review explicit-consent WebRTC candidates",
    tags: ["webrtc", "leak-risk", "network"],
    nextStep: "Review browser WebRTC policy and launch options before network-sensitive QA."
  },
  {
    path: "/docs/browser-fingerprint-consistency",
    title: "Browser Fingerprint Consistency Guide",
    description: "Learn which browser, network, device, runtime, and privacy signals Cloak Browser checks and how scoring works.",
    group: "doc",
    changefreq: "monthly",
    priority: "0.7",
    lastmod: "2026-06-09",
    intent: "Understand scoring and mismatch categories",
    tags: ["guide", "scoring", "mismatches"]
  },
  {
    path: "/docs/cloakbrowser-runtime-compatibility",
    title: "CloakBrowser Runtime Compatibility",
    description: "Validate a third-party CloakHQ/CloakBrowser runtime with Cloak Browser without bundling or operating its browser binary.",
    group: "doc",
    changefreq: "monthly",
    priority: "0.7",
    lastmod: "2026-06-09",
    intent: "Validate authorized third-party runtime compatibility",
    tags: ["compatibility", "runtime", "authorized-qa"]
  },
  {
    path: "/docs/playwright-mobile-emulation",
    title: "Playwright Mobile Emulation Checklist",
    description: "Align Playwright user agent, viewport, DPR, touch, locale, timezone, geolocation, and network settings for repeatable QA.",
    group: "doc",
    changefreq: "monthly",
    priority: "0.7",
    lastmod: "2026-06-09",
    intent: "Configure mobile browser emulation correctly",
    tags: ["playwright", "mobile", "checklist"]
  },
  {
    path: "/docs/ci-browser-fidelity-checks",
    title: "CI Browser Consistency Checks",
    description: "Run Cloak Browser presets and reports in CI so Playwright environment drift is caught before release.",
    group: "doc",
    changefreq: "monthly",
    priority: "0.7",
    lastmod: "2026-06-09",
    intent: "Catch browser environment drift in CI",
    tags: ["ci", "threshold", "automation"]
  },
  {
    path: "/privacy-and-abuse-policy",
    title: "Privacy and Abuse Policy",
    description: "Review Cloak Browser data handling, short-lived report storage, raw-IP redaction, and authorized-use boundaries.",
    group: "policy",
    changefreq: "monthly",
    priority: "0.5",
    lastmod: "2026-06-09",
    intent: "Review data handling and authorized-use boundaries",
    tags: ["privacy", "abuse", "policy"]
  }
];

export function siteUrl(path: string, origin = "https://cloakbrowser.org"): string {
  return new URL(path, origin).href;
}
