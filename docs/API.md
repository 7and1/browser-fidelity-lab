# Browser Fidelity Lab API Contract

Base URL: `https://cloakbrowser.org`

All API responses use JSON. Public errors use:

```json
{
  "error": {
    "code": "string",
    "message": "string"
  }
}
```

Internal exception details are logged server-side and are not returned to users.

## GET /api/health

Worker liveness check.

Success:

```json
{
  "ok": true,
  "service": "browser-fidelity-lab",
  "version": "0.1.0",
  "time": "2026-06-03T00:00:00.000Z"
}
```

## GET /api/ready

Production readiness check. This endpoint verifies:

- `REPORTS` D1 binding exists.
- `REPORT_HASH_SECRET` is configured.
- A D1 read probe succeeds.

Returns `200` when all checks pass and `503` otherwise.

## GET /api/ip

Returns Cloudflare edge IP signals and optional provider-backed IP intelligence.
Provider failures degrade to Cloudflare-only signals instead of failing the scan.

## POST /api/report

Creates a short-lived shared report.

Rules:

- `Content-Type` must include `application/json`.
- Payload must be 32 KB or smaller.
- Raw IP is removed from stored report JSON.
- Visitor hash uses daily HMAC with `REPORT_HASH_SECRET`.
- Default report TTL is seven days.
- Default creation limit is 30 reports per visitor hash per 24 hours.

Success status: `201`.

Common errors:

- `415 unsupported_media_type`
- `413 payload_too_large`
- `400 invalid_json`
- `429 report_rate_limited`
- `503 report_storage_unavailable`

## GET /api/report/{id}

Reads a non-expired shared report by ID.

Rules:

- ID must match `/^[a-z0-9]{8,32}$/i`.
- Expired reports return `404`.
- Shared report pages are `noindex,follow`; reports are team handoff artifacts,
  not public evergreen content.

## POST /api/preset

Returns deterministic Playwright preset exports for a known preset ID.

Rules:

- `Content-Type` must include `application/json`.
- Payload must be 1 KB or smaller.
- Unknown preset IDs return a public error.
- Preset objects include `tags` and `region` so UI and CI callers can filter by
  device class, browser engine, and geography.
- Successful responses include `playwrightConfig`, `nodeSnippet`,
  `pythonSnippet`, `jsonPreset`, `ciMatrix`, and `ciRecipe`.
