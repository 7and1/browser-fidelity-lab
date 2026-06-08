import { rankRemediations, type BrowserSignalReport, type FidelityScore, type ReportEnvelope } from "@browser-fidelity/fidelity-core";

export interface ReportSummary {
  title: string;
  capturedAt: string;
  overall: number;
  primaryFinding: string;
  deviceLine: string;
  geoLine: string;
  leakLine: string;
}

export function summarizeReport(report: BrowserSignalReport, score: FidelityScore): ReportSummary {
  const critical = score.mismatches.find((mismatch) => mismatch.severity === "critical");
  const warning = score.mismatches.find((mismatch) => mismatch.severity === "warning");
  const primary = critical ?? warning;

  return {
    title: report.targetUrl ? `Audit for ${report.targetUrl}` : "Browser environment audit",
    capturedAt: report.capturedAt,
    overall: score.overall,
    primaryFinding: primary?.title ?? "No high-impact mismatches detected",
    deviceLine: `${report.client.deviceType ?? "unknown"} / ${report.client.browserName ?? "unknown browser"} / DPR ${report.client.devicePixelRatio}`,
    geoLine: `${report.ip?.countryCode ?? "unknown country"} / ${report.client.timezone ?? "unknown timezone"}`,
    leakLine: report.client.webrtc?.checked
      ? "WebRTC optional check completed"
      : "WebRTC optional check not run"
  };
}

export function renderMarkdownReport(envelope: ReportEnvelope): string {
  const summary = summarizeReport(envelope.report, envelope.score);
  const mismatchLines = envelope.score.mismatches.length
    ? envelope.score.mismatches
        .map((mismatch) => `- [${mismatch.severity}] ${mismatch.title}: ${mismatch.detail}`)
        .join("\n")
    : "- No mismatches detected.";
  const remediationLines = rankRemediations(envelope.score.mismatches)
    .slice(0, 3)
    .map((item) => `- ${item.priority}. ${item.title}: ${item.action}`)
    .join("\n") || "- No prioritized fixes.";

  return `# ${summary.title}

Captured: ${summary.capturedAt}
Expires: ${envelope.expiresAt}
Overall score: ${summary.overall}

## Summary

- ${summary.deviceLine}
- ${summary.geoLine}
- ${summary.leakLine}
- ${summary.primaryFinding}

## Fix This First

${remediationLines}

## Mismatches

${mismatchLines}
`;
}
