import type { BrowserSignalReport, ClientSignals, ConsentSignals, IpSignals } from "../types";
import { normalizeReport } from "../collector";

const androidUa =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const iphoneUa =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const desktopUa =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const base = normalizeReport({
  source: "fixture",
  client: {
    userAgent: desktopUa,
    viewport: { width: 1440, height: 900 },
    screen: { width: 1440, height: 900 },
    devicePixelRatio: 2,
    touchPoints: 0,
    pointer: "fine",
    language: "en-US",
    languages: ["en-US", "en"],
    timezone: "America/New_York",
    webdriver: false,
    webgl: { vendor: "Apple", renderer: "Apple M2" }
  },
  ip: {
    countryCode: "US",
    timezone: "America/New_York",
    asn: "AS7018",
    asName: "AT&T Services",
    provider: "cloudflare"
  },
  consent: { webrtc: false, geolocation: false, mediaDevices: false }
});

type FixtureInput = Omit<Partial<BrowserSignalReport>, "client" | "ip" | "consent"> & {
  client?: Partial<ClientSignals>;
  ip?: Partial<IpSignals>;
  consent?: Partial<ConsentSignals>;
};

function fixture(id: string, report: FixtureInput, expectedMismatch: string) {
  const client: Partial<ClientSignals> = { ...base.client, ...(report.client ?? {}) };
  if (report.client?.userAgent && report.client.userAgent !== base.client.userAgent) {
    delete client.browserName;
    delete client.osName;
    delete client.deviceType;
  }

  return {
    id,
    expectedMismatch,
    report: normalizeReport({
      ...base,
      ...report,
      client,
      ip: { ...(base.ip ?? {}), ...(report.ip ?? {}) },
      consent: { ...base.consent, ...(report.consent ?? {}) }
    })
  };
}

export const mismatchFixtures = [
  fixture(
    "android-no-touch",
    {
      client: {
        userAgent: androidUa,
        viewport: { width: 412, height: 915 },
        screen: { width: 412, height: 915 },
        devicePixelRatio: 2.6,
        touchPoints: 0,
        pointer: "coarse"
      }
    },
    "android-without-touch"
  ),
  fixture(
    "mobile-desktop-viewport",
    {
      client: {
        userAgent: androidUa,
        viewport: { width: 1280, height: 800 },
        screen: { width: 1280, height: 800 },
        touchPoints: 5
      }
    },
    "mobile-ua-desktop-viewport"
  ),
  fixture(
    "mobile-fine-pointer",
    {
      client: {
        userAgent: androidUa,
        viewport: { width: 390, height: 844 },
        screen: { width: 390, height: 844 },
        touchPoints: 0,
        pointer: "fine"
      }
    },
    "mobile-pointer-without-touch"
  ),
  fixture(
    "viewport-larger-than-screen-width",
    {
      client: {
        viewport: { width: 1600, height: 900 },
        screen: { width: 1440, height: 900 }
      }
    },
    "viewport-larger-than-screen"
  ),
  fixture(
    "viewport-larger-than-screen-height",
    {
      client: {
        viewport: { width: 390, height: 1200 },
        screen: { width: 390, height: 844 }
      }
    },
    "viewport-larger-than-screen"
  ),
  fixture(
    "mobile-low-dpr-android",
    {
      client: {
        userAgent: androidUa,
        viewport: { width: 390, height: 844 },
        screen: { width: 390, height: 844 },
        devicePixelRatio: 1,
        touchPoints: 5
      }
    },
    "mobile-low-dpr"
  ),
  fixture(
    "iphone-chrome-token",
    {
      client: {
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        touchPoints: 5
      }
    },
    "iphone-chromium-user-agent"
  ),
  fixture(
    "iphone-desktop-webgl",
    {
      client: {
        userAgent: iphoneUa,
        touchPoints: 5,
        webgl: { vendor: "Google Inc.", renderer: "ANGLE (NVIDIA RTX 4090)" }
      }
    },
    "iphone-desktop-webgl"
  ),
  fixture(
    "ip-country-timezone-cn-us",
    {
      client: { timezone: "Asia/Shanghai" },
      ip: { countryCode: "US", timezone: "America/New_York" }
    },
    "ip-country-timezone-mismatch"
  ),
  fixture(
    "ip-timezone-browser-timezone",
    {
      client: { timezone: "Asia/Tokyo" },
      ip: { countryCode: "JP", timezone: "America/New_York" }
    },
    "ip-timezone-browser-timezone-mismatch"
  ),
  fixture(
    "language-country-mismatch-fr-us",
    {
      client: { language: "fr-FR", languages: ["fr-FR", "fr"] },
      ip: { countryCode: "US" }
    },
    "accept-language-country-mismatch"
  ),
  fixture(
    "language-country-mismatch-en-gb-us",
    {
      client: { language: "en-GB", languages: ["en-GB", "en"] },
      ip: { countryCode: "US" }
    },
    "accept-language-country-mismatch"
  ),
  fixture(
    "webrtc-public",
    {
      client: {
        webrtc: {
          checked: true,
          candidates: ["203.0.113.4"],
          exposesPrivateAddress: false,
          exposesPublicAddress: true
        }
      },
      consent: { webrtc: true, geolocation: false, mediaDevices: false }
    },
    "webrtc-public-address-exposed"
  ),
  fixture(
    "webrtc-private",
    {
      client: {
        webrtc: {
          checked: true,
          candidates: ["192.168.1.12"],
          exposesPrivateAddress: true,
          exposesPublicAddress: false
        }
      },
      consent: { webrtc: true, geolocation: false, mediaDevices: false }
    },
    "webrtc-private-address-exposed"
  ),
  fixture(
    "webdriver-true",
    {
      client: { webdriver: true }
    },
    "webdriver-true"
  ),
  fixture(
    "mobile-hosting-ip",
    {
      client: {
        userAgent: androidUa,
        viewport: { width: 412, height: 915 },
        screen: { width: 412, height: 915 },
        touchPoints: 5,
        devicePixelRatio: 2.6
      },
      ip: { flags: { hosting: true } }
    },
    "mobile-profile-hosting-ip"
  ),
  fixture(
    "desktop-mobile-ip",
    {
      client: { userAgent: desktopUa },
      ip: { flags: { mobile: true } }
    },
    "desktop-profile-mobile-ip"
  ),
  fixture(
    "vpn-flag",
    {
      ip: { flags: { vpn: true } }
    },
    "anonymous-network-flag"
  ),
  fixture(
    "tor-flag",
    {
      ip: { flags: { tor: true } }
    },
    "anonymous-network-flag"
  ),
  fixture(
    "provider-unavailable",
    {
      ip: {
        flags: {
          unavailableReason: "Proxy/VPN flags unavailable without an IP intelligence provider key."
        }
      }
    },
    "ip-intelligence-unavailable"
  )
] as const;

export const cleanFixture = base;
