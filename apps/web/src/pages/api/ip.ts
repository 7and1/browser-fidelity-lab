import type { APIRoute } from "astro";
import {
  cloudflareIpSignals,
  mergeIpSignals,
  normalizeIpinfoResponse,
  normalizeProxycheckResponse
} from "@browser-fidelity/fidelity-core";
import { getRuntimeEnv, json } from "../../lib/api";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const env = getRuntimeEnv(context);
  const base = cloudflareIpSignals(context.request);
  let enhanced = base;

  if (base.ip && env.IPINFO_TOKEN) {
    const body = await fetchJsonWithTimeout(
      `https://api.ipinfo.io/core/${encodeURIComponent(base.ip)}?token=${encodeURIComponent(env.IPINFO_TOKEN)}`
    );
    if (body) {
      enhanced = mergeIpSignals(enhanced, normalizeIpinfoResponse(body));
    }
  }

  if (base.ip && env.PROXYCHECK_TOKEN) {
    const body = await fetchJsonWithTimeout(
      `https://proxycheck.io/v3/${encodeURIComponent(base.ip)}?key=${encodeURIComponent(env.PROXYCHECK_TOKEN)}&p=0&ver=11-February-2026`
    );
    if (body) {
      enhanced = mergeIpSignals(enhanced, normalizeProxycheckResponse(body, base.ip));
    }
  }

  return json({ ip: enhanced });
};

async function fetchJsonWithTimeout(url: string, timeoutMs = 2_500): Promise<unknown | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "BrowserFidelityLab/0.1 (+https://cloakbrowser.org)"
      },
      signal: controller.signal
    });
    if (!response.ok) return undefined;
    return await response.json();
  } catch (error) {
    console.warn("[ip-provider] request failed", error instanceof Error ? error.message : String(error));
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}
