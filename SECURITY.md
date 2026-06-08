# Security Policy

## Supported Versions

Security fixes target the current `main` branch and the latest deployed
Cloudflare Worker.

## Reporting a Vulnerability

Report security issues privately to the project maintainer before opening a
public issue. Include:

- Affected URL, package, or API route.
- Reproduction steps.
- Expected and actual impact.
- Whether any shared report IDs or sample payloads are involved.

Do not include real secrets, raw access tokens, unrelated personal data, or
third-party credentials in a report.

## Security Boundaries

Cloak Browser is designed for authorized QA and environment consistency checks.
It is not intended to bypass authentication, CAPTCHA, bot controls, fraud
systems, or any system you are not authorized to test.

Production report storage follows these rules:

- Shared reports are redacted before storage.
- Raw IP addresses are removed from stored report JSON.
- A daily HMAC visitor hash is used only for basic abuse control.
- Reports expire after the configured TTL, seven days by default.
- Provider tokens and `REPORT_HASH_SECRET` must be configured as Cloudflare
  Worker secrets, not committed to the repository.

## Deployment Requirements

A production launch requires:

- Real Cloudflare D1 database id in `apps/web/wrangler.toml`.
- `REPORT_HASH_SECRET` set as a Worker secret.
- Public DNS for `cloakbrowser.org` pointing to the intended Cloudflare route.
- Passing `/api/health`, `/api/ready`, report lifecycle smoke checks, and
  browser QA.
