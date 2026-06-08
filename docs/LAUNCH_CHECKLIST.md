# Launch Checklist

Use this checklist before claiming that `cloakbrowser.org` is live.

## 1. Cloudflare Configuration

- Create the D1 database:

  ```bash
  cd apps/web
  pnpm wrangler d1 create browser_fidelity_reports
  ```

- Replace `database_id` in `apps/web/wrangler.toml` with the returned database
  id.
- Apply migrations remotely:

  ```bash
  pnpm wrangler d1 migrations apply browser_fidelity_reports --remote
  ```

- Set the required Worker secret:

  ```bash
  pnpm wrangler secret put REPORT_HASH_SECRET
  ```

- Optional provider secrets:

  ```bash
  pnpm wrangler secret put IPINFO_TOKEN
  pnpm wrangler secret put PROXYCHECK_TOKEN
  ```

## 2. Domain And Routing

- Point `cloakbrowser.org` to the intended Cloudflare route.
- Confirm public DNS from public resolvers.
- Confirm HTTPS works for `/`, `/scan`, `/tools`, `/robots.txt`,
  `/sitemap-index.xml`, and `/sitemap.xml`.

## 3. Local Release Gates

Run:

```bash
pnpm run ci
pnpm check:launch
```

`pnpm check:launch` is expected to fail until the D1 id, Worker secret,
Cloudflare auth environment, DNS, `/api/health`, and `/api/ready` are all ready.

## 4. Deploy

If using the operator-local credential file, treat `../local.env.txt` as a
private note, not as a shell env file. Do not `source` it. The Cloudflare token
may be stored as `Authorization: Bearer ...`; load it into the deploy shell
without printing the value:

```bash
export CLOUDFLARE_API_TOKEN="$(awk '/Authorization: Bearer /{sub(/^.*Authorization: Bearer /, ""); gsub(/[\"[:space:]]/, ""); print; exit}' ../local.env.txt)"
export GITHUB_TOKEN="$(awk '/^GITHUB_TOKEN=/{sub(/^GITHUB_TOKEN=/, ""); print; exit}' ../local.env.txt)"
```

Run the guarded deploy entrypoint:

```bash
./deploy.sh
```

The script checks Cloudflare identity, required secrets, CI, D1 migrations,
expired report purge, deploy, and production smoke.

When the local machine does not have dependencies installed, push to `main`
with the extracted `GITHUB_TOKEN` and let `.github/workflows/deploy-cloudflare.yml`
run CI, D1 migrations, Worker deploy, secret configuration, and redeploy using
GitHub repository secrets.

## 5. Production Smoke

After deploy, verify:

```bash
CLOAKBROWSER_BASE_URL=https://cloakbrowser.org pnpm smoke:production
CLOAKBROWSER_BASE_URL=https://cloakbrowser.org CLOAKBROWSER_QA_REQUIRE_SHARE=1 pnpm qa:browser
```

The smoke run must prove:

- Public HTML pages return success.
- `robots.txt` and sitemap XML are reachable.
- `/api/ip`, `/api/health`, and `/api/ready` return valid JSON.
- `POST /api/report` creates a redacted shared report.
- `GET /api/report/{id}` reads the created report.
- Browser QA passes on desktop and mobile and confirms the share flow.

## 6. Closeout Evidence

Record:

- Exact deploy command.
- Cloudflare deploy result.
- Smoke and browser QA JSON output.
- Public DNS records observed.
- `/api/ready` response status.
- Any Cloudflare log errors seen during smoke traffic.
