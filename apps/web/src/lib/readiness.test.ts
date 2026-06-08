import { describe, expect, it } from "vitest";
import { checkReadiness } from "./readiness";

class FakeD1Statement {
  constructor(private readonly shouldFail = false) {}

  async first<T>() {
    if (this.shouldFail) throw new Error("D1 probe failed");
    return { ok: 1 } as T;
  }

  bind() {
    return this;
  }

  async run() {
    return { success: true, meta: {} };
  }
}

class FakeD1 {
  constructor(private readonly shouldFail = false) {}

  prepare() {
    return new FakeD1Statement(this.shouldFail);
  }
}

describe("checkReadiness", () => {
  it("passes when D1 and hash secret are configured", async () => {
    const result = await checkReadiness({
      REPORTS: new FakeD1() as unknown as D1Database,
      REPORT_HASH_SECRET: "secret"
    });

    expect(result.ok).toBe(true);
    expect(result.checks.map((check) => check.name)).toContain("REPORTS_D1_QUERY");
  });

  it("fails when required bindings are missing", async () => {
    const result = await checkReadiness({});

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "REPORTS_D1_BINDING", ok: false }),
        expect.objectContaining({ name: "REPORT_HASH_SECRET", ok: false })
      ])
    );
  });

  it("fails when the D1 read probe fails", async () => {
    const result = await checkReadiness({
      REPORTS: new FakeD1(true) as unknown as D1Database,
      REPORT_HASH_SECRET: "secret"
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ name: "REPORTS_D1_QUERY", ok: false, detail: "D1 probe failed" })
    );
  });
});
