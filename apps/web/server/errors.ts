export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFLICT"
  | "UNPROCESSABLE_ENTITY"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "DATABASE_UNAVAILABLE";

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}

const DEFAULT_STATUS_MAP: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  DATABASE_UNAVAILABLE: 503,
};

export function createErrorPayload(
  code: ApiErrorCode,
  message: string,
  details?: unknown
): ApiErrorPayload {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      timestamp: new Date().toISOString(),
    },
  };
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  options: {
    status?: number;
    details?: unknown;
    headers?: Record<string, string>;
  } = {}
): Response {
  const status = options.status ?? DEFAULT_STATUS_MAP[code] ?? 500;
  const payload = createErrorPayload(code, message, options.details);

  const responseHeaders = new Headers(options.headers);
  if (!responseHeaders.has("Content-Type")) {
    responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: responseHeaders,
  });
}

export function apiSuccess<T>(
  data: T,
  options: {
    status?: number;
    headers?: Record<string, string>;
  } = {}
): Response {
  const status = options.status ?? 200;
  const responseHeaders = new Headers(options.headers);
  if (!responseHeaders.has("Content-Type")) {
    responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}
