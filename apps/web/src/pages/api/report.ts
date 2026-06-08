import type { APIRoute } from "astro";
import { normalizeReport, scoreReport, type BrowserSignalReportInput } from "@browser-fidelity/fidelity-core";
import { createReport } from "../../lib/report-store";
import { errorJson, getRuntimeEnv, json, publicError, readJsonBody } from "../../lib/api";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const env = getRuntimeEnv(context);

  try {
    const body = await readJsonBody(context, 32_768);
    const report = normalizeReport((body && typeof body === "object" ? body : {}) as BrowserSignalReportInput);
    const score = scoreReport(report);
    const envelope = await createReport(env, report, score, context.request);
    return json(envelope, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("limit reached")) {
      return errorJson("report_rate_limited", "Report creation limit reached. Try again later.", 429);
    }
    if (
      error instanceof Error &&
      (error.message.includes("D1 binding") || error.message.includes("REPORT_HASH_SECRET"))
    ) {
      console.error(error);
      return errorJson("report_storage_unavailable", "Shared report storage is not configured.", 503);
    }
    return publicError(error, "report_create_failed", "Unable to create report.", 400);
  }
};
