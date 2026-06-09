import type { BrowserFidelityPreset } from "@browser-fidelity/device-presets";
import type { BrowserSignalReport, FidelityScore } from "@browser-fidelity/fidelity-core";

export interface WorkspaceScanResult {
  report: BrowserSignalReport;
  score: FidelityScore;
}

export interface PresetOverrideState {
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
  locale: string;
  timezone: string;
}

export type PresetComparisonStatus = "match" | "warning" | "mismatch" | "unknown";

export interface PresetComparisonRow {
  label: string;
  observed: string;
  target: string;
  status: PresetComparisonStatus;
  recommendation: string;
}

export interface ActivePresetState {
  presetId: string;
  preset: BrowserFidelityPreset;
  overrides: PresetOverrideState;
}
