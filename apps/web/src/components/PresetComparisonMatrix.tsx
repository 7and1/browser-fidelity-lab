import type { BrowserFidelityPreset } from "@browser-fidelity/device-presets";
import type { WorkspaceScanResult, PresetComparisonRow, PresetComparisonStatus } from "./workspace-types";

interface PresetComparisonMatrixProps {
  preset: BrowserFidelityPreset;
  scanResult?: WorkspaceScanResult;
}

export function PresetComparisonMatrix({ preset, scanResult }: PresetComparisonMatrixProps) {
  const rows = buildComparisonRows(scanResult, preset);

  return (
    <section className="panel comparison-panel" aria-label="Current browser compared with target preset">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Fingerprint comparison matrix</p>
          <h2>Current browser vs. target preset</h2>
        </div>
        <span className="status-pill neutral">{scanResult ? "Live scan linked" : "Awaiting scan"}</span>
      </div>
      <div className="panel-body">
        <p className="inline-note comparison-note">
          Compare the latest real scan with the selected preset before copying the generated Playwright configuration.
        </p>
        <div className="table-wrap">
          <table className="signal-table comparison-table">
            <caption className="visually-hidden">Preset alignment comparison</caption>
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Observed browser</th>
                <th scope="col">Target preset</th>
                <th scope="col">Alignment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.observed}</td>
                  <td>{row.target}</td>
                  <td>
                    <span className={`matrix-status ${row.status}`}>{statusLabel(row.status)}</span>
                    <span className="matrix-recommendation">{row.recommendation}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function buildComparisonRows(scanResult: WorkspaceScanResult | undefined, preset: BrowserFidelityPreset): PresetComparisonRow[] {
  if (!scanResult) {
    return [
      {
        label: "Timezone ID",
        observed: "Run a scan",
        target: preset.timezoneId,
        status: "unknown",
        recommendation: "The matrix links to browser telemetry after the scanner completes."
      },
      {
        label: "Locale setup",
        observed: "Run a scan",
        target: preset.locale,
        status: "unknown",
        recommendation: "Locale comparison needs the active browser language list."
      },
      {
        label: "Viewport / DPR",
        observed: "Run a scan",
        target: `${preset.viewport.width} x ${preset.viewport.height} / ${preset.deviceScaleFactor}x`,
        status: "unknown",
        recommendation: "Viewport and DPR are compared from the latest scan."
      },
      {
        label: "Network region",
        observed: "Run a scan",
        target: preset.region,
        status: "unknown",
        recommendation: "Network comparison uses the edge IP response when available."
      }
    ];
  }

  const { report } = scanResult;
  const primaryLocale = report.client.languages[0] ?? report.client.language ?? "unknown";
  const viewportObserved = `${report.client.viewport.width} x ${report.client.viewport.height} / ${report.client.devicePixelRatio}x`;
  const viewportTarget = `${preset.viewport.width} x ${preset.viewport.height} / ${preset.deviceScaleFactor}x`;
  const observedDeviceClass = report.client.deviceType ?? "unknown";
  const targetDeviceClass = preset.isMobile ? "mobile" : "desktop";
  const observedNetwork = report.ip?.countryCode ?? "unavailable";

  return [
    {
      label: "Timezone ID",
      observed: report.client.timezone ?? "unknown",
      target: preset.timezoneId,
      status: exactMatch(report.client.timezone, preset.timezoneId),
      recommendation:
        report.client.timezone === preset.timezoneId
          ? "Timezone is aligned."
          : "Set Playwright timezoneId or choose a preset matching the browser route."
    },
    {
      label: "Locale setup",
      observed: primaryLocale,
      target: preset.locale,
      status: localeStatus(primaryLocale, preset.locale),
      recommendation:
        localeStatus(primaryLocale, preset.locale) === "match"
          ? "Primary language matches the preset."
          : "Align locale and browser language preferences with the target preset."
    },
    {
      label: "Viewport / DPR",
      observed: viewportObserved,
      target: viewportTarget,
      status: viewportStatus(report, preset),
      recommendation:
        viewportStatus(report, preset) === "match"
          ? "Viewport and pixel ratio match."
          : "Copy the generated viewport, screen, and deviceScaleFactor values into the Playwright use block."
    },
    {
      label: "Device and touch",
      observed: `${observedDeviceClass}, ${report.client.touchPoints} touch point(s)`,
      target: `${targetDeviceClass}, ${preset.hasTouch ? "touch" : "no touch"}`,
      status: deviceStatus(report, preset),
      recommendation:
        deviceStatus(report, preset) === "match"
          ? "Device class and touch behavior align."
          : "Use the matching device preset so user agent, touch, pointer, and viewport agree."
    },
    {
      label: "Network region",
      observed: observedNetwork,
      target: preset.region,
      status: networkStatus(report.ip?.countryCode, preset.region),
      recommendation:
        networkStatus(report.ip?.countryCode, preset.region) === "match"
          ? "Edge region matches the target preset."
          : "Use a route that matches the preset region before treating this as regional QA evidence."
    }
  ];
}

function exactMatch(left: string | undefined, right: string): PresetComparisonStatus {
  if (!left) return "unknown";
  return left.toLowerCase() === right.toLowerCase() ? "match" : "mismatch";
}

function localeStatus(observed: string, target: string): PresetComparisonStatus {
  if (!observed || observed === "unknown") return "unknown";
  if (observed.toLowerCase() === target.toLowerCase()) return "match";
  return observed.split("-")[0]?.toLowerCase() === target.split("-")[0]?.toLowerCase() ? "warning" : "mismatch";
}

function viewportStatus(scanResult: WorkspaceScanResult["report"], preset: BrowserFidelityPreset): PresetComparisonStatus {
  const viewportMatches =
    scanResult.client.viewport.width === preset.viewport.width &&
    scanResult.client.viewport.height === preset.viewport.height;
  const dprMatches = Math.abs(scanResult.client.devicePixelRatio - preset.deviceScaleFactor) < 0.1;
  if (viewportMatches && dprMatches) return "match";
  if (dprMatches || viewportMatches) return "warning";
  return "mismatch";
}

function deviceStatus(scanResult: WorkspaceScanResult["report"], preset: BrowserFidelityPreset): PresetComparisonStatus {
  const observedMobile = scanResult.client.deviceType === "mobile" || scanResult.client.deviceType === "tablet";
  const touchMatches = preset.hasTouch ? scanResult.client.touchPoints > 0 : scanResult.client.touchPoints === 0;
  if (observedMobile === preset.isMobile && touchMatches) return "match";
  if (observedMobile === preset.isMobile || touchMatches) return "warning";
  return "mismatch";
}

function networkStatus(countryCode: string | undefined, region: string): PresetComparisonStatus {
  if (!countryCode) return "unknown";
  if (countryCode.toUpperCase() === region.toUpperCase()) return "match";
  return "warning";
}

function statusLabel(status: PresetComparisonStatus): string {
  if (status === "match") return "Matched";
  if (status === "warning") return "Review";
  if (status === "mismatch") return "Mismatch";
  return "Pending";
}
