import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Globe2,
  Loader2,
  Monitor,
  Play,
  Radar,
  Share2,
  ShieldCheck,
  Wifi
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  extractIpv4Addresses,
  isPrivateIpv4Address,
  isPublicIpv4Address,
  normalizeReport,
  rankRemediations,
  scoreReport,
  type BrowserSignalReport,
  type ClientSignals,
  type FidelityScore,
  type IpSignals,
  type RemediationRecommendation,
  type ReportEnvelope,
  type SignalCategory,
  type WebrtcSignal
} from "@browser-fidelity/fidelity-core";
import type { WorkspaceScanResult } from "./workspace-types";

type ScanState = "idle" | "running" | "complete" | "error";
type ScoreFilter = "all" | "device" | "geo" | "leakRisk" | "automation";
type MetricStatus = "waiting" | "ok" | "warning" | "critical";

interface ApiIpResponse {
  ip: IpSignals;
}

interface EnvironmentScannerProps {
  onScanComplete?: (result: WorkspaceScanResult) => void;
}

export function EnvironmentScanner({ onScanComplete }: EnvironmentScannerProps) {
  const [state, setState] = useState<ScanState>("idle");
  const [includeWebrtc, setIncludeWebrtc] = useState(false);
  const [report, setReport] = useState<BrowserSignalReport | undefined>();
  const [score, setScore] = useState<FidelityScore | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [share, setShare] = useState<ReportEnvelope | undefined>();
  const [sharePending, setSharePending] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [suggestedCopyStatus, setSuggestedCopyStatus] = useState("Copy suggested Playwright use config");
  const statusMessage =
    state === "running"
      ? "Scan is running."
      : state === "complete"
        ? "Scan complete."
        : state === "error"
          ? "Scan failed."
          : "Scanner is ready.";

  const signalRows = useMemo(() => {
    if (!report) return [];
    return [
      ["User agent", report.client.userAgent],
      ["Browser", report.client.browserName ?? "unknown"],
      ["Device", report.client.deviceType ?? "unknown"],
      ["Viewport", `${report.client.viewport.width} x ${report.client.viewport.height}`],
      ["Screen", `${report.client.screen.width} x ${report.client.screen.height}`],
      ["DPR", String(report.client.devicePixelRatio)],
      ["Touch points", String(report.client.touchPoints)],
      ["Pointer", report.client.pointer ?? "unknown"],
      ["Locale", report.client.languages.join(", ") || "unknown"],
      ["Timezone", report.client.timezone ?? "unknown"],
      ["Network", `${report.ip?.countryCode ?? "unknown"} / ${report.ip?.asn ?? "unknown ASN"}`],
      [
        "Proxy/VPN flags",
        (report.ip?.flags?.unavailableReason ??
          [
            report.ip?.flags?.proxy ? "proxy" : undefined,
            report.ip?.flags?.vpn ? "vpn" : undefined,
            report.ip?.flags?.tor ? "tor" : undefined,
            report.ip?.flags?.hosting ? "hosting" : undefined
          ]
            .filter(Boolean)
            .join(", ")) ||
          "none reported"
      ],
      [
        "WebRTC",
        report.client.webrtc?.checked
          ? `${report.client.webrtc.candidates.length} candidate(s)`
          : "not checked"
      ]
    ];
  }, [report]);

  const allRemediations = useMemo(() => {
    if (!score) return [];
    return rankRemediations(score.mismatches);
  }, [score]);

  const rankedRemediations = useMemo(() => {
    return allRemediations.filter((item) => matchesScoreFilter(item.category, scoreFilter));
  }, [allRemediations, scoreFilter]);

  async function runScan() {
    setState("running");
    setError(undefined);
    setShare(undefined);

    try {
      const [client, ip] = await Promise.all([collectClientSignals(includeWebrtc), fetchIpSignals()]);
      const nextReport = normalizeReport({
        source: "browser",
        client,
        ip,
        consent: { webrtc: includeWebrtc, geolocation: false, mediaDevices: false }
      });
      const nextScore = scoreReport(nextReport);
      setReport(nextReport);
      setScore(nextScore);
      setState("complete");
      onScanComplete?.({ report: nextReport, score: nextScore });
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : String(scanError));
      setState("error");
    }
  }

  async function shareReport() {
    if (!report) return;
    setSharePending(true);
    setError(undefined);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report)
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Unable to create share report.");
      }
      setShare(body as ReportEnvelope);
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : String(shareError));
    } finally {
      setSharePending(false);
    }
  }

  function downloadJson() {
    if (!report || !score) return;
    const blob = new Blob([JSON.stringify({ report, score }, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "browser-fidelity-report.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copySuggestedConfig() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(suggestedPlaywrightUse(report));
      setSuggestedCopyStatus("Suggested Playwright config copied.");
    } catch {
      setSuggestedCopyStatus("Clipboard copy failed. Select and copy the config manually.");
    }
  }

  const scoreTone = score ? scoreToneFor(score.overall) : "idle";
  const circumference = 314.15;
  const scoreOffset = score ? circumference - (score.overall / 100) * circumference : circumference;

  return (
    <section className="workspace-grid scanner-workbench" aria-label="Browser environment scanner">
      <div className="panel scan-panel" aria-busy={state === "running" || sharePending}>
        <div className="panel-header">
          <div>
            <p className="eyebrow">Interactive diagnostic dashboard</p>
            <h2>Advanced browser signal auditor</h2>
          </div>
          <div className="button-row">
            <button
              className="button primary"
              type="button"
              onClick={runScan}
              disabled={state === "running"}
              aria-describedby="scanner-data-note"
            >
              {state === "running" ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              {state === "running" ? "Scanning" : "Run audit scan"}
            </button>
            <button className="button secondary" type="button" onClick={downloadJson} disabled={!report}>
              <Download size={16} aria-hidden="true" />
              Export JSON
            </button>
            <button className="button secondary" type="button" onClick={shareReport} disabled={!report || sharePending}>
              <Share2 size={16} aria-hidden="true" />
              {sharePending ? "Sharing" : "Share audit"}
            </button>
          </div>
        </div>

        <div className="sandbox-strip">
          <div>
            <p className="eyebrow">QA scenario controls</p>
            <p>Optional checks run only after consent and use the current browser session.</p>
          </div>
          <label className="sensitive-toggle compact-toggle">
            <input
              type="checkbox"
              checked={includeWebrtc}
              onChange={(event) => setIncludeWebrtc(event.currentTarget.checked)}
            />
            <span>Run WebRTC candidate check</span>
          </label>
        </div>

        <div className="panel-body">
          <p className="visually-hidden" role="status" aria-live="polite">
            {statusMessage}
          </p>
          <div className="data-note" id="scanner-data-note">
            <strong>Data use:</strong> the scan reads browser-visible signals in this tab and calls the edge IP endpoint. JSON download
            is local. Share stores a redacted report for seven days by default and removes raw IP from stored report JSON.
          </div>

          {error ? (
            <p className="status-line error" role="alert">
              {error}
            </p>
          ) : null}
          {share ? (
            <p className="status-line" role="status">
              Share URL: <a href={`/reports/${share.id}`}>{`/reports/${share.id}`}</a>
              <span>Expires {new Date(share.expiresAt).toLocaleDateString()}.</span>
            </p>
          ) : null}

          {report ? (
            <div className="scan-results">
              <div className="scan-metric-grid">
                <SignalCard
                  icon={<Wifi size={16} aria-hidden="true" />}
                  title="Network egress audit"
                  status={statusForCategories(score, ["geo", "network"])}
                  rows={[
                    ["Detected country", report.ip?.countryCode ?? "unknown"],
                    ["Edge city", [report.ip?.city, report.ip?.region].filter(Boolean).join(", ") || "unknown"],
                    ["IP timezone", report.ip?.timezone ?? "unknown"],
                    ["ASN", report.ip?.asn ?? "unknown"]
                  ]}
                />
                <SignalCard
                  icon={<Clock3 size={16} aria-hidden="true" />}
                  title="Locale and clock alignment"
                  status={statusForCategories(score, ["geo"])}
                  rows={[
                    ["Primary language", report.client.languages[0] ?? report.client.language ?? "unknown"],
                    ["Runtime timezone", report.client.timezone ?? "unknown"],
                    ["Clock offset", formatOffset(report.client.timezoneOffsetMinutes)],
                    ["Language count", String(report.client.languages.length)]
                  ]}
                />
                <SignalCard
                  icon={<Monitor size={16} aria-hidden="true" />}
                  title="Hardware and rendering"
                  status={statusForCategories(score, ["device", "runtime"])}
                  rows={[
                    ["Device class", report.client.deviceType ?? "unknown"],
                    ["Viewport", `${report.client.viewport.width} x ${report.client.viewport.height}`],
                    ["Screen / DPR", `${report.client.screen.width} x ${report.client.screen.height} / ${report.client.devicePixelRatio}x`],
                    ["WebGL renderer", report.client.webgl?.renderer ?? "unavailable"]
                  ]}
                />
                <SignalCard
                  icon={<ShieldCheck size={16} aria-hidden="true" />}
                  title="Security and automation"
                  status={statusForCategories(score, ["privacy", "automation"])}
                  rows={[
                    ["Webdriver", report.client.webdriver ? "true" : "false"],
                    ["WebRTC", report.client.webrtc?.checked ? `${report.client.webrtc.candidates.length} candidate(s)` : "not checked"],
                    ["Canvas hash", report.client.canvas?.sampleHash ?? "unavailable"],
                    ["Audio", report.client.audio?.supported ? `${report.client.audio.sampleRate ?? "unknown"} Hz` : "unavailable"]
                  ]}
                />
              </div>

              <div className="canvas-card">
                <div>
                  <p className="eyebrow">Local render challenge</p>
                  <h3>Canvas, audio, and WebGL signatures</h3>
                </div>
                <div className="render-signature-grid">
                  <SignatureValue label="Canvas hash" value={report.client.canvas?.sampleHash ?? "unavailable"} />
                  <SignatureValue label="Audio sample rate" value={report.client.audio?.sampleRate ? `${report.client.audio.sampleRate} Hz` : "unavailable"} />
                  <SignatureValue label="WebGL vendor" value={report.client.webgl?.vendor ?? "unavailable"} />
                </div>
              </div>

              <div className="table-wrap" tabIndex={0} aria-label="Scrollable browser signal observations table">
                <table className="signal-table">
                  <caption className="visually-hidden">Browser signal observations</caption>
                  <thead>
                    <tr>
                      <th scope="col">Signal</th>
                      <th scope="col">Observed value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signalRows.map(([label, value]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Radar size={34} aria-hidden="true" />
              <h3>Audit scan engine idle</h3>
              <p>Start a scan to inspect browser-visible signals, edge geography, language, timezone, storage, rendering, and optional WebRTC state.</p>
              <button className="button primary" type="button" onClick={runScan}>
                <Play size={16} aria-hidden="true" />
                Start scan now
              </button>
            </div>
          )}
        </div>
      </div>

      <aside className="panel score-panel" aria-label="Score summary">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Fidelity rating</p>
            <h2>Consistency score</h2>
          </div>
          <Activity size={24} aria-hidden="true" />
        </div>
        <div className="panel-body dense-list">
          <div className="score-orb">
            <svg viewBox="0 0 112 112" aria-hidden="true">
              <circle cx="56" cy="56" r="50" className="score-track" />
              <circle
                cx="56"
                cy="56"
                r="50"
                className={`score-ring ${scoreTone}`}
                strokeDasharray={circumference}
                strokeDashoffset={scoreOffset}
              />
            </svg>
            <div>
              <strong>{score ? score.overall : "--"}</strong>
              <span>integrity</span>
            </div>
          </div>

          <span className={`status-pill score-status ${scoreTone}`}>{score ? scoreSummary(score.overall).label : "Awaiting diagnosis"}</span>
          <p className="score-copy">{score ? scoreSummary(score.overall).body : "Run a scan to score the current browser profile against consistency rules."}</p>

          {score ? (
            <>
              <div className="score-grid">
                <ScoreTile label="Device" value={score.breakdown.device} />
                <ScoreTile label="Geo" value={score.breakdown.geo} />
                <ScoreTile label="Leak risk" value={score.breakdown.leakRisk} />
                <ScoreTile label="Automation QA" value={score.breakdown.automationReadiness} />
              </div>

              <div className="button-row compact-controls" aria-label="Score category filter">
                {scoreFilters.map((filter) => (
                  <button
                    className="button secondary compact-button"
                    type="button"
                    key={filter.id}
                    onClick={() => setScoreFilter(filter.id)}
                    aria-pressed={scoreFilter === filter.id}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {report?.client.webrtc?.checked ? null : (
                <div className="data-note compact-note">
                  Leak-risk confidence is partial until the optional WebRTC candidate check is run.
                </div>
              )}

              <div className="warning-log">
                <p className="eyebrow">Live diagnostic warnings</p>
                {rankedRemediations.length ? (
                  rankedRemediations.slice(0, 5).map((item) => <WarningItem item={item} key={item.mismatchId} />)
                ) : (
                  <div className="mismatch info">
                    <CheckCircle2 size={16} aria-hidden="true" />
                    <div>
                      <strong>No high-impact mismatches detected</strong>
                      <p>The observed browser and network signals are internally coherent.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="fix-first">
                <div>
                  <p className="eyebrow">Fix this first</p>
                  <h3>{rankedRemediations[0]?.title ?? "No prioritized fixes"}</h3>
                </div>
                {rankedRemediations.length ? (
                  rankedRemediations.slice(0, 3).map((item) => <RemediationItem item={item} key={item.mismatchId} />)
                ) : (
                  <div className="mismatch info">
                    <strong>No fixes in this filter</strong>
                    <p>The selected category has no high-impact mismatches.</p>
                  </div>
                )}
              </div>

              {report ? (
                <div className="suggested-config">
                  <div className="panel-header inline-panel-header">
                    <div>
                      <p className="eyebrow">Next action</p>
                      <h3>Suggested Playwright use config</h3>
                    </div>
                    <button className="button secondary compact-button" type="button" onClick={copySuggestedConfig}>
                      <Copy size={16} aria-hidden="true" />
                      Copy
                    </button>
                  </div>
                  <pre className="code-box" tabIndex={0} aria-label="Suggested Playwright use config">
                    <code>{suggestedPlaywrightUse(report)}</code>
                  </pre>
                  <p className="inline-note">Use this as a starting point, then align route, geolocation, and CI launch options.</p>
                  <p className="visually-hidden" role="status" aria-live="polite">
                    {suggestedCopyStatus}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="empty-state compact">
              <Globe2 size={28} aria-hidden="true" />
              <p>Scores appear after a scan. Provider-backed proxy and VPN flags are marked unavailable when no provider key is configured.</p>
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}

function SignalCard({
  icon,
  title,
  status,
  rows
}: {
  icon: ReactNode;
  title: string;
  status: MetricStatus;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="signal-card">
      <div className="signal-card-head">
        <span>
          {icon}
          {title}
        </span>
        <span className={`metric-status ${status}`}>{metricStatusLabel(status)}</span>
      </div>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SignatureValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function WarningItem({ item }: { item: RemediationRecommendation }) {
  return (
    <div className={`mismatch ${item.severity}`}>
      <AlertTriangle size={16} aria-hidden="true" />
      <div>
        <strong>{item.title}</strong>
        <p>{item.detail}</p>
      </div>
    </div>
  );
}

function RemediationItem({ item }: { item: RemediationRecommendation }) {
  return (
    <div className={`mismatch ${item.severity}`}>
      <div className="remediation-heading">
        <strong>
          {item.priority}. {item.title}
        </strong>
        <span>{item.effort} effort</span>
      </div>
      <p>{item.action}</p>
    </div>
  );
}

const scoreFilters: Array<{ id: ScoreFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "device", label: "Device" },
  { id: "geo", label: "Geo" },
  { id: "leakRisk", label: "Leak risk" },
  { id: "automation", label: "Automation" }
];

function matchesScoreFilter(category: SignalCategory, filter: ScoreFilter): boolean {
  if (filter === "all") return true;
  if (filter === "device") return category === "device" || category === "runtime";
  if (filter === "geo") return category === "geo" || category === "network";
  if (filter === "leakRisk") return category === "privacy" || category === "network";
  return category === "automation";
}

function statusForCategories(score: FidelityScore | undefined, categories: SignalCategory[]): MetricStatus {
  if (!score) return "waiting";
  const mismatches = score.mismatches.filter((item) => categories.includes(item.category));
  if (mismatches.some((item) => item.severity === "critical")) return "critical";
  if (mismatches.some((item) => item.severity === "warning")) return "warning";
  return "ok";
}

function metricStatusLabel(status: MetricStatus): string {
  if (status === "ok") return "Aligned";
  if (status === "warning") return "Review";
  if (status === "critical") return "Conflict";
  return "Pending";
}

function scoreToneFor(value: number): "good" | "warn" | "bad" {
  if (value >= 90) return "good";
  if (value >= 70) return "warn";
  return "bad";
}

function scoreSummary(value: number): { label: string; body: string } {
  if (value >= 90) {
    return {
      label: "Coherent profile",
      body: "The current browser profile is suitable for repeatable QA evidence."
    };
  }
  if (value >= 70) {
    return {
      label: "Parameter drift warning",
      body: "The current browser profile has inconsistencies that should be reviewed before CI use."
    };
  }
  return {
    label: "High-risk signature",
    body: "Critical browser, network, or automation signals need remediation before this profile is trusted."
  };
}

function formatOffset(value: number | undefined): string {
  if (typeof value !== "number") return "unknown";
  const hours = -(value / 60);
  return `UTC${hours >= 0 ? "+" : ""}${hours} (${value} min)`;
}

async function fetchIpSignals(): Promise<IpSignals | undefined> {
  const response = await fetch("/api/ip");
  if (!response.ok) return undefined;
  const body = (await response.json()) as ApiIpResponse;
  return body.ip;
}

async function collectClientSignals(includeWebrtc: boolean): Promise<ClientSignals> {
  const webgl = collectWebgl();
  const canvas = await collectCanvas();
  const audio = collectAudio();
  const permissions = await collectPermissions();
  const webrtc = includeWebrtc ? await collectWebrtc() : undefined;

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth
    },
    devicePixelRatio: window.devicePixelRatio,
    touchPoints: navigator.maxTouchPoints,
    pointer: window.matchMedia("(pointer: coarse)").matches ? "coarse" : "fine",
    hover: window.matchMedia("(hover: hover)").matches ? "hover" : "none",
    language: navigator.language,
    languages: [...navigator.languages],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    webdriver: navigator.webdriver,
    cookiesEnabled: navigator.cookieEnabled,
    localStorage: storageState("localStorage"),
    sessionStorage: storageState("sessionStorage"),
    webgl,
    canvas,
    audio,
    permissions,
    webrtc
  };
}

function suggestedPlaywrightUse(report: BrowserSignalReport): string {
  const primaryLocale = report.client.languages[0] ?? report.client.language ?? "en-US";
  const isMobile = report.client.deviceType === "mobile" || report.client.deviceType === "tablet";
  const hasTouch = report.client.touchPoints > 0 || isMobile;
  const permissions = Object.entries(report.client.permissions ?? {})
    .filter(([, value]) => value === "granted")
    .map(([name]) => name);
  const fields: Record<string, unknown> = {
    userAgent: report.client.userAgent,
    viewport: report.client.viewport,
    screen: report.client.screen,
    deviceScaleFactor: report.client.devicePixelRatio,
    isMobile,
    hasTouch,
    locale: primaryLocale,
    timezoneId: report.client.timezone ?? "UTC",
    permissions
  };

  return `use: ${JSON.stringify(fields, null, 2)}`;
}

function storageState(name: "localStorage" | "sessionStorage"): "available" | "blocked" {
  try {
    window[name].setItem("__bfl_probe", "1");
    window[name].removeItem("__bfl_probe");
    return "available";
  } catch {
    return "blocked";
  }
}

function collectWebgl() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) return undefined;
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    vendor: debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)) : undefined,
    renderer: debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : undefined,
    version: String(gl.getParameter(gl.VERSION))
  };
}

async function collectCanvas() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 80;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { supported: false };
    ctx.fillStyle = "#147d6f";
    ctx.fillRect(0, 0, 240, 80);
    ctx.fillStyle = "#ffffff";
    ctx.font = "18px sans-serif";
    ctx.fillText("Cloak Browser", 14, 44);
    return { supported: true, sampleHash: await hashText(canvas.toDataURL()) };
  } catch {
    return { supported: false };
  }
}

function collectAudio() {
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) return { supported: false };
  try {
    const context = new AudioContextCtor();
    const sampleRate = context.sampleRate;
    void context.close();
    return { supported: true, sampleRate };
  } catch {
    return { supported: false };
  }
}

async function collectPermissions() {
  if (!navigator.permissions?.query) return {};
  const names = ["geolocation", "camera", "microphone", "notifications"] as const;
  const entries = await Promise.all(
    names.map(async (name) => {
      try {
        const status = await navigator.permissions.query({ name } as PermissionDescriptor);
        return [name, status.state] as const;
      } catch {
        return [name, "unsupported"] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

async function collectWebrtc(): Promise<WebrtcSignal> {
  if (!("RTCPeerConnection" in window)) {
    return { checked: true, candidates: [], exposesPrivateAddress: false, exposesPublicAddress: false };
  }

  const candidates = new Set<string>();
  const pc = new RTCPeerConnection({ iceServers: [] });

  try {
    pc.createDataChannel("bfl");
    pc.onicecandidate = (event) => {
      if (event.candidate?.candidate) {
        candidates.add(event.candidate.candidate);
      }
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  } finally {
    pc.close();
  }

  const values = [...candidates];
  const addresses = values.flatMap((candidate) => extractIpv4Addresses(candidate));
  return {
    checked: true,
    candidates: values,
    exposesPrivateAddress: addresses.some((address) => isPrivateIpv4Address(address)),
    exposesPublicAddress: addresses.some((address) => isPublicIpv4Address(address))
  };
}

async function hashText(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
