import { describe, expect, it } from "vitest";
import { normalizeReport, scoreReport } from "@browser-fidelity/fidelity-core";
import { createReport, getReport, purgeExpiredReports, reportRateLimit, reportTtlDays } from "./report-store";

class FakeD1Statement {
  constructor(
    private readonly db: FakeD1,
    private readonly query: string
  ) {}

  private values: unknown[] = [];

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async run() {
    if (this.query.startsWith("INSERT")) {
      const [id, createdAt, expiresAt, visitorHash, reportJson, scoreJson] = this.values;
      this.db.rows.set(String(id), {
        id: String(id),
        created_at: String(createdAt),
        expires_at: String(expiresAt),
        visitor_hash: String(visitorHash),
        report_json: String(reportJson),
        score_json: String(scoreJson)
      });
    }
    if (this.query.startsWith("DELETE")) {
      const [now] = this.values;
      let changes = 0;
      for (const [id, row] of this.db.rows) {
        if (row.expires_at <= String(now)) {
          this.db.rows.delete(id);
          changes += 1;
        }
      }
      return { success: true, meta: { changes } };
    }
    return { success: true, meta: {} };
  }

  async first<T>() {
    const [id] = this.values;
    if (this.query.startsWith("SELECT COUNT")) {
      const [visitorHash, since] = this.values;
      let count = 0;
      for (const row of this.db.rows.values()) {
        if (row.visitor_hash === String(visitorHash) && row.created_at >= String(since)) {
          count += 1;
        }
      }
      return { count } as T;
    }
    return (this.db.rows.get(String(id)) ?? null) as T | null;
  }
}

class FakeD1 {
  rows = new Map<string, Record<string, string>>();

  prepare(query: string) {
    return new FakeD1Statement(this, query);
  }
}

describe("report store", () => {
  it("uses a seven-day default TTL", () => {
    expect(reportTtlDays({})).toBe(7);
    expect(reportTtlDays({ REPORT_TTL_DAYS: "3" })).toBe(3);
    expect(reportTtlDays({ REPORT_TTL_DAYS: "3days" })).toBe(7);
    expect(reportRateLimit({})).toBe(30);
    expect(reportRateLimit({ REPORTS_PER_DAY: "2" })).toBe(2);
    expect(reportRateLimit({ REPORTS_PER_DAY: "2/day" })).toBe(30);
  });

  it("stores and reads redacted reports", async () => {
    const report = normalizeReport({
      client: {
        userAgent: "Mozilla/5.0",
        viewport: { width: 1000, height: 800 },
        screen: { width: 1000, height: 800 },
        devicePixelRatio: 1,
        touchPoints: 0,
        languages: ["en-US"]
      },
      ip: { ip: "203.0.113.1", countryCode: "US" }
    });
    const env = { REPORTS: new FakeD1() as unknown as D1Database, REPORT_HASH_SECRET: "test-secret" };
    const request = new Request("https://cloakbrowser.org/api/report", {
      headers: { "user-agent": "vitest", "CF-Connecting-IP": "203.0.113.1" }
    });
    const created = await createReport(env, report, scoreReport(report), request);
    const read = await getReport(env, created.id);

    expect(read?.id).toBe(created.id);
    expect(read?.report.ip?.ip).toBeUndefined();
    expect(new Date(created.expiresAt).getTime()).toBeGreaterThan(new Date(created.createdAt).getTime());
  });

  it("requires an env-backed hash secret", async () => {
    const report = normalizeReport({ client: { userAgent: "Mozilla/5.0" } });
    const env = { REPORTS: new FakeD1() as unknown as D1Database };
    const request = new Request("https://cloakbrowser.org/api/report");

    await expect(createReport(env, report, scoreReport(report), request)).rejects.toThrow("REPORT_HASH_SECRET");
  });

  it("rate limits report creation per visitor hash", async () => {
    const report = normalizeReport({ client: { userAgent: "Mozilla/5.0" } });
    const env = {
      REPORTS: new FakeD1() as unknown as D1Database,
      REPORT_HASH_SECRET: "test-secret",
      REPORTS_PER_DAY: "1"
    };
    const request = new Request("https://cloakbrowser.org/api/report", {
      headers: { "user-agent": "vitest", "CF-Connecting-IP": "203.0.113.1" }
    });

    await createReport(env, report, scoreReport(report), request);
    await expect(createReport(env, report, scoreReport(report), request)).rejects.toThrow("limit reached");
  });

  it("purges expired reports", async () => {
    const db = new FakeD1();
    db.rows.set("expired", {
      id: "expired",
      created_at: "2026-05-01T00:00:00.000Z",
      expires_at: "2026-05-02T00:00:00.000Z",
      visitor_hash: "hash",
      report_json: "{}",
      score_json: "{}"
    });
    db.rows.set("live", {
      id: "live",
      created_at: "2026-06-01T00:00:00.000Z",
      expires_at: "2026-06-10T00:00:00.000Z",
      visitor_hash: "hash",
      report_json: "{}",
      score_json: "{}"
    });

    const changes = await purgeExpiredReports({ REPORTS: db as unknown as D1Database }, new Date("2026-06-03T00:00:00.000Z"));

    expect(changes).toBe(1);
    expect(db.rows.has("expired")).toBe(false);
    expect(db.rows.has("live")).toBe(true);
  });
});
