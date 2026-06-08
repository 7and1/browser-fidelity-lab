# Project State

- Project: Browser Fidelity Lab
- Domain target: `cloakbrowser.org`
- Runtime target: Cloudflare Workers static assets plus API routes
- Storage target: Cloudflare D1 binding `REPORTS`
- Current local state: launch-hardened open-source source tree; deployment still
  requires a real Cloudflare D1 `database_id`, `REPORT_HASH_SECRET` Worker
  secret, Cloudflare deploy auth, and public DNS route proof before launch can be
  claimed
- Public DNS observed from this environment on 2026-06-03: public resolvers did
  not return a usable Cloudflare target for `cloakbrowser.org`; local resolver
  returned `198.18.15.210`, which is not a public production target
- Public DNS observed from this environment on 2026-06-06: local resolver
  returned `198.18.6.152`; public resolvers `1.1.1.1` and `8.8.8.8` returned
  `185.53.179.146`; HTTPS `/` and `/api/health` timed out from this control
  plane
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
