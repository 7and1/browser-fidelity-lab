import { describe, expect, it } from "vitest";
import { evaluateCiThreshold, formatAuditOutput, parseArgs } from "./index";

describe("browser-fidelity CLI options", () => {
  it("parses fail-under thresholds for audits", () => {
    const options = parseArgs([
      "audit",
      "https://example.com",
      "--preset",
      "desktop-chrome-us",
      "--fail-under",
      "92",
      "--json"
    ]);

    expect(options.command).toBe("audit");
    expect(options.url).toBe("https://example.com");
    expect(options.presetId).toBe("desktop-chrome-us");
    expect(options.failUnder).toBe(92);
    expect(options.json).toBe(true);
  });

  it("rejects invalid fail-under thresholds", () => {
    expect(() => parseArgs(["audit", "https://example.com", "--fail-under", "101"])).toThrow(
      "score from 0 to 100"
    );
  });

  it("evaluates CI threshold pass and fail states", () => {
    expect(evaluateCiThreshold(91, 90)).toEqual({ score: 91, failUnder: 90, passed: true });
    expect(evaluateCiThreshold(89, 90)).toEqual({ score: 89, failUnder: 90, passed: false });
    expect(evaluateCiThreshold(89, undefined)).toBeUndefined();
  });

  it("adds CI result while keeping score and report in JSON output", () => {
    const output = formatAuditOutput(
      { json: true },
      {
        id: "local",
        createdAt: "2026-06-06T00:00:00.000Z",
        expiresAt: "not stored",
        score: { overall: 89, breakdown: { device: 100, geo: 80, leakRisk: 100, automationReadiness: 90 }, mismatches: [] },
        report: {
          capturedAt: "2026-06-06T00:00:00.000Z",
          source: "cli",
          client: {
            userAgent: "Mozilla/5.0",
            viewport: { width: 0, height: 0 },
            screen: { width: 0, height: 0 },
            devicePixelRatio: 1,
            touchPoints: 0,
            languages: []
          },
          consent: { webrtc: false, geolocation: false, mediaDevices: false }
        }
      },
      { score: 89, failUnder: 90, passed: false }
    );

    const parsed = JSON.parse(output);
    expect(parsed.score.overall).toBe(89);
    expect(parsed.report.source).toBe("cli");
    expect(parsed.ci).toEqual({ score: 89, failUnder: 90, passed: false });
  });
});
