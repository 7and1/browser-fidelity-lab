import type { IpSignals } from "./types";

interface CloudflareRequestLike {
  cf?: {
    asn?: number;
    asOrganization?: string;
    city?: string;
    colo?: string;
    country?: string;
    region?: string;
    timezone?: string;
  };
  headers: Headers;
}

export function ipFromRequest(request: CloudflareRequestLike): string | undefined {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  );
}

export function cloudflareIpSignals(request: CloudflareRequestLike): IpSignals {
  const cf = request.cf;
  return {
    ip: ipFromRequest(request),
    countryCode: cf?.country,
    region: cf?.region,
    city: cf?.city,
    timezone: cf?.timezone,
    asn: cf?.asn ? `AS${cf.asn}` : undefined,
    asName: cf?.asOrganization,
    colo: cf?.colo,
    provider: "cloudflare",
    flags: {
      unavailableReason: "Proxy/VPN flags unavailable without an IP intelligence provider key."
    }
  };
}

export function mergeIpSignals(base: IpSignals, enhancement?: Partial<IpSignals>): IpSignals {
  if (!enhancement) return base;
  const provider =
    base.provider && enhancement.provider && base.provider !== enhancement.provider
      ? "combined"
      : enhancement.provider ?? base.provider;
  const flags = {
    ...base.flags,
    ...enhancement.flags
  };

  if (enhancement.flags && Object.values(enhancement.flags).some((value) => value !== undefined)) {
    delete flags.unavailableReason;
  }

  return {
    ...base,
    ...enhancement,
    provider,
    flags
  };
}

export function normalizeIpinfoResponse(body: unknown): Partial<IpSignals> | undefined {
  if (!body || typeof body !== "object") return undefined;
  const data = body as Record<string, unknown>;
  const geo = objectValue(data.geo) ?? data;
  const as = objectValue(data.as) ?? objectValue(data.asn);
  const anonymous = objectValue(data.anonymous) ?? objectValue(data.privacy);

  return {
    countryCode: stringValue(geo.country_code ?? data.country_code),
    countryName: stringValue(geo.country ?? data.country_name ?? data.country),
    region: stringValue(geo.region ?? data.region),
    city: stringValue(geo.city ?? data.city),
    timezone: stringValue(geo.timezone ?? data.timezone),
    asn: stringValue(as?.asn ?? data.asn),
    asName: stringValue(as?.name ?? as?.domain ?? data.as_name),
    asType: stringValue(as?.type ?? data.as_type),
    provider: "ipinfo",
    flags: {
      proxy: booleanValue(anonymous?.is_proxy),
      vpn: booleanValue(anonymous?.is_vpn),
      tor: booleanValue(anonymous?.is_tor),
      relay: booleanValue(anonymous?.is_relay),
      hosting: booleanValue(data.is_hosting),
      mobile: booleanValue(data.is_mobile),
      anonymous: booleanValue(data.is_anonymous)
    }
  };
}

export function normalizeProxycheckResponse(body: unknown, ip: string): Partial<IpSignals> | undefined {
  if (!body || typeof body !== "object") return undefined;
  const data = body as Record<string, unknown>;
  const result = objectValue(data[ip]);
  if (!result) return undefined;

  const network = objectValue(result.network);
  const location = objectValue(result.location);
  const detections = objectValue(result.detections) ?? result;

  return {
    countryCode: stringValue(location?.country_code),
    countryName: stringValue(location?.country_name),
    region: stringValue(location?.region_name),
    city: stringValue(location?.city_name),
    timezone: stringValue(location?.timezone),
    asn: stringValue(network?.asn),
    asName: stringValue(network?.provider),
    asType: stringValue(network?.type)?.toLowerCase(),
    provider: "proxycheck",
    flags: {
      proxy: booleanValue(detections?.proxy),
      vpn: booleanValue(detections?.vpn),
      tor: booleanValue(detections?.tor),
      hosting: booleanValue(detections?.hosting),
      anonymous: booleanValue(detections?.anonymous),
      risk: numberValue(detections?.risk),
      confidence: numberValue(detections?.confidence)
    }
  };
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1", "y"].includes(normalized)) return true;
    if (["false", "no", "0", "n"].includes(normalized)) return false;
  }
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
