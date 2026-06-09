import { Copy, FileJson, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  generateCiRecipe,
  generateNodeSnippet,
  generatePlaywrightConfig,
  generatePythonSnippet,
  presets,
  type BrowserFidelityPreset
} from "@browser-fidelity/device-presets";
import { CiGatePreview } from "./CiGatePreview";
import { PresetComparisonMatrix } from "./PresetComparisonMatrix";
import type { ActivePresetState, PresetOverrideState, WorkspaceScanResult } from "./workspace-types";

type ExportTab = "config" | "node" | "python" | "json" | "ci";
type PresetFilter =
  | "all"
  | "mobile"
  | "desktop"
  | "chromium"
  | "webkit"
  | "firefox"
  | "us"
  | "gb"
  | "de"
  | "jp"
  | "eu"
  | "asia";

interface PresetGeneratorProps {
  scanResult?: WorkspaceScanResult;
  showComparison?: boolean;
  showCiPreview?: boolean;
  initialPresetId?: string;
  initialOverrides?: Partial<PresetOverrideState>;
  controlledPresetId?: string;
  controlledOverrides?: PresetOverrideState;
  onPresetChange?: (state: ActivePresetState) => void;
}

export function PresetGenerator({
  scanResult,
  showComparison = false,
  showCiPreview = false,
  initialPresetId = "pixel-8-us",
  initialOverrides,
  controlledPresetId,
  controlledOverrides,
  onPresetChange
}: PresetGeneratorProps) {
  const [internalPresetId, setInternalPresetId] = useState(initialPresetId);
  const [filter, setFilter] = useState<PresetFilter>("mobile");
  const [tab, setTab] = useState<ExportTab>("config");
  const [internalOverrides, setInternalOverrides] = useState<PresetOverrideState>(() =>
    withInitialOverrides(defaultOverrides(findPreset(initialPresetId)), initialOverrides)
  );
  const [copyStatus, setCopyStatus] = useState("Copy preset export");
  const presetId = controlledPresetId ?? internalPresetId;
  const basePreset = findPreset(presetId);
  const filteredPresets = useMemo(() => filterPresets(filter), [filter]);
  const overrides = controlledOverrides ?? internalOverrides;
  const activePreset = useMemo(() => applyOverrides(basePreset, overrides), [basePreset, overrides]);

  const content = {
    config: generatePlaywrightConfig(activePreset),
    node: generateNodeSnippet(activePreset),
    python: generatePythonSnippet(activePreset),
    json: JSON.stringify(activePreset, null, 2),
    ci: generateCiRecipe(basePreset)
  }[tab];

  useEffect(() => {
    onPresetChange?.({ presetId, preset: activePreset, overrides });
  }, [activePreset, onPresetChange, overrides, presetId]);

  function changeFilter(nextFilter: PresetFilter) {
    const nextPresets = filterPresets(nextFilter);
    setFilter(nextFilter);
    if (!nextPresets.some((preset) => preset.id === presetId)) {
      changePreset(nextPresets[0]?.id ?? presetId);
    }
  }

  function changePreset(nextPresetId: string) {
    const nextPreset = findPreset(nextPresetId);
    if (!controlledPresetId) {
      setInternalPresetId(nextPresetId);
    }
    if (!controlledOverrides) {
      setInternalOverrides(withInitialOverrides(defaultOverrides(nextPreset), initialOverrides));
    }
  }

  function updateOverride<K extends keyof PresetOverrideState>(key: K, value: PresetOverrideState[K]) {
    if (controlledOverrides) return;
    setInternalOverrides((current) => ({ ...current, [key]: value }));
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
    <section className="preset-stack" id="generator" aria-label="Playwright preset generator">
      <div className="panel preset-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Deterministic preset generator</p>
            <h2>Generate coherent testing profiles for Playwright</h2>
          </div>
          <span className="status-pill neutral">Preset {activePreset.id}</span>
        </div>

        <div className="preset-layout">
          <div className="preset-controls">
            <div className="control-row two-col">
              <div className="field">
                <label htmlFor="preset-filter">Target form factor</label>
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
                <label htmlFor="preset">Target profile preset</label>
                <select id="preset" value={presetId} onChange={(event) => changePreset(event.currentTarget.value)}>
                  {filteredPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="override-box">
              <div className="override-title">
                <SlidersHorizontal size={16} aria-hidden="true" />
                <span>Manual parameter overrides</span>
              </div>
              <div className="control-row four-col">
                <NumberField
                  id="custom-w"
                  label="Viewport width"
                  value={overrides.viewportWidth}
                  min={240}
                  onChange={(value) => updateOverride("viewportWidth", value)}
                />
                <NumberField
                  id="custom-h"
                  label="Viewport height"
                  value={overrides.viewportHeight}
                  min={320}
                  onChange={(value) => updateOverride("viewportHeight", value)}
                />
                <NumberField
                  id="custom-dpr"
                  label="Pixel ratio"
                  value={overrides.dpr}
                  min={0.5}
                  step={0.1}
                  onChange={(value) => updateOverride("dpr", value)}
                />
                <div className="field">
                  <label htmlFor="custom-lang">Locale</label>
                  <input
                    id="custom-lang"
                    type="text"
                    value={overrides.locale}
                    onChange={(event) => updateOverride("locale", event.currentTarget.value)}
                  />
                </div>
              </div>
              <div className="field timezone-field">
                <label htmlFor="custom-timezone">Timezone ID</label>
                <input
                  id="custom-timezone"
                  type="text"
                  value={overrides.timezone}
                  onChange={(event) => updateOverride("timezone", event.currentTarget.value)}
                />
              </div>
            </div>

            <div className="score-grid preset-summary" aria-label="Target configuration specs">
              <SpecTile label="Viewport" value={`${activePreset.viewport.width} x ${activePreset.viewport.height}`} />
              <SpecTile label="DPR" value={`${activePreset.deviceScaleFactor}x`} />
              <SpecTile label="Locale" value={activePreset.locale} />
              <SpecTile label="Timezone" value={activePreset.timezoneId} />
            </div>

            <div className="tag-row" aria-label="Preset tags">
              <span className="tag">{activePreset.region}</span>
              {activePreset.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="data-note">
              Manual overrides affect generated config, Node, Python, and JSON exports. The CI recipe keeps the saved preset ID so
              repository gates stay reviewable.
            </div>
          </div>

          <div className="export-panel">
            <div className="panel-header export-toolbar">
              <div className="button-row" aria-label="Export format">
                {exportTabs.map((item) => (
                  <button
                    className="button secondary compact-button"
                    type="button"
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    aria-pressed={tab === item.id}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button className="button primary compact-button" type="button" onClick={copyContent}>
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
        </div>
      </div>

      {showComparison ? <PresetComparisonMatrix preset={activePreset} scanResult={scanResult} /> : null}
      {showCiPreview ? <CiGatePreview preset={basePreset} scanResult={scanResult} /> : null}
    </section>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  step = 1,
  onChange
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </div>
  );
}

function SpecTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="score-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const presetFilters: Array<{ id: PresetFilter; label: string }> = [
  { id: "all", label: "All presets" },
  { id: "mobile", label: "Mobile devices" },
  { id: "desktop", label: "Desktop configurations" },
  { id: "chromium", label: "Chromium" },
  { id: "webkit", label: "WebKit" },
  { id: "firefox", label: "Firefox" },
  { id: "us", label: "US" },
  { id: "gb", label: "GB" },
  { id: "de", label: "DE" },
  { id: "jp", label: "JP" },
  { id: "eu", label: "Europe" },
  { id: "asia", label: "Asia" }
];

const exportTabs: Array<{ id: ExportTab; label: string }> = [
  { id: "config", label: "Config" },
  { id: "node", label: "Node" },
  { id: "python", label: "Python" },
  { id: "json", label: "JSON" },
  { id: "ci", label: "CI recipe" }
];

function filterPresets(filter: PresetFilter) {
  if (filter === "all") return presets;
  return presets.filter((preset) => preset.tags.includes(filter) || preset.region.toLowerCase() === filter);
}

function findPreset(presetId: string): BrowserFidelityPreset {
  return presets.find((preset) => preset.id === presetId) ?? presets[0];
}

function defaultOverrides(preset: BrowserFidelityPreset): PresetOverrideState {
  return {
    viewportWidth: preset.viewport.width,
    viewportHeight: preset.viewport.height,
    dpr: preset.deviceScaleFactor,
    locale: preset.locale,
    timezone: preset.timezoneId
  };
}

function withInitialOverrides(base: PresetOverrideState, overrides: Partial<PresetOverrideState> | undefined): PresetOverrideState {
  return { ...base, ...overrides };
}

function applyOverrides(preset: BrowserFidelityPreset, overrides: PresetOverrideState): BrowserFidelityPreset {
  const width = saneNumber(overrides.viewportWidth, preset.viewport.width);
  const height = saneNumber(overrides.viewportHeight, preset.viewport.height);
  const dpr = saneNumber(overrides.dpr, preset.deviceScaleFactor);

  return {
    ...preset,
    id: hasPresetChanged(preset, overrides) ? `${preset.id}-custom` : preset.id,
    viewport: { width, height },
    screen: { ...preset.screen, width, height },
    deviceScaleFactor: dpr,
    locale: overrides.locale.trim() || preset.locale,
    timezoneId: overrides.timezone.trim() || preset.timezoneId,
    notes: hasPresetChanged(preset, overrides)
      ? [...preset.notes, "This export includes manual overrides from the web generator."]
      : preset.notes
  };
}

function hasPresetChanged(preset: BrowserFidelityPreset, overrides: PresetOverrideState): boolean {
  return (
    preset.viewport.width !== overrides.viewportWidth ||
    preset.viewport.height !== overrides.viewportHeight ||
    preset.deviceScaleFactor !== overrides.dpr ||
    preset.locale !== overrides.locale ||
    preset.timezoneId !== overrides.timezone
  );
}

function saneNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
