# Browser Fidelity Lab

Browser Fidelity Lab is an open-source QA surface for checking whether browser,
mobile, locale, timezone, IP geography, WebRTC, and Playwright settings describe
one coherent environment.

The public site can use `cloakbrowser.org`, but the product name is **Browser
Fidelity Lab**.

Independent project. Not affiliated with CloakHQ or CloakBrowser.

## What It Does

- Scans browser-visible signals such as user agent, viewport, DPR, touch,
  pointer, screen, locale, timezone, storage, WebGL, canvas, audio, permissions,
  and optional WebRTC candidates.
- Compares client signals with edge IP geography and optional IP intelligence.
- Generates mismatch reports for QA and security teams.
- Exports Playwright configuration, Node snippets, Python snippets, JSON
  presets, CI recipes, and CI matrix entries.
- Provides a CLI for local and CI audits.

## What It Does Not Do

This project does not host, redistribute, embed, resell, or operate any
third-party browser binary for customers. It is not a tool for bypassing
authentication, bot controls, abuse systems, or any system you are not
authorized to test.

## Workspace

```text
apps/web                  Astro + React islands + Cloudflare Workers API
packages/fidelity-core    Signal schema, normalization, rules, scoring
packages/device-presets   Playwright preset generator
packages/report-renderer  Shared report summaries and markdown output
packages/cli              browser-fidelity CLI
```

## Local Commands

```bash
pnpm install
pnpm lint:content
pnpm typecheck
pnpm test
pnpm build
pnpm run ci
pnpm check:open-source
pnpm check:launch
pnpm qa:browser
```

Per the workspace operating contract, dependency installation, preview servers,
browser QA, and production deployment should run on OpenClaw, not on the local
Mac control plane.

`pnpm check:open-source` verifies the public repository materials, empty secret
placeholders, and expected workspace scripts. `pnpm check:launch` is a
production-only gate for D1, Worker secrets, Cloudflare auth environment, public
DNS, `/api/health`, and `/api/ready`.

## Cloudflare

The web app is designed for Cloudflare Workers with static assets and API routes.
D1 stores shareable anonymous reports with a seven-day expiration window.
The public API contract is documented in `docs/API.md`.
The public CI workflow guide is available at `/docs/ci-browser-fidelity-checks`.

The CLI can fail CI directly when the browser environment drops below a chosen
score:

```bash
browser-fidelity audit https://example.com --preset desktop-chrome-us --fail-under 90 --json
```

Required production configuration:

- `REPORTS` D1 binding to the `browser_fidelity_reports` database.
- `REPORT_HASH_SECRET` Worker secret for the daily visitor HMAC.
- `REPORT_TTL_DAYS`, default `7`.
- `REPORTS_PER_DAY`, default `30`.
- Optional `IPINFO_TOKEN` and `PROXYCHECK_TOKEN` Worker secrets for provider-backed
  IP intelligence.

```bash
cd apps/web
pnpm build
pnpm wrangler d1 migrations apply browser_fidelity_reports
pnpm wrangler secret put REPORT_HASH_SECRET
pnpm wrangler deploy
```

Before a direct deploy, verify the active Cloudflare identity:

```bash
pnpm wrangler whoami
```

The production deployment entrypoint is:

```bash
./deploy.sh
```

GitHub Actions deployment is configured in
`.github/workflows/deploy-cloudflare.yml`. It requires repository secrets
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `REPORT_HASH_SECRET`.

It verifies Cloudflare auth, rejects placeholder D1 config, checks the required
hash secret, runs `pnpm run ci`, applies remote D1 migrations, purges expired rows,
verifies the scheduled Worker wrapper exists, deploys the Worker, and runs
production smoke checks against the public base URL.

## Health, Readiness, and Maintenance

- `GET /api/health` returns a basic Worker liveness response.
- `GET /api/ready` checks the `REPORTS` D1 binding, `REPORT_HASH_SECRET`, and a
  D1 read probe. It returns `503` until the production bindings are ready.
- Cloudflare Cron is configured in `apps/web/wrangler.toml` at `17 3 * * *`.
- The web build writes `dist/_worker.js/scheduled-worker.js`, which delegates
  normal requests to the Astro Worker and implements the scheduled expired-report
  purge handler.
- `apps/web pnpm run preview` uses `wrangler dev --test-scheduled`, so the cron
  handler can be tested with Wrangler's scheduled test route.

## Data Retention

Reports are intended to be anonymous and short-lived. The API strips raw IP
addresses before storing report JSON and keeps a daily HMAC visitor hash only for
basic abuse control. Reports expire after seven days by default. Expired rows are
purged during the deploy maintenance step.

## SEO and Indexing

- Public indexable URLs are listed in `/sitemap.xml` and referenced by
  `/sitemap-index.xml`.
- `/api/*`, `/reports/*`, and `/404` are intentionally excluded from the sitemap.
- Shared reports render `noindex,follow` because they are short-lived team
  handoff artifacts, not evergreen search pages.
- Page metadata includes canonical, robots, Open Graph, Twitter summary, and
  structured data.

## Open Source Readiness

- License: MIT.
- Contribution guide: `CONTRIBUTING.md`.
- Security policy: `SECURITY.md`.
- Roadmap: `ROADMAP.md`.
- Issue templates for bugs, false positives, and preset requests.
- Public API contract: `docs/API.md`.
- Launch checklist: `docs/LAUNCH_CHECKLIST.md`.
- The root package remains `private: true` to prevent accidental workspace
  publication; package-level publishing can be enabled separately if needed.

## Production Acceptance

A launch claim requires current evidence for all of the following:

- `pnpm run ci` and `pnpm check:launch` pass in the release environment.
- Public DNS for `cloakbrowser.org` resolves to the intended Cloudflare route.
- HTTPS `/`, `/scan`, `/tools`, `/api/ip`, `/robots.txt`, and sitemap URLs return
  success.
- `POST /api/report` creates a redacted report and `GET /api/report/{id}` reads it.
- `/api/health` returns `200` and `/api/ready` returns `200` after D1 and secrets
  are configured.
- Browser QA confirms scanner hydration, scan completion, share flow, report page,
  suggested Playwright config copy, report page, and preset copy on desktop and
  mobile.
- Cloudflare logs are inspected after deploy for errors during smoke traffic.

## OpenClaw QA

The project includes `ops/openclaw-project-entry.json` as the managed preview
registration entry. After the remote workspace exists at
`/Users/openclaw/test-workspace/cloakbrowser-org`, merge that entry into
`~/.codex/config/openclaw-projects.json`, then run:

```bash
~/.codex/bin/openclaw-ops exec --project cloakbrowser-org --cmd 'pnpm install --frozen-lockfile && pnpm run ci'
~/.codex/bin/openclaw-ops serve --project cloakbrowser-org --replace
~/.codex/bin/openclaw-ops e2e --project cloakbrowser-org
```

For production browser QA after deploy:

```bash
CLOAKBROWSER_BASE_URL=https://cloakbrowser.org CLOAKBROWSER_QA_REQUIRE_SHARE=1 pnpm qa:browser
```
