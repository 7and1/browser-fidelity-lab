import type { APIRoute } from "astro";
import { errorJson, getRuntimeEnv, json, publicError } from "../../../lib/api";
import { getReport } from "../../../lib/report-store";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const id = context.params.id;
  if (!id || !/^[a-z0-9]{8,32}$/i.test(id)) {
    return errorJson("invalid_report_id", "Report id is invalid.", 400);
  }

  try {
    const report = await getReport(getRuntimeEnv(context), id);
    if (!report) {
      return errorJson("report_not_found", "Report was not found or has expired.", 404);
    }
    return json(report);
  } catch (error) {
    if (error instanceof Error && error.message.includes("D1 binding")) {
      console.error(error);
      return errorJson("report_storage_unavailable", "Shared report storage is not configured.", 503);
    }
    return publicError(error, "report_read_failed", "Unable to read report.", 500);
  }
};
