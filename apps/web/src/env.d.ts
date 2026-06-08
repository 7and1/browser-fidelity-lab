/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta: unknown;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface RuntimeEnv {
  REPORTS?: D1Database;
  REPORT_TTL_DAYS?: string;
  REPORTS_PER_DAY?: string;
  REPORT_HASH_SECRET?: string;
  IPINFO_TOKEN?: string;
  PROXYCHECK_TOKEN?: string;
}
