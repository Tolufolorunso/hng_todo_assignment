export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds?: number;
}

interface ClientRecord {
  timestamps: number[];
}

const clientRecords = new Map<string, ClientRecord>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "127.0.0.1";
}

export function checkRateLimit(
  key: string,
  options: {
    max?: number;
    windowSeconds?: number;
    nowMs?: number;
  } = {}
): RateLimitResult {
  const max = options.max ?? Number(process.env.API_RATE_LIMIT_MAX ?? 60);
  const windowMs = (options.windowSeconds ?? 60) * 1000;
  const now = options.nowMs ?? Date.now();
  const windowStart = now - windowMs;

  let record = clientRecords.get(key);
  if (!record) {
    record = { timestamps: [] };
    clientRecords.set(key, record);
  }

  // Filter out timestamps older than the sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  const currentCount = record.timestamps.length;
  const allowed = currentCount < max;

  if (allowed) {
    record.timestamps.push(now);
  }

  const remaining = Math.max(0, max - (allowed ? currentCount + 1 : currentCount));
  const oldestTimestamp = record.timestamps[0] ?? now;
  const resetSeconds = Math.max(1, Math.ceil((oldestTimestamp + windowMs - now) / 1000));

  return {
    allowed,
    limit: max,
    remaining,
    resetSeconds,
    ...(allowed ? {} : { retryAfterSeconds: resetSeconds }),
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetSeconds),
  };

  if (!result.allowed && result.retryAfterSeconds !== undefined) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}

export function resetRateLimits(): void {
  clientRecords.clear();
}
