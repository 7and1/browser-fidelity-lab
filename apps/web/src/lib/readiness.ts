export interface ReadinessCheck {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface ReadinessResult {
  ok: boolean;
  checks: ReadinessCheck[];
}

export async function checkReadiness(env: RuntimeEnv): Promise<ReadinessResult> {
  const checks: ReadinessCheck[] = [
    {
      name: "REPORTS_D1_BINDING",
      ok: Boolean(env.REPORTS),
      detail: env.REPORTS ? "D1 binding is present." : "D1 binding REPORTS is missing."
    },
    {
      name: "REPORT_HASH_SECRET",
      ok: Boolean(env.REPORT_HASH_SECRET),
      detail: env.REPORT_HASH_SECRET ? "Report hash secret is configured." : "REPORT_HASH_SECRET is missing."
    }
  ];

  if (env.REPORTS) {
    try {
      await env.REPORTS.prepare("SELECT 1 AS ok").first();
      checks.push({ name: "REPORTS_D1_QUERY", ok: true, detail: "D1 read probe succeeded." });
    } catch (error) {
      checks.push({
        name: "REPORTS_D1_QUERY",
        ok: false,
        detail: error instanceof Error ? error.message : "D1 read probe failed."
      });
    }
  }

  return {
    ok: checks.every((check) => check.ok),
    checks
  };
}
