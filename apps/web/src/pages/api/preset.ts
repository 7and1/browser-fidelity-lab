import type { APIRoute } from "astro";
import { exportPreset } from "@browser-fidelity/device-presets";
import { json, publicError, readJsonBody } from "../../lib/api";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const body = await readJsonBody(context, 1_024);
    const presetId =
      body && typeof body === "object" && "presetId" in body
        ? String((body as { presetId: unknown }).presetId)
        : "pixel-8-us";
    return json(exportPreset(presetId));
  } catch (error) {
    return publicError(error, "preset_generate_failed", "Unable to generate preset.", 400);
  }
};
