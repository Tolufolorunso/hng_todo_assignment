import { apiError, apiSuccess } from "@/server/errors";
import { parseJsonBody, validateEmail } from "@/server/validation";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/server/rate-limit";
import { isDatabaseConfigured } from "@/server/db/client";
import { requestOtpCode } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`otp_req:${ip}`, {
    max: 5,
    windowSeconds: 900, // 15 minutes
  });

  const rateHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many verification code requests. Please try again later.",
      { headers: rateHeaders }
    );
  }

  const parsed = await parseJsonBody<{ email?: unknown }>(request);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error, { headers: rateHeaders });
  }

  const emailError = validateEmail(parsed.data.email);
  if (emailError) {
    return apiError("BAD_REQUEST", emailError, {
      details: [{ field: "email", message: emailError }],
      headers: rateHeaders,
    });
  }

  const email = String(parsed.data.email).trim().toLowerCase();

  if (!isDatabaseConfigured()) {
    return apiError(
      "DATABASE_UNAVAILABLE",
      "Database connection is not configured on this server.",
      { headers: rateHeaders }
    );
  }

  try {
    const { expiresAt } = await requestOtpCode(email);
    const expiresInSeconds = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000));

    return apiSuccess(
      {
        success: true,
        message: "Verification code sent if account is eligible",
        expiresInSeconds,
      },
      { headers: rateHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message, { headers: rateHeaders });
    }
    return apiError("INTERNAL_ERROR", "Failed to process verification code request.", {
      headers: rateHeaders,
    });
  }
}
