import type { BrowserSignalReport, Mismatch, Severity } from "./types";

interface RuleContext {
  report: BrowserSignalReport;
  ua: string;
  isMobileUa: boolean;
  isAndroidUa: boolean;
  isIphoneUa: boolean;
  isSafariUa: boolean;
  isChromiumUa: boolean;
}

type Rule = (ctx: RuleContext) => Mismatch | undefined;

function mismatch(
  id: string,
  title: string,
  detail: string,
  category: Mismatch["category"],
  severity: Severity,
  weight: number
): Mismatch {
  return { id, title, detail, category, severity, weight };
}

function sameCountryFromLanguage(language: string | undefined, countryCode: string | undefined): boolean {
  if (!language || !countryCode) return true;
  const parts = language.split("-");
  const languageCountry = parts[1]?.toUpperCase();
  if (!languageCountry) return true;
  return languageCountry === countryCode.toUpperCase();
}

function timezoneCountryHint(timezone: string | undefined): string | undefined {
  if (!timezone) return undefined;
  if (timezone.startsWith("America/")) return "US";
  if (timezone.startsWith("Europe/London")) return "GB";
  if (timezone.startsWith("Europe/")) return "EU";
  if (timezone.startsWith("Asia/Shanghai")) return "CN";
  if (timezone.startsWith("Asia/Tokyo")) return "JP";
  if (timezone.startsWith("Australia/")) return "AU";
  return undefined;
}

