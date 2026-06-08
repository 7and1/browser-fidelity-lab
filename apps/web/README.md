# Browser Fidelity Lab Web App

Astro + React islands deployed to Cloudflare Workers with static assets and API
routes.

## Cloudflare Setup

1. Create the D1 database:

   ```bash
   pnpm wrangler d1 create browser_fidelity_reports
   ```

2. Replace `database_id` in `wrangler.toml` with the returned id.

3. Apply migrations:

   ```bash
   pnpm wrangler d1 migrations apply browser_fidelity_reports
   ```

4. Required and optional Worker secrets:

   ```bash
   pnpm wrangler secret put REPORT_HASH_SECRET
   pnpm wrangler secret put IPINFO_TOKEN
   pnpm wrangler secret put PROXYCHECK_TOKEN
   ```

5. Deploy:

   ```bash
   cd ../..
   pnpm check:launch
   ./deploy.sh
   ```

No raw IP address is stored in report JSON. Shared reports default to a seven-day
expiration window. A daily HMAC visitor hash is stored for basic abuse control,
so production must set `REPORT_HASH_SECRET` as a Worker secret before report
sharing is enabled.

## API Contract

- `GET /api/ip`: returns Cloudflare edge IP signals and optional provider-backed
  flags. Provider failures degrade to Cloudflare-only data.
- `POST /api/report`: accepts `application/json` only, rejects oversized payloads,
  normalizes and scores browser signals, stores a redacted report in D1, and
  returns `201`.
- `GET /api/report/{id}`: returns a non-expired report or `404`.
- `POST /api/preset`: returns deterministic Playwright preset exports.

Public errors use `{ "error": { "code": "...", "message": "..." } }` and do not
include internal exception details.

## Production Smoke

After deploy, run:

```bash
CLOAKBROWSER_BASE_URL=https://cloakbrowser.org node ../../scripts/smoke-production.mjs
```

This verifies public HTML, robots, sitemap, IP API, report creation, report
redaction, and report readback.

## Health and Readiness

- `GET /api/health` proves the Worker is responding.
- `GET /api/ready` proves D1, `REPORT_HASH_SECRET`, and a D1 read probe are ready.
- `GET /api/ready` returning `503` means deployment should not be treated as
  complete even if static pages return `200`.

## Scheduled Cleanup

`wrangler.toml` registers a daily Cron Trigger at `17 3 * * *`. The build step
generates `dist/_worker.js/scheduled-worker.js`, which wraps the Astro Worker and
adds a `scheduled()` handler that deletes expired report rows. The syntax follows
Cloudflare's Module Worker scheduled handler contract.
