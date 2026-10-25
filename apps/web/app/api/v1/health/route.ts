import { checkDatabaseHealth } from "@/server/db/client";
import { apiError, apiSuccess } from "@/server/errors";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`health:${ip}`, { max: 120, windowSeconds: 60 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests to health endpoint", {
      status: 429,
      headers: rateLimitHeaders,
    });
  }

  const dbHealth = await checkDatabaseHealth();
  const overallStatus = dbHealth.status === "disconnected" ? "degraded" : "ok";

  const payload = {
    status: overallStatus,
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: dbHealth,
  };

  return apiSuccess(payload, {
    status: 200,
    headers: rateLimitHeaders,
  });
}
