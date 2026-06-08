# Project State

- Project: Browser Fidelity Lab
- Domain target: `cloakbrowser.org`
- Runtime target: Cloudflare Workers static assets plus API routes
- Storage target: Cloudflare D1 binding `REPORTS`
- Current local state: public GitHub repo plus Cloudflare Worker deployment are
  live on `workers.dev`; formal `cloakbrowser.org` launch is still blocked by
  registrar nameserver delegation
- Current public Worker URL:
  `https://browser-fidelity-lab.9c8e1a84.workers.dev`
- Current GitHub repo:
  `https://github.com/7and1/browser-fidelity-lab`
- Cloudflare D1 database:
  `browser_fidelity_reports` / `fdd2b7d7-22d8-413c-883e-bb39aa1aab1d`
- Public DNS observed from this environment on 2026-06-03: public resolvers did
  not return a usable Cloudflare target for `cloakbrowser.org`; local resolver
  returned `198.18.15.210`, which is not a public production target
- Public DNS observed from this environment on 2026-06-06: local resolver
  returned `198.18.6.152`; public resolvers `1.1.1.1` and `8.8.8.8` returned
  `185.53.179.146`; HTTPS `/` and `/api/health` timed out from this control
  plane
- Public DNS observed from this environment on 2026-06-08: Cloudflare zone
  `ebe2110551c773088c76f181b96b2c20` exists but is `pending`; `1.1.1.1`
  still returns `185.53.179.146` and nameservers `ns1.dyna-ns.net` /
  `ns2.dyna-ns.net`; registrar must switch nameservers to
  `raegan.ns.cloudflare.com` and `simon.ns.cloudflare.com`
- Public Worker smoke observed from this environment on 2026-06-08:
  `workers.dev` returned 200 for `/`, `/scan`, `/tools`, tool pages,
  `/robots.txt`, sitemaps, `/api/health`, `/api/ready`, `/api/ip`, report
  create, and report read
- Public affiliation statement: independent project, not affiliated with CloakHQ
  or CloakBrowser
- Production validation entrypoint: `./deploy.sh`
- Open-source validation entrypoint: `pnpm check:open-source`
- Production launch gate: `pnpm check:launch`
- Required production smoke: `/`, `/scan`, `/tools`, `/api/ip`, `POST /api/report`,
  `GET /api/report/{id}`, `/api/health`, `/api/ready`, `/robots.txt`,
  `/sitemap-index.xml`, and `/sitemap.xml`
- Managed preview registration asset: `ops/openclaw-project-entry.json`
- Browser QA entrypoint: `pnpm qa:browser`
- Browser QA status on 2026-06-08: environment-blocked on OpenClaw because the
  registered Playwright Chromium executable is missing; exact failing command was
  `OPENCLAW_QA_BASE_URL=https://browser-fidelity-lab.9c8e1a84.workers.dev CLOAKBROWSER_QA_REQUIRE_SHARE=1 node ./scripts/openclaw-browser-qa.mjs`
