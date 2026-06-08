import { describe, expect, it } from "vitest";
import { normalizeReport, rankRemediations, redactReportForStorage, scoreReport } from "../index";
import { cleanFixture, mismatchFixtures } from "../fixtures/mismatch-fixtures";

describe("scoreReport", () => {
  it("keeps a coherent fixture near perfect", () => {
    const score = scoreReport(cleanFixture);
    expect(score.overall).toBe(100);
    expect(score.mismatches).toHaveLength(0);
  });

  it("detects all required mismatch fixtures", () => {
    expect(mismatchFixtures).toHaveLength(20);

    for (const { id, report, expectedMismatch } of mismatchFixtures) {
      const score = scoreReport(report);
      const ids = score.mismatches.map((mismatch) => mismatch.id);
      expect(ids, id).toContain(expectedMismatch);
      expect(score.overall, id).toBeLessThanOrEqual(100);
    }
  });

  it("normalizes partial reports with conservative defaults", () => {
    const report = normalizeReport({ client: { userAgent: "Mozilla/5.0" } });
    expect(report.client.viewport).toEqual({ width: 0, height: 0 });
    expect(report.client.devicePixelRatio).toBe(1);
    expect(report.consent.webrtc).toBe(false);
  });

  it("caps untrusted report fields before scoring or storage", () => {
    const report = normalizeReport({
      client: {
        userAgent: "x".repeat(800),
        languages: Array.from({ length: 40 }, (_, index) => `en-US-${index}`),
        viewport: { width: 1_000_000, height: -1 },
        screen: { width: 1_000_000, height: 1_000_000 },
        devicePixelRatio: 99,
        touchPoints: 99,
        webrtc: {
          checked: true,
          candidates: Array.from({ length: 80 }, (_, index) => `candidate-${index}-${"x".repeat(700)}`),
          exposesPrivateAddress: false,
          exposesPublicAddress: false
        }
      },
      ip: {
        ip: "1".repeat(200),
        flags: { unavailableReason: "x".repeat(500), risk: 999 }
      }
    });

    expect(report.client.userAgent).toHaveLength(512);
    expect(report.client.languages).toHaveLength(12);
    expect(report.client.viewport).toEqual({ width: 100000, height: 0 });
    expect(report.client.devicePixelRatio).toBe(16);
    expect(report.client.touchPoints).toBe(20);
    expect(report.client.webrtc?.candidates).toHaveLength(32);
    expect(report.client.webrtc?.candidates[0]).toHaveLength(512);
    expect(report.ip?.ip).toHaveLength(64);
    expect(report.ip?.flags?.unavailableReason).toHaveLength(240);
    expect(report.ip?.flags?.risk).toBe(100);
  });

  it("drops invalid enum and boolean-like fields from untrusted report input", () => {
    const report = normalizeReport({
      source: "external" as never,
      client: {
        userAgent: "Mozilla/5.0",
        deviceType: "phone" as never,
        webdriver: "false" as never,
        cookiesEnabled: "true" as never,
        localStorage: "enabled" as never,
        permissions: { geolocation: "maybe" } as never
      },
      ip: {
        provider: "unknown-provider" as never,
        flags: {
          proxy: "yes" as never,
          vpn: true
        }
      }
    });

    expect(report.source).toBe("browser");
    expect(report.client.deviceType).toBe("desktop");
    expect(report.client.webdriver).toBeUndefined();
    expect(report.client.cookiesEnabled).toBeUndefined();
    expect(report.client.localStorage).toBe("unknown");
    expect(report.client.permissions).toBeUndefined();
    expect(report.ip?.provider).toBeUndefined();
    expect(report.ip?.flags?.proxy).toBeUndefined();
    expect(report.ip?.flags?.vpn).toBe(true);
  });

  it("redacts raw IP before storage", () => {
    const report = normalizeReport({
      client: cleanFixture.client,
      ip: { ip: "203.0.113.10", countryCode: "US" }
    });

    const redacted = redactReportForStorage(report);
    expect(redacted.ip?.ip).toBeUndefined();
    expect(redacted.ip?.countryCode).toBe("US");
  });

  it("ranks remediation by severity, score impact, and repair effort", () => {
    const score = scoreReport(
      normalizeReport({
        client: {
          userAgent:
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
          viewport: { width: 1280, height: 800 },
          screen: { width: 1280, height: 800 },
          devicePixelRatio: 1,
          touchPoints: 0,
          pointer: "fine",
          language: "en-US",
          languages: ["en-US"],
          timezone: "Asia/Tokyo"
        },
        ip: { countryCode: "US", timezone: "America/New_York" }
      })
    );

    const ranked = rankRemediations(score.mismatches);

    expect(ranked[0]?.mismatchId).toBe("android-without-touch");
    expect(ranked[0]?.action).toContain("hasTouch");
    expect(ranked.map((item) => item.priority)).toEqual(ranked.map((_, index) => index + 1));
    expect(ranked.find((item) => item.mismatchId === "ip-country-timezone-mismatch")?.action).toContain("egress route");
  });
});
