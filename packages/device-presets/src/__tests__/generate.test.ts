import { describe, expect, it } from "vitest";
import { exportPreset, getPreset, presets } from "../index";

describe("device presets", () => {
  it("ships expected starter presets", () => {
    expect(presets.map((preset) => preset.id)).toContain("pixel-8-us");
    expect(presets.map((preset) => preset.id)).toContain("desktop-chrome-us");
    expect(presets.map((preset) => preset.id)).toContain("desktop-webkit-us");
    expect(presets.map((preset) => preset.id)).toContain("iphone-15-gb");
    expect(presets.map((preset) => preset.id)).toContain("desktop-chrome-de");
  });

  it("ships region and filter tags for every preset", () => {
    for (const preset of presets) {
      expect(preset.region).toMatch(/^[A-Z]{2}$/);
      expect(preset.tags.length).toBeGreaterThan(0);
    }
  });

  it("exports Playwright, snippets, JSON, CI matrix, and CI recipe", () => {
    const exported = exportPreset("pixel-8-us");

    expect(exported.playwrightConfig).toContain("defineConfig");
    expect(exported.playwrightConfig).toContain("timezoneId");
    expect(exported.nodeSnippet).toContain("chromium.launch");
    expect(exported.pythonSnippet).toContain("sync_playwright");
    expect(exported.jsonPreset).toContain("\"pixel-8-us\"");
    expect(exported.ciMatrix).toContain("browser_fidelity_preset");
    expect(exported.ciRecipe).toContain("--fail-under 90");
    expect(exported.ciRecipe).toContain("browser-fidelity audit");
  });

  it("returns undefined for unknown presets", () => {
    expect(getPreset("missing")).toBeUndefined();
  });
});