const rules: Rule[] = [
  ({ report, isAndroidUa }) => {
    if (isAndroidUa && report.client.touchPoints < 1) {
      return mismatch(
        "android-without-touch",
        "Android user agent has no touch support",
        "Android browser profiles should expose at least one touch point.",
        "device",
        "critical",
        22
      );
    }
    return undefined;
  },
  ({ report, isMobileUa }) => {
    if (isMobileUa && report.client.viewport.width >= 900) {
      return mismatch(
        "mobile-ua-desktop-viewport",
        "Mobile user agent uses a desktop-sized viewport",
        "The viewport is wider than expected for a handheld browser profile.",
        "device",
        "critical",
        20
      );
    }
    return undefined;
  },
  ({ report, isMobileUa }) => {
    if (isMobileUa && report.client.pointer === "fine" && report.client.touchPoints < 1) {
      return mismatch(
        "mobile-pointer-without-touch",
        "Mobile profile exposes desktop pointer behavior",
        "Mobile profiles normally use coarse pointer behavior and touch support.",
        "device",
        "warning",
        14
      );
    }
    return undefined;
  },
  ({ report }) => {
    const screen = report.client.screen;
    const viewport = report.client.viewport;
    if (viewport.width > screen.width || viewport.height > screen.height) {
      return mismatch(
        "viewport-larger-than-screen",
        "Viewport exceeds reported screen size",
        "The visible viewport should not be larger than the reported screen.",
        "device",
        "critical",
        20
      );
    }
    return undefined;
  },
  ({ report, isMobileUa }) => {
    if (isMobileUa && report.client.devicePixelRatio < 1.5) {
      return mismatch(
        "mobile-low-dpr",
        "Mobile profile has unusually low DPR",
        "Most modern mobile devices report a DPR of at least 2.",
        "device",
        "warning",
        10
      );
    }
    return undefined;
  },
  ({ report, isIphoneUa, isChromiumUa }) => {
    if (isIphoneUa && isChromiumUa) {
      return mismatch(
        "iphone-chromium-user-agent",
        "iPhone profile exposes Chromium user agent tokens",
        "iPhone Safari profiles should not expose desktop Chromium user agent markers.",
        "runtime",
        "critical",
        18
      );
    }
    return undefined;
  },
  ({ report, isIphoneUa }) => {
    const renderer = report.client.webgl?.renderer?.toLowerCase() ?? "";
    if (isIphoneUa && /(swiftshader|angle|nvidia|intel|amd)/.test(renderer)) {
      return mismatch(
        "iphone-desktop-webgl",
        "iPhone profile exposes desktop WebGL renderer",
        "The WebGL renderer does not match a plausible mobile Safari environment.",
        "runtime",
        "warning",
        14
      );
    }
    return undefined;
  },
  ({ report }) => {
    const ipCountry = report.ip?.countryCode;
    const browserTz = timezoneCountryHint(report.client.timezone);
    const ipTz = timezoneCountryHint(report.ip?.timezone);
    if (ipCountry && browserTz && browserTz !== "EU" && browserTz !== ipCountry) {
      return mismatch(
        "ip-country-timezone-mismatch",
        "IP country does not match browser timezone",
        "The browser timezone points to a different country than the edge IP geography.",
        "geo",
        "critical",
        18
      );
    }
    if (ipCountry && ipTz && browserTz && ipTz !== browserTz && ipTz !== "EU" && browserTz !== "EU") {
      return mismatch(
        "ip-timezone-browser-timezone-mismatch",
        "IP timezone differs from browser timezone",
        "The IP timezone and browser timezone are not aligned.",
        "geo",
        "warning",
        12
      );
    }
    return undefined;
  },
  ({ report }) => {
    const primary = report.client.languages[0] ?? report.client.language;
    if (!sameCountryFromLanguage(primary, report.ip?.countryCode)) {
      return mismatch(
        "accept-language-country-mismatch",
        "Accept-Language country differs from IP country",
        "The primary language region does not match the detected IP country.",
        "geo",
        "warning",
        12
      );
    }
    return undefined;
  },
  ({ report }) => {
    if (report.client.webrtc?.exposesPublicAddress) {
      return mismatch(
        "webrtc-public-address-exposed",
        "WebRTC exposes a public network candidate",
        "The optional WebRTC check found a public candidate that may reveal routing state.",
        "privacy",
        "critical",
        18
      );
    }
    return undefined;
  },
  ({ report }) => {
    if (report.client.webrtc?.exposesPrivateAddress) {
      return mismatch(
        "webrtc-private-address-exposed",
        "WebRTC exposes private network candidates",
        "The optional WebRTC check found private network candidates.",
        "privacy",
        "warning",
        10
      );
    }
    return undefined;
  },
  ({ report }) => {
    if (report.client.webdriver === true) {
      return mismatch(
        "webdriver-true",
        "Browser reports webdriver=true",
        "The runtime exposes automation state through navigator.webdriver.",
        "automation",
        "critical",
        20
      );
    }
    return undefined;
  },
  ({ report }) => {
    if (report.ip?.flags?.hosting && report.client.deviceType === "mobile") {
      return mismatch(
        "mobile-profile-hosting-ip",
        "Mobile profile is using a hosting IP",
        "A mobile browser profile paired with a hosting network is often inconsistent for QA presets.",
        "network",
        "warning",
        12
      );
    }
    return undefined;
  },
  ({ report }) => {
    if (report.ip?.flags?.mobile && report.client.deviceType === "desktop") {
      return mismatch(
        "desktop-profile-mobile-ip",
        "Desktop profile is using a mobile carrier IP",
        "The network type and browser device class do not align.",
        "network",
        "warning",
        10
      );
    }
    return undefined;
  },
  ({ report }) => {
    const flags = report.ip?.flags;
    if (flags?.proxy || flags?.vpn || flags?.tor || flags?.relay) {
      return mismatch(
        "anonymous-network-flag",
        "IP intelligence reports an anonymity flag",
        "The optional IP intelligence provider flagged the network as proxy, VPN, Tor, or relay.",
        "network",
        "warning",
        10
      );
    }
    return undefined;
  },
  ({ report }) => {
    if (report.ip?.flags?.unavailableReason) {
      return mismatch(
        "ip-intelligence-unavailable",
        "Proxy and VPN flags unavailable",
        report.ip.flags.unavailableReason,
        "network",
        "info",
        0
      );
    }
    return undefined;
  }
];

export function evaluateMismatches(report: BrowserSignalReport): Mismatch[] {
  const ua = report.client.userAgent;
  const ctx: RuleContext = {
    report,
    ua,
    isMobileUa: /Mobile|Android|iPhone|iPad/i.test(ua),
    isAndroidUa: /Android/i.test(ua),
    isIphoneUa: /iPhone/i.test(ua),
    isSafariUa: /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua),
    isChromiumUa: /Chrome|Chromium|CriOS|Edg|OPR/i.test(ua)
  };

  return rules.flatMap((rule) => {
    const result = rule(ctx);
    return result ? [result] : [];
  });
}
