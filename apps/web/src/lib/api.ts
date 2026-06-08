import type { APIContext } from "astro";

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export class ApiHttpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...init?.headers
    }
  });
}

export function errorJson(code: string, message: string, status = 400): Response {
  return json({ error: { code, message } } satisfies ApiError, { status });
}

export function getRuntimeEnv(context: APIContext): RuntimeEnv {
  return (context.locals as { runtime?: { env?: RuntimeEnv } }).runtime?.env ?? {};
}

export function publicError(error: unknown, fallbackCode: string, fallbackMessage: string, fallbackStatus = 500): Response {
  if (error instanceof ApiHttpError) {
    return errorJson(error.code, error.message, error.status);
  }

  console.error(error);
  return errorJson(fallbackCode, fallbackMessage, fallbackStatus);
}

export async function readJsonBody(context: APIContext, maxBytes = 32_768): Promise<unknown> {
  const contentType = context.request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiHttpError("unsupported_media_type", "Request body must use application/json.", 415);
  }

  const contentLength = Number.parseInt(context.request.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ApiHttpError("payload_too_large", `Request body must be ${maxBytes} bytes or smaller.`, 413);
  }

  const text = await context.request.text();
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > maxBytes) {
    throw new ApiHttpError("payload_too_large", `Request body must be ${maxBytes} bytes or smaller.`, 413);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiHttpError("invalid_json", "Request body must be valid JSON.", 400);
  }
}
