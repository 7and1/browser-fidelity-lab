import type { BrowserSignalReport, FidelityScore, ReportEnvelope } from "@browser-fidelity/fidelity-core";
import { redactReportForStorage } from "@browser-fidelity/fidelity-core";

interface StoredReportRow {
  id: string;
  created_at: string;
  expires_at: string;
  report_json: string;
  score_json: string;
}

interface CountRow {
  count: number;
}

const defaultTtlDays = 7;
const defaultReportsPerDay = 30;

export function reportTtlDays(env: RuntimeEnv): number {
  const parsed = Number(env.REPORT_TTL_DAYS ?? "");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultTtlDays;
}

export function reportRateLimit(env: RuntimeEnv): number {
  const parsed = Number(env.REPORTS_PER_DAY ?? "");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultReportsPerDay;
}

export async function createReport(
  env: RuntimeEnv,
  report: BrowserSignalReport,
  score: FidelityScore,
  request: Request
): Promise<ReportEnvelope> {
  if (!env.REPORTS) {
    throw new Error("D1 binding REPORTS is not configured.");
  }

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + reportTtlDays(env) * 24 * 60 * 60 * 1000);
  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
  const visitorHash = await hashVisitor(env, request, createdAt);
  await enforceReportLimit(env, visitorHash, createdAt);
  const safeReport = redactReportForStorage(report);

  await env.REPORTS.prepare(
    "INSERT INTO reports (id, created_at, expires_at, visitor_hash, report_json, score_json) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(
      id,
      createdAt.toISOString(),
      expiresAt.toISOString(),
      visitorHash,
      JSON.stringify(safeReport),
      JSON.stringify(score)
    )
    .run();

  return {
    id,
    report: safeReport,
    score,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };
}

export async function getReport(env: RuntimeEnv, id: string): Promise<ReportEnvelope | undefined> {
  if (!env.REPORTS) {
    throw new Error("D1 binding REPORTS is not configured.");
  }

  const row = await env.REPORTS.prepare(
    "SELECT id, created_at, expires_at, report_json, score_json FROM reports WHERE id = ? AND expires_at > ?"
  )
    .bind(id, new Date().toISOString())
    .first<StoredReportRow>();

  if (!row) return undefined;

  return {
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    report: JSON.parse(row.report_json) as BrowserSignalReport,
    score: JSON.parse(row.score_json) as FidelityScore
  };
}

export async function purgeExpiredReports(env: RuntimeEnv, now = new Date()): Promise<number | undefined> {
  if (!env.REPORTS) {
    throw new Error("D1 binding REPORTS is not configured.");
  }

  const result = await env.REPORTS.prepare("DELETE FROM reports WHERE expires_at <= ?").bind(now.toISOString()).run();
  const meta = result.meta;
  if (meta && typeof meta === "object" && "changes" in meta && typeof meta.changes === "number") {
    return meta.changes;
  }
  return undefined;
}

async function enforceReportLimit(env: RuntimeEnv, visitorHash: string, createdAt: Date): Promise<void> {
  const since = new Date(createdAt.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const row = await env.REPORTS!.prepare(
    "SELECT COUNT(*) AS count FROM reports WHERE visitor_hash = ? AND created_at >= ?"
  )
    .bind(visitorHash, since)
    .first<CountRow>();

  if ((row?.count ?? 0) >= reportRateLimit(env)) {
    throw new Error("Report creation limit reached for this browser. Try again later.");
  }
}

async function hashVisitor(env: RuntimeEnv, request: Request, date: Date): Promise<string> {
  const secret = env.REPORT_HASH_SECRET;
  if (!secret) {
    throw new Error("REPORT_HASH_SECRET is not configured.");
  }

  const ip =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  const day = date.toISOString().slice(0, 10);
  const bytes = new TextEncoder().encode(`${day}|${ip}|${ua}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
