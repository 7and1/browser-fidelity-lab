import type { APIRoute } from "astro";
import { getRuntimeEnv, json } from "../../lib/api";
import { checkReadiness } from "../../lib/readiness";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const result = await checkReadiness(getRuntimeEnv(context));
  return json(result, { status: result.ok ? 200 : 503 });
};
