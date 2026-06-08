export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface BrowserFidelityPreset {
  id: string;
  label: string;
  deviceName: string;
  region: string;
  tags: string[];
  browserName: "chromium" | "firefox" | "webkit";
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
  screen: {
    width: number;
    height: number;
  };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  locale: string;
  timezoneId: string;
  geolocation?: GeoPoint;
  permissions: string[];
  colorScheme: "light" | "dark" | "no-preference";
  notes: string[];
}

export interface PresetExport {
  preset: BrowserFidelityPreset;
  playwrightConfig: string;
  nodeSnippet: string;
  pythonSnippet: string;
  jsonPreset: string;
  ciMatrix: string;
  ciRecipe: string;
}
