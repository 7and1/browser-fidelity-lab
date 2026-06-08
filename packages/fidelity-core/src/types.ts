export type Severity = "info" | "warning" | "critical";

export type SignalCategory =
  | "device"
  | "geo"
  | "network"
  | "runtime"
  | "privacy"
  | "automation";

export interface ViewportSignal {
  width: number;
  height: number;
}

export interface ScreenSignal extends ViewportSignal {
  availWidth?: number;
  availHeight?: number;
  colorDepth?: number;
}

export interface WebglSignal {
  vendor?: string;
  renderer?: string;
  version?: string;
}

export interface CanvasSignal {
  supported: boolean;
  sampleHash?: string;
}

export interface AudioSignal {
  supported: boolean;
  sampleRate?: number;
}

export interface PermissionSignal {
  geolocation?: PermissionState | "unsupported";
  camera?: PermissionState | "unsupported";
  microphone?: PermissionState | "unsupported";
  notifications?: PermissionState | "unsupported";
}

export interface WebrtcSignal {
  checked: boolean;
  candidates: string[];
  exposesPrivateAddress: boolean;
  exposesPublicAddress: boolean;
}

export interface ClientSignals {
  userAgent: string;
  platform?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  viewport: ViewportSignal;
  screen: ScreenSignal;
  devicePixelRatio: number;
  touchPoints: number;
  pointer?: string;
  hover?: string;
  language?: string;
  languages: string[];
  timezone?: string;
  timezoneOffsetMinutes?: number;
  webdriver?: boolean;
  cookiesEnabled?: boolean;
  localStorage?: "available" | "blocked" | "unknown";
  sessionStorage?: "available" | "blocked" | "unknown";
  webgl?: WebglSignal;
  canvas?: CanvasSignal;
  audio?: AudioSignal;
  permissions?: PermissionSignal;
  webrtc?: WebrtcSignal;
}

export interface IpFlags {
  proxy?: boolean;
  vpn?: boolean;
  tor?: boolean;
  relay?: boolean;
  hosting?: boolean;
  mobile?: boolean;
  anonymous?: boolean;
  risk?: number;
  confidence?: number;
  unavailableReason?: string;
}

export interface IpSignals {
  ip?: string;
  countryCode?: string;
  countryName?: string;
  region?: string;
  city?: string;
  timezone?: string;
  asn?: string;
  asName?: string;
  asType?: string;
  colo?: string;
  provider?: "cloudflare" | "ipinfo" | "proxycheck" | "combined";
  flags?: IpFlags;
}

export interface ConsentSignals {
  webrtc: boolean;
  geolocation: boolean;
  mediaDevices: boolean;
}

export interface BrowserSignalReport {
  capturedAt: string;
  source: "browser" | "cli" | "fixture";
  client: ClientSignals;
  ip?: IpSignals;
  consent: ConsentSignals;
  targetUrl?: string;
  presetId?: string;
}

export interface Mismatch {
  id: string;
  title: string;
  detail: string;
  category: SignalCategory;
  severity: Severity;
  weight: number;
}

export interface ScoreBreakdown {
  device: number;
  geo: number;
  leakRisk: number;
  automationReadiness: number;
}

export interface FidelityScore {
  overall: number;
  breakdown: ScoreBreakdown;
  mismatches: Mismatch[];
}

export interface ReportEnvelope {
  id: string;
  report: BrowserSignalReport;
  score: FidelityScore;
  createdAt: string;
  expiresAt: string;
}
