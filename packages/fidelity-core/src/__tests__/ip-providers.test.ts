import { describe, expect, it } from "vitest";
import {
  extractIpv4Addresses,
  isPrivateIpv4Address,
  isPublicIpv4Address,
  mergeIpSignals,
  normalizeIpinfoResponse,
  normalizeProxycheckResponse
} from "../index";

describe("IP provider normalization", () => {
  it("normalizes string booleans and numeric strings from IPInfo-like responses", () => {
    const signals = normalizeIpinfoResponse({
      geo: {
        country_code: "us",
        country: "United States",
        region: "New York",
        city: "New York",
        timezone: "America/New_York"
      },
      as: {
        asn: 13335,
        name: "Cloudflare",
        type: "hosting"
      },
      anonymous: {
        is_proxy: "no",
        is_vpn: "yes",
        is_tor: "false",
        is_relay: "0"
      },
      is_hosting: "true",
      is_mobile: "false"
    });

    expect(signals?.countryCode).toBe("us");
    expect(signals?.asn).toBe("13335");
    expect(signals?.flags?.proxy).toBe(false);
    expect(signals?.flags?.vpn).toBe(true);
    expect(signals?.flags?.tor).toBe(false);
    expect(signals?.flags?.relay).toBe(false);
    expect(signals?.flags?.hosting).toBe(true);
    expect(signals?.flags?.mobile).toBe(false);
  });

  it("normalizes Proxycheck-like flat string detections", () => {
    const signals = normalizeProxycheckResponse(
      {
        "203.0.113.10": {
          location: { country_code: "GB", timezone: "Europe/London" },
          network: { asn: "AS64500", provider: "Example Network" },
          detections: {
            proxy: "yes",
            vpn: "no",
            risk: "42",
            confidence: "87"
          }
        }
      },
      "203.0.113.10"
    );

    expect(signals?.countryCode).toBe("GB");
    expect(signals?.asn).toBe("AS64500");
    expect(signals?.flags?.proxy).toBe(true);
    expect(signals?.flags?.vpn).toBe(false);
    expect(signals?.flags?.risk).toBe(42);
    expect(signals?.flags?.confidence).toBe(87);
  });

  it("marks merged provider-backed signals as combined and clears unavailable detail", () => {
    const merged = mergeIpSignals(
      {
        ip: "203.0.113.10",
        countryCode: "US",
        provider: "cloudflare",
        flags: { unavailableReason: "provider missing" }
      },
      {
        provider: "proxycheck",
        flags: { vpn: false, proxy: true }
      }
    );

    expect(merged.provider).toBe("combined");
    expect(merged.flags?.unavailableReason).toBeUndefined();
    expect(merged.flags?.proxy).toBe(true);
  });
});

describe("IPv4 address classification", () => {
  it("extracts valid IPv4 addresses without accepting invalid octets", () => {
    expect(extractIpv4Addresses("a=10.0.0.5 b=999.1.1.1 c=110.20.30.40")).toEqual([
      "10.0.0.5",
      "110.20.30.40"
    ]);
  });

  it("does not misclassify public 110.x addresses as private 10.x addresses", () => {
    expect(isPrivateIpv4Address("10.1.2.3")).toBe(true);
    expect(isPrivateIpv4Address("110.1.2.3")).toBe(false);
    expect(isPublicIpv4Address("110.1.2.3")).toBe(true);
  });

  it("keeps documentation and reserved ranges out of public classification", () => {
    expect(isPublicIpv4Address("203.0.113.10")).toBe(false);
    expect(isPublicIpv4Address("198.18.6.152")).toBe(false);
    expect(isPublicIpv4Address("8.8.8.8")).toBe(true);
  });
});
