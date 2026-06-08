import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://cloakbrowser.org",
  adapter: cloudflare(),
  integrations: [react()]
});
