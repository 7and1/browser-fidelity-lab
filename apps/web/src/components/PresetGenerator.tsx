import { Copy, FileJson, Terminal } from "lucide-react";
import { useMemo, useState } from "react";
import { exportPreset, presets } from "@browser-fidelity/device-presets";

type ExportTab = "config" | "node" | "python" | "json" | "ci";
type PresetFilter = "all" | "mobile" | "desktop" | "chromium" | "webkit" | "firefox" | "us" | "eu" | "asia";

export function PresetGenerator() {
  const [presetId, setPresetId] = useState("pixel-8-us");
  const [filter, setFilter] = useState<PresetFilter>("all");
  const [tab, setTab] = useState<ExportTab>("config");
  const [copyStatus, setCopyStatus] = useState("Copy preset export");
  const filteredPresets = useMemo(() => filterPresets(filter), [filter]);
  const exported = useMemo(() => exportPreset(presetId), [presetId]);

  const content = {
    config: exported.playwrightConfig,
    node: exported.nodeSnippet,
    python: exported.pythonSnippet,
    json: exported.jsonPreset,
    ci: exported.ciRecipe
  }[tab];

  function changeFilter(nextFilter: PresetFilter) {
    const nextPresets = filterPresets(nextFilter);
    setFilter(nextFilter);
    if (!nextPresets.some((preset) => preset.id === presetId)) {
      setPresetId(nextPresets[0]?.id ?? presetId);
    }
  }

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus("Preset export copied.");
    } catch {
      setCopyStatus("Clipboard copy failed. Select the code and copy manually.");
    }
  }

  return (
    <section className="grid-two" aria-label="Playwright preset generator">
      <div className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Preset generator</p>
            <h2>Export coherent Playwright environments</h2>
          </div>
          <Terminal size={24} aria-hidden="true" />
        </div>
        <div className="panel-body form-grid">
          <div className="field">
            <label htmlFor="preset-filter">Filter</label>
            <select
              id="preset-filter"
              value={filter}
              onChange={(event) => changeFilter(event.currentTarget.value as PresetFilter)}
            >
              {presetFilters.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="preset">Preset</label>
            <select id="preset" value={presetId} onChange={(event) => setPresetId(event.currentTarget.value)}>
              {filteredPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div className="score-grid">
            <div className="score-tile">
              <strong>{exported.preset.viewport.width}</strong>
              <span>Viewport width</span>
            </div>
            <div className="score-tile">
              <strong>{exported.preset.deviceScaleFactor}</strong>
              <span>DPR</span>
            </div>
            <div className="score-tile">
              <strong>{exported.preset.locale}</strong>
              <span>Locale</span>
            </div>
            <div className="score-tile">
              <strong>{exported.preset.timezoneId}</strong>
              <span>Timezone</span>
            </div>
          </div>
          <div className="tag-row" aria-label="Preset tags">
            <span className="tag">{exported.preset.region}</span>
            {exported.preset.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="dense-list">
            {exported.preset.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="button-row" aria-label="Export format">
            <button className="button secondary" type="button" onClick={() => setTab("config")} aria-pressed={tab === "config"}>
              Config
            </button>
            <button className="button secondary" type="button" onClick={() => setTab("node")} aria-pressed={tab === "node"}>
              Node
            </button>
            <button className="button secondary" type="button" onClick={() => setTab("python")} aria-pressed={tab === "python"}>
              Python
            </button>
            <button className="button secondary" type="button" onClick={() => setTab("json")} aria-pressed={tab === "json"}>
              JSON
            </button>
            <button className="button secondary" type="button" onClick={() => setTab("ci")} aria-pressed={tab === "ci"}>
              CI recipe
            </button>
          </div>
          <button className="button primary" type="button" onClick={copyContent}>
            <Copy size={16} aria-hidden="true" />
            Copy
          </button>
        </div>
        <div className="panel-body">
          <pre className="code-box" tabIndex={0} aria-label="Generated preset export">
            <code>{content}</code>
          </pre>
          <p className="inline-note">
            <FileJson size={14} aria-hidden="true" />
            Exports are deterministic; the CI recipe uses a 90-point fail-under threshold.
          </p>
          <p className="visually-hidden" role="status" aria-live="polite">
            {copyStatus}
          </p>
        </div>
      </div>
    </section>
  );
}

const presetFilters: Array<{ id: PresetFilter; label: string }> = [
  { id: "all", label: "All presets" },
  { id: "mobile", label: "Mobile" },
  { id: "desktop", label: "Desktop" },
  { id: "chromium", label: "Chromium" },
  { id: "webkit", label: "WebKit" },
  { id: "firefox", label: "Firefox" },
  { id: "us", label: "US" },
  { id: "eu", label: "Europe" },
  { id: "asia", label: "Asia" }
];

function filterPresets(filter: PresetFilter) {
  if (filter === "all") return presets;
  return presets.filter((preset) => preset.tags.includes(filter));
}
