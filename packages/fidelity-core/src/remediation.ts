import type { Mismatch, Severity, SignalCategory } from "./types";

export type RemediationEffort = "low" | "medium" | "high";

export interface RemediationRecommendation {
  mismatchId: string;
  title: string;
  detail: string;
  category: SignalCategory;
  severity: Severity;
  weight: number;
  effort: RemediationEffort;
  action: string;
  priority: number;
}

const categoryActions: Record<SignalCategory, string> = {
  device: "Align the claimed device with viewport, screen, DPR, touch, pointer, and hover settings before trusting this fixture.",
  geo: "Align the network route, browser timezone, locale, and optional geolocation before using this as regional QA evidence.",
  network: "Review the egress network and provider-backed flags before treating this browser profile as production-like.",
  runtime: "Align the browser engine, user agent, and renderer/runtime hints before using this profile for device-specific QA.",
  privacy: "Review WebRTC policy and launch options before using this profile for network-sensitive testing.",
  automation: "Review test runner launch options and automation exposure before treating the profile as production-like."
};

const mismatchActions: Record<string, { effort: RemediationEffort; action: string }> = {
  "android-without-touch": {
    effort: "low",
    action: "Set Playwright `hasTouch: true` and use a mobile device preset when the user agent claims Android."
  },
  "mobile-ua-desktop-viewport": {
    effort: "low",
    action: "Replace the desktop viewport with a mobile viewport and matching `screen` dimensions for the selected device."
  },
  "mobile-pointer-without-touch": {
    effort: "low",
    action: "Use a mobile preset with touch enabled so pointer behavior and max touch points match the user agent."
  },
  "viewport-larger-than-screen": {
    effort: "low",
    action: "Make `viewport` no larger than `screen` in the Playwright `use` block or browser profile."
  },
  "mobile-low-dpr": {
    effort: "low",
    action: "Raise `deviceScaleFactor` to match the selected mobile device instead of using a desktop DPR."
  },
  "iphone-chromium-user-agent": {
    effort: "medium",
    action: "Use Playwright WebKit and an iPhone Safari user agent together; do not pair iPhone Safari identity with Chromium."
  },
  "iphone-desktop-webgl": {
    effort: "medium",
    action: "Run the iPhone profile through WebKit and review renderer overrides or launch flags that expose desktop GPU hints."
  },
  "ip-country-timezone-mismatch": {
    effort: "medium",
    action: "Fix the egress route or `timezoneId` first, then align locale and geolocation to the same target country."
  },
  "ip-timezone-browser-timezone-mismatch": {
    effort: "medium",
    action: "Set Playwright `timezoneId` to match the intended egress region before treating the scan as regional evidence."
  },
  "accept-language-country-mismatch": {
    effort: "low",
    action: "Set Playwright `locale` and browser language preferences to the same region as the intended network exit."
  },
  "webrtc-public-address-exposed": {
    effort: "medium",
    action: "Review WebRTC policy, browser launch options, and route handling before using this profile for network-sensitive QA."
  },
  "webrtc-private-address-exposed": {
    effort: "medium",
    action: "Disable or constrain WebRTC candidates in the test browser when local network exposure would invalidate QA evidence."
  },
  "webdriver-true": {
    effort: "high",
    action: "Treat this as automation-visible. Review the test runner launch mode before comparing against production-like browser behavior."
  },
  "mobile-profile-hosting-ip": {
    effort: "medium",
    action: "Use a network route that matches the claimed mobile profile before treating mobile regional checks as reliable."
  },
  "desktop-profile-mobile-ip": {
    effort: "medium",
    action: "Choose a desktop egress route or switch the browser profile to a mobile fixture so device class and network type agree."
  },
  "anonymous-network-flag": {
    effort: "medium",
    action: "Review the egress provider and decide whether an anonymity flag is expected for this authorized QA scenario."
  },
  "ip-intelligence-unavailable": {
    effort: "low",
    action: "Configure optional IP intelligence provider secrets only if proxy, VPN, Tor, hosting, or mobile-network confidence matters for this QA run."
  }
};

const severityRank: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2
};

const effortRank: Record<RemediationEffort, number> = {
  low: 0,
  medium: 1,
  high: 2
};

export function rankRemediations(mismatches: Mismatch[]): RemediationRecommendation[] {
  return [...mismatches]
    .sort((left, right) => {
      const severityDelta = severityRank[left.severity] - severityRank[right.severity];
      if (severityDelta !== 0) return severityDelta;

      const weightDelta = right.weight - left.weight;
      if (weightDelta !== 0) return weightDelta;

      const leftEffort = actionFor(left).effort;
      const rightEffort = actionFor(right).effort;
      const effortDelta = effortRank[leftEffort] - effortRank[rightEffort];
      if (effortDelta !== 0) return effortDelta;

      return left.id.localeCompare(right.id);
    })
    .map((mismatch, index) => {
      const remediation = actionFor(mismatch);
      return {
        mismatchId: mismatch.id,
        title: mismatch.title,
        detail: mismatch.detail,
        category: mismatch.category,
        severity: mismatch.severity,
        weight: mismatch.weight,
        effort: remediation.effort,
        action: remediation.action,
        priority: index + 1
      };
    });
}

function actionFor(mismatch: Mismatch): { effort: RemediationEffort; action: string } {
  return (
    mismatchActions[mismatch.id] ?? {
      effort: "medium",
      action: categoryActions[mismatch.category]
    }
  );
}
