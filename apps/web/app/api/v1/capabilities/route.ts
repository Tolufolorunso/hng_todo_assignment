import { apiError, apiSuccess } from "@/server/errors";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`capabilities:${ip}`, { max: 120, windowSeconds: 60 });
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return apiError("RATE_LIMITED", "Too many requests to capabilities endpoint", {
      status: 429,
      headers: rateLimitHeaders,
    });
  }

  const payload = {
    version: "1.0.0",
    protocolVersion: 1,
    auth: ["otp"],
    entities: ["tasks", "notes", "followups", "plans", "inbox"],
    limits: {
      taskTitleMaxLength: 200,
      taskDescriptionMaxLength: 20000,
      noteTitleMaxLength: 200,
      noteBodyMaxLength: 50000,
      followupNameMaxLength: 200,
      inboxTextMaxLength: 20000,
    },
  };

  return apiSuccess(payload, {
    status: 200,
    headers: rateLimitHeaders,
  });
}
