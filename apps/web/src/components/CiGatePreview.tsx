import type { BrowserFidelityPreset } from "@browser-fidelity/device-presets";
import type { WorkspaceScanResult } from "./workspace-types";

interface CiGatePreviewProps {
  preset: BrowserFidelityPreset;
  scanResult?: WorkspaceScanResult;
  threshold?: number;
}

export function CiGatePreview({ preset, scanResult, threshold = 90 }: CiGatePreviewProps) {
  const score = scanResult?.score.overall;
  const hasPassed = typeof score === "number" && score >= threshold;
  const status = typeof score === "number" ? (hasPassed ? "pass" : "review") : "pending";
  const command = `pnpm exec browser-fidelity audit "$BROWSER_FIDELITY_TARGET_URL" --preset ${preset.id} --fail-under ${threshold} --json`;

  return (
    <section className="panel ci-preview" aria-label="CI browser consistency preview">
      <div className="panel-header">
        <div>
          <p className="eyebrow">CI gate preview</p>
          <h2>Deterministic threshold check</h2>
        </div>
        <span className={`status-pill ${status}`}>{statusText(status)}</span>
      </div>
      <div className="panel-body ci-grid">
        <div className="ci-meter">
          <strong>{typeof score === "number" ? score : "--"}</strong>
          <span>fail-under {threshold}</span>
        </div>
        <div className="terminal-log" aria-label="CI command preview">
          <p>$ {command}</p>
          <p>
            {typeof score === "number"
              ? hasPassed
                ? "Result preview: current scan would satisfy the configured threshold."
                : "Result preview: current scan needs remediation before this gate should pass."
              : "Run a browser scan to preview the threshold outcome for the selected preset."}
          </p>
          <p>Preset: {preset.label}</p>
        </div>
      </div>
    </section>
  );
}

function statusText(status: "pass" | "review" | "pending"): string {
  if (status === "pass") return "Would pass";
  if (status === "review") return "Needs review";
  return "Awaiting scan";
}
