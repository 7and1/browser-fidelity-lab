# Contributing

Browser Fidelity Lab is an open-source QA tool for validating whether browser,
network, locale, timezone, WebRTC, and Playwright settings describe a coherent
test environment.

## Development Setup

Use Node.js 22 and pnpm 9.15.x.

```bash
pnpm install --frozen-lockfile
pnpm run ci
```

The repository is a pnpm workspace:

- `apps/web`: Astro, React islands, and Cloudflare Worker routes.
- `packages/fidelity-core`: signal normalization, rules, and scoring.
- `packages/device-presets`: deterministic Playwright preset exports.
- `packages/report-renderer`: shared report summaries.
- `packages/cli`: local and CI audit command.

## Expected Checks

Run the fast checks before opening a pull request:

```bash
pnpm lint:content
pnpm check:open-source
pnpm typecheck
pnpm test
pnpm build
```

`pnpm check:launch` is intentionally separate. It checks production-only
Cloudflare, D1, secret, DNS, and public endpoint readiness and is expected to
fail until the deployment environment is configured.

## Code Guidelines

- Keep the project focused on authorized QA, compatibility checks, and
  repeatable Playwright environments.
- Do not add copy or code that claims to bypass authentication, CAPTCHA, bot
  controls, fraud systems, or third-party abuse protections.
- Normalize all API input before scoring or storing it.
- Do not store raw IP addresses in shared report JSON.
- Keep shared reports short-lived and redacted.
- Add focused tests when changing scoring, normalization, preset generation, or
  API boundary behavior.

## Pull Request Checklist

- The change is scoped to one clear behavior or documentation improvement.
- Public API responses keep the documented error shape.
- UI changes work on desktop and mobile and do not introduce horizontal overflow.
- No secrets, tokens, credentials, browser profiles, or local env files are
  committed.
- Production launch claims are backed by `pnpm check:launch`, production smoke,
  and browser QA evidence.
