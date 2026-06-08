import { describe, expect, it } from "vitest";
import type { APIContext } from "astro";
import { readJsonBody } from "./api";

function contextFor(request: Request): APIContext {
  return { request } as APIContext;
}

describe("api helpers", () => {
  it("requires application/json bodies", async () => {
    const request = new Request("https://cloakbrowser.org/api/report", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}"
    });

    await expect(readJsonBody(contextFor(request))).rejects.toMatchObject({
      code: "unsupported_media_type",
      status: 415
    });
  });

  it("rejects oversized JSON bodies", async () => {
    const request = new Request("https://cloakbrowser.org/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(20) })
    });

    await expect(readJsonBody(contextFor(request), 10)).rejects.toMatchObject({
      code: "payload_too_large",
      status: 413
    });
  });

  it("parses valid JSON", async () => {
    const request = new Request("https://cloakbrowser.org/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    });

    await expect(readJsonBody(contextFor(request))).resolves.toEqual({ ok: true });
  });
});
