import { apiError, apiSuccess } from "@/server/errors";
import { parseJsonBody, validateEmail, validateString, validateEnum } from "@/server/validation";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from "@/server/rate-limit";
import { isDatabaseConfigured } from "@/server/db/client";
import {
  verifyOtpCode,
  findOrCreateAccount,
  createSession,
  createAccessToken,
} from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`otp_verify:${ip}`, {
    max: 10,
    windowSeconds: 900,
  });

  const rateHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many verification attempts. Please try again later.",
      { headers: rateHeaders }
    );
  }

  const parsed = await parseJsonBody<{
    email?: unknown;
    code?: unknown;
    clientPlatform?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error, { headers: rateHeaders });
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  const emailError = validateEmail(parsed.data.email);
  if (emailError) {
    validationErrors.push({ field: "email", message: emailError });
  }

  const codeError = validateString(parsed.data.code, "code", {
    required: true,
    minLength: 6,
    maxLength: 6,
  });
  if (codeError) {
    validationErrors.push({ field: "code", message: codeError });
  }

  const platform = parsed.data.clientPlatform ?? "web";
  const platformError = validateEnum(platform, "clientPlatform", ["web", "mobile", "windows"] as const);
  if (platformError) {
    validationErrors.push({ field: "clientPlatform", message: platformError });
  }

  if (validationErrors.length > 0) {
    return apiError("BAD_REQUEST", "Validation failed", {
      details: validationErrors,
      headers: rateHeaders,
    });
  }

  const email = String(parsed.data.email).trim().toLowerCase();
  const code = String(parsed.data.code).trim();
  const clientPlatform = String(platform);
  const userAgent = request.headers.get("user-agent") ?? null;

  if (!isDatabaseConfigured()) {
    return apiError(
      "DATABASE_UNAVAILABLE",
      "Database connection is not configured on this server.",
      { headers: rateHeaders }
    );
  }

  try {
    const verification = await verifyOtpCode(email, code);

    if (!verification.success) {
      if (verification.error === "EXPIRED_OR_NOT_FOUND") {
        return apiError(
          "BAD_REQUEST",
          "Verification code expired or not found. Please request a new code.",
          { headers: rateHeaders }
        );
      }
      if (verification.error === "TOO_MANY_ATTEMPTS") {
        return apiError(
          "BAD_REQUEST",
          "Too many failed verification attempts. This code is no longer valid.",
          { headers: rateHeaders }
        );
      }

      return apiError("UNAUTHORIZED", "Invalid verification code.", {
        details: { attemptsRemaining: verification.attemptsRemaining },
        headers: rateHeaders,
      });
    }

    const { account } = await findOrCreateAccount(email);
    const { sessionId, refreshToken } = await createSession(
      account.id,
      clientPlatform,
      userAgent
    );

    const accessToken = createAccessToken({
      accountId: account.id,
      sessionId,
      email: account.email,
    });

    return apiSuccess(
      {
        accessToken,
        refreshToken,
        expiresIn: 900,
        account: {
          id: account.id,
          email: account.email,
          createdAt: account.createdAt,
        },
      },
      { headers: rateHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message, { headers: rateHeaders });
    }
    return apiError("INTERNAL_ERROR", "Failed to verify code and authenticate.", {
      headers: rateHeaders,
    });
  }
}
