import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const workerDir = join(root, "apps/web/dist/_worker.js");
const generatedWorker = join(workerDir, "index.js");
const wrapperPath = join(workerDir, "scheduled-worker.js");

if (!existsSync(generatedWorker)) {
  throw new Error(`Astro Cloudflare worker output not found: ${generatedWorker}`);
}

mkdirSync(dirname(wrapperPath), { recursive: true });

writeFileSync(
  wrapperPath,
  `import worker from "./index.js";

async function purgeExpiredReports(env) {
  if (!env.REPORTS) {
    console.error("[scheduled] REPORTS D1 binding is missing.");
    return;
  }

  const result = await env.REPORTS
    .prepare("DELETE FROM reports WHERE expires_at <= ?")
    .bind(new Date().toISOString())
    .run();
  console.log("[scheduled] expired report purge complete", result.meta ?? {});
}

export default {
  ...worker,
  async scheduled(controller, env, ctx) {
    if (controller.cron === "17 3 * * *") {
      ctx.waitUntil(purgeExpiredReports(env));
    }
  }
};
`
);

console.log(`[cloudflare-wrapper] wrote ${wrapperPath}`);
