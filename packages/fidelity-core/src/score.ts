import type { BrowserSignalReport, FidelityScore, Mismatch, ScoreBreakdown } from "./types";
import { evaluateMismatches } from "./rules";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function subtract(base: number, mismatches: Mismatch[], categories: Mismatch["category"][]): number {
  const penalty = mismatches
    .filter((mismatch) => categories.includes(mismatch.category))
    .reduce((sum, mismatch) => sum + mismatch.weight, 0);
  return clampScore(base - penalty);
}

export function scoreReport(report: BrowserSignalReport): FidelityScore {
  const mismatches = evaluateMismatches(report);

  const breakdown: ScoreBreakdown = {
    device: subtract(100, mismatches, ["device", "runtime"]),
    geo: subtract(100, mismatches, ["geo", "network"]),
    leakRisk: subtract(100, mismatches, ["privacy", "network"]),
    automationReadiness: subtract(100, mismatches, ["automation", "device", "geo", "runtime"])
  };

  const overall = clampScore(
    breakdown.device * 0.3 +
      breakdown.geo * 0.25 +
      breakdown.leakRisk * 0.2 +
      breakdown.automationReadiness * 0.25
  );

  return { overall, breakdown, mismatches };
}
