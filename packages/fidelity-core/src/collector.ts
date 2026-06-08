import type { BrowserSignalReport, ClientSignals, ConsentSignals, IpSignals, PermissionSignal } from "./types";

const unknownViewport = { width: 0, height: 0 };
const maxCandidateCount = 32;
const reportSources = ["browser", "cli", "fixture"] as const;
const deviceTypes = ["desktop", "mobile", "tablet", "unknown"] as const;
const storageStates = ["available", "blocked", "unknown"] as const;
const permissionNames = ["geolocation", "camera", "microphone", "notifications"] as const;
const permissionStates = ["granted", "denied", "prompt", "unsupported"] as const;
const ipProviders = ["cloudflare", "ipinfo", "proxycheck", "combined"] as const;

export function inferDeviceType(userAgent: string): ClientSignals["deviceType"] {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  if (userAgent.trim().length === 0) return "unknown";
  return "desktop";
}

export function inferBrowserName(userAgent: string): string | undefined {
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/OPR\//.test(userAgent)) return "Opera";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Chrome\//.test(userAgent) && /Safari\//.test(userAgent)) return "Chrome";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  return undefined;
}

export function inferOsName(userAgent: string): string | undefined {
  if (/Android/.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
  if (/Windows NT/.test(userAgent)) return "Windows";
  if (/Mac OS X|Macintosh/.test(userAgent)) return "macOS";
  if (/Linux/.test(userAgent)) return "Linux";
  return undefined;
}

export function normalizeClientSignals(input: Partial<ClientSignals>): ClientSignals {
  const userAgent = boundedString(input.userAgent, 512) ?? "";
  const viewport = normalizeViewport(input.viewport);
  const screen = normalizeScreen(input.screen, viewport);
  const languages = normalizeStringList(input.languages ?? (input.language ? [input.language] : []), 12, 48);

  return {
    userAgent,
    platform: boundedString(input.platform, 128),
    browserName: input.browserName ?? inferBrowserName(userAgent),
    browserVersion: boundedString(input.browserVersion, 64),
    osName: input.osName ?? inferOsName(userAgent),
    deviceType: enumValue(input.deviceType, deviceTypes) ?? inferDeviceType(userAgent),
    viewport,
    screen,
    devicePixelRatio: boundedNumber(input.devicePixelRatio, 0, 16, 1),
    touchPoints: boundedNumber(input.touchPoints, 0, 20, 0),
    pointer: boundedString(input.pointer, 32),
    hover: boundedString(input.hover, 32),
    language: boundedString(input.language, 48) ?? languages[0],
    languages,
    timezone: boundedString(input.timezone, 96),
    timezoneOffsetMinutes: boundedOptionalNumber(input.timezoneOffsetMinutes, -1440, 1440),
    webdriver: booleanValue(input.webdriver),
    cookiesEnabled: booleanValue(input.cookiesEnabled),
    localStorage: enumValue(input.localStorage, storageStates) ?? "unknown",
    sessionStorage: enumValue(input.sessionStorage, storageStates) ?? "unknown",
    webgl: input.webgl
      ? {
          vendor: boundedString(input.webgl.vendor, 256),
          renderer: boundedString(input.webgl.renderer, 256),
          version: boundedString(input.webgl.version, 128)
        }
      : undefined,
    canvas: input.canvas
      ? {
          supported: Boolean(input.canvas.supported),
          sampleHash: boundedString(input.canvas.sampleHash, 64)
        }
      : undefined,
    audio: input.audio
      ? {
          supported: Boolean(input.audio.supported),
          sampleRate: boundedOptionalNumber(input.audio.sampleRate, 0, 384000)
        }
      : undefined,
    permissions: normalizePermissions(input.permissions),
    webrtc: input.webrtc
      ? {
          checked: Boolean(input.webrtc.checked),
          candidates: normalizeStringList(input.webrtc.candidates, maxCandidateCount, 512),
          exposesPrivateAddress: Boolean(input.webrtc.exposesPrivateAddress),
          exposesPublicAddress: Boolean(input.webrtc.exposesPublicAddress)
        }
      : undefined
  };
}

export function normalizeIpSignals(input?: Partial<IpSignals>): IpSignals | undefined {
  if (!input) return undefined;

  return {
    ip: boundedString(input.ip, 64),
    countryCode: boundedString(input.countryCode, 8)?.toUpperCase(),
    countryName: boundedString(input.countryName, 96),
    region: boundedString(input.region, 96),
    city: boundedString(input.city, 96),
    timezone: boundedString(input.timezone, 96),
    asn: boundedString(input.asn, 32),
    asName: boundedString(input.asName, 160),
    asType: boundedString(input.asType, 64),
    colo: boundedString(input.colo, 16),
    provider: enumValue(input.provider, ipProviders),
    flags: input.flags
      ? {
          proxy: booleanValue(input.flags.proxy),
          vpn: booleanValue(input.flags.vpn),
          tor: booleanValue(input.flags.tor),
          relay: booleanValue(input.flags.relay),
          hosting: booleanValue(input.flags.hosting),
          mobile: booleanValue(input.flags.mobile),
          anonymous: booleanValue(input.flags.anonymous),
          risk: boundedOptionalNumber(input.flags.risk, 0, 100),
          confidence: boundedOptionalNumber(input.flags.confidence, 0, 100),
          unavailableReason: boundedString(input.flags.unavailableReason, 240)
        }
      : undefined
  };
}

export type BrowserSignalReportInput = Omit<Partial<BrowserSignalReport>, "client" | "ip" | "consent"> & {
  client?: Partial<ClientSignals>;
  ip?: Partial<IpSignals>;
  consent?: Partial<ConsentSignals>;
};

export function normalizeReport(input: BrowserSignalReportInput): BrowserSignalReport {
  return {
    capturedAt: boundedString(input.capturedAt, 64) ?? new Date().toISOString(),
    source: enumValue(input.source, reportSources) ?? "browser",
    client: normalizeClientSignals(input.client ?? {}),
    ip: normalizeIpSignals(input.ip),
    consent: {
      webrtc: input.consent?.webrtc ?? false,
      geolocation: input.consent?.geolocation ?? false,
      mediaDevices: input.consent?.mediaDevices ?? false
    },
    targetUrl: boundedString(input.targetUrl, 2048),
    presetId: boundedString(input.presetId, 128)
  };
}

export function redactReportForStorage(report: BrowserSignalReport): BrowserSignalReport {
  const redacted = structuredClone(report);
  if (redacted.ip) {
    delete redacted.ip.ip;
  }
  return redacted;
}

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function boundedNumber(value: unknown, min: number, max: number, fallback?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    if (fallback !== undefined) return fallback;
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function boundedOptionalNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

function normalizePermissions(input: unknown): PermissionSignal | undefined {
  if (!input || typeof input !== "object") return undefined;

  const data = input as Record<string, unknown>;
  const permissions: PermissionSignal = {};

  for (const name of permissionNames) {
    const state = enumValue(data[name], permissionStates);
    if (state) {
      permissions[name] = state;
    }
  }

  return Object.keys(permissions).length > 0 ? permissions : undefined;
}

function normalizeStringList(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => {
      const text = boundedString(item, maxLength);
      return text ? [text] : [];
    })
    .slice(0, maxItems);
}

function normalizeViewport(input?: Partial<ClientSignals["viewport"]>): ClientSignals["viewport"] {
  if (!input) return unknownViewport;
  return {
    width: boundedNumber(input.width, 0, 100000, 0),
    height: boundedNumber(input.height, 0, 100000, 0)
  };
}

function normalizeScreen(
  input: Partial<ClientSignals["screen"]> | undefined,
  fallback: ClientSignals["viewport"]
): ClientSignals["screen"] {
  if (!input) return fallback;
  return {
    width: boundedNumber(input.width, 0, 100000, fallback.width),
    height: boundedNumber(input.height, 0, 100000, fallback.height),
    availWidth: boundedOptionalNumber(input.availWidth, 0, 100000),
    availHeight: boundedOptionalNumber(input.availHeight, 0, 100000),
    colorDepth: boundedOptionalNumber(input.colorDepth, 0, 128)
  };
}
