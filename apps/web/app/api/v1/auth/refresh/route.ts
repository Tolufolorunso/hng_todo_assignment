import { apiError, apiSuccess } from "@/server/errors";
import { parseJsonBody, validateString } from "@/server/validation";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/server/rate-limit";
import { isDatabaseConfigured } from "@/server/db/client";
import { rotateRefreshToken, createAccessToken } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`token_refresh:${ip}`, {
    max: 30,
    windowSeconds: 60,
  });

  const rateHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many token refresh requests. Please try again later.",
      { headers: rateHeaders }
    );
  }

  const parsed = await parseJsonBody<{ refreshToken?: unknown }>(request);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error, { headers: rateHeaders });
  }

  const tokenError = validateString(parsed.data.refreshToken, "refreshToken", {
    required: true,
    minLength: 32,
  });

  if (tokenError) {
    return apiError("BAD_REQUEST", tokenError, {
      details: [{ field: "refreshToken", message: tokenError }],
      headers: rateHeaders,
    });
  }

  const refreshToken = String(parsed.data.refreshToken).trim();

  if (!isDatabaseConfigured()) {
    return apiError(
      "DATABASE_UNAVAILABLE",
      "Database connection is not configured on this server.",
      { headers: rateHeaders }
    );
  }

  try {
    const rotated = await rotateRefreshToken(refreshToken);

    if (!rotated) {
      return apiError(
        "UNAUTHORIZED",
        "Invalid, expired, or revoked refresh token. Please sign in again.",
        { headers: rateHeaders }
      );
    }

    const newAccessToken = createAccessToken({
      accountId: rotated.accountId,
      sessionId: rotated.sessionId,
      email: rotated.email,
    });

    return apiSuccess(
      {
        accessToken: newAccessToken,
        refreshToken: rotated.newRefreshToken,
        expiresIn: 900,
      },
      { headers: rateHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message, { headers: rateHeaders });
    }
    return apiError("INTERNAL_ERROR", "Failed to refresh authentication credentials.", {
      headers: rateHeaders,
    });
  }
}
