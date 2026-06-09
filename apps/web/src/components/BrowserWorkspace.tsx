import { useState } from "react";
import { EnvironmentScanner } from "./EnvironmentScanner";
import { PresetGenerator } from "./PresetGenerator";
import type { WorkspaceScanResult } from "./workspace-types";

export function BrowserWorkspace() {
  const [scanResult, setScanResult] = useState<WorkspaceScanResult | undefined>();

  return (
    <section className="workspace-stack" id="workspace" aria-label="Cloak Browser workspace">
      <div id="scanner" className="anchor-target" aria-hidden="true" />
      <EnvironmentScanner onScanComplete={setScanResult} />
      <PresetGenerator scanResult={scanResult} showComparison showCiPreview />
    </section>
  );
}
