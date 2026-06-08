export interface SitePage {
  path: string;
  title: string;
  description: string;
  group: "core" | "tool" | "doc" | "policy";
  changefreq: "weekly" | "monthly";
  priority: string;
}

export const sitePages: SitePage[] = [
  {
    path: "/",
    title: "Browser Fidelity Lab",
    description: "Independent QA tools for checking browser, IP, locale, timezone, WebRTC, and Playwright consistency.",
    group: "core",
    changefreq: "weekly",
    priority: "1.0"
  },
  {
    path: "/scan",
    title: "Browser Environment Scanner",
    description: "Run a local browser-visible scan, score consistency, and create a short-lived redacted report for QA review.",
    group: "core",
    changefreq: "weekly",
    priority: "0.9"
  },
  {
    path: "/tools",
    title: "Browser Fidelity Tools",
    description: "Choose focused browser consistency tools for mobile fingerprint checks, timezone/IP mismatches, WebRTC candidates, and Playwright presets.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.9"
  },
  {
    path: "/tools/mobile-browser-fingerprint-test",
    title: "Mobile Browser Fingerprint Test",
    description: "Check whether a mobile user agent, viewport, screen, DPR, touch, pointer, WebGL, language, and timezone describe one plausible mobile browser.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.8"
  },
  {
    path: "/tools/playwright-device-preset-generator",
    title: "Playwright Device Preset Generator",
    description: "Export deterministic Playwright device, locale, timezone, viewport, DPR, permission, and CI preset snippets.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.8"
  },
  {
    path: "/tools/proxy-geo-consistency-checker",
    title: "Proxy Geo Consistency Checker",
    description: "Compare edge country, ASN, timezone, locale, and optional proxy or VPN intelligence against browser-visible settings.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.8"
  },
  {
    path: "/tools/timezone-ip-mismatch-checker",
    title: "Timezone IP Mismatch Checker",
    description: "Detect mismatches between browser timezone, primary language region, and edge IP country for QA presets.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.8"
  },
  {
    path: "/tools/user-agent-parser",
    title: "User Agent Parser",
    description: "Parse browser, operating system, and device class from a user agent string using Browser Fidelity Lab heuristics.",
    group: "tool",
    changefreq: "monthly",
    priority: "0.7"
  },
  {
    path: "/tools/webrtc-leak-test",
    title: "WebRTC Candidate Check",
    description: "Run an explicit-consent WebRTC candidate check and review whether private or public network candidates appear.",
    group: "tool",
    changefreq: "weekly",
    priority: "0.8"
  },
  {
    path: "/docs/browser-fingerprint-consistency",
    title: "Browser Fingerprint Consistency Guide",
    description: "Learn which browser, network, device, runtime, and privacy signals Browser Fidelity Lab checks and how scoring works.",
    group: "doc",
    changefreq: "monthly",
    priority: "0.7"
  },
  {
    path: "/docs/playwright-mobile-emulation",
    title: "Playwright Mobile Emulation Checklist",
    description: "Align Playwright user agent, viewport, DPR, touch, locale, timezone, geolocation, and network settings for repeatable QA.",
    group: "doc",
    changefreq: "monthly",
    priority: "0.7"
  },
  {
    path: "/docs/ci-browser-fidelity-checks",
    title: "CI Browser Fidelity Checks",
    description: "Run Browser Fidelity Lab presets and reports in CI so Playwright environment drift is caught before release.",
    group: "doc",
    changefreq: "monthly",
    priority: "0.7"
  },
  {
    path: "/privacy-and-abuse-policy",
    title: "Privacy and Abuse Policy",
    description: "Review Browser Fidelity Lab data handling, short-lived report storage, raw-IP redaction, and authorized-use boundaries.",
    group: "policy",
    changefreq: "monthly",
    priority: "0.5"
  }
];

export function siteUrl(path: string, origin = "https://cloakbrowser.org"): string {
  return new URL(path, origin).href;
}
