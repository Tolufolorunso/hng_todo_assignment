import { apiError, apiSuccess } from "@/server/errors";
import {
  authenticateRequest,
  listSessions,
  revokeAllSessions,
} from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError(
      "UNAUTHORIZED",
      "Authentication required. Please provide a valid Bearer token."
    );
  }

  if (!isDatabaseConfigured()) {
    return apiError(
      "DATABASE_UNAVAILABLE",
      "Database connection is not configured on this server."
    );
  }

  try {
    const sessions = await listSessions(auth.sub, auth.sid);
    return apiSuccess({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve account sessions.");
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError(
      "UNAUTHORIZED",
      "Authentication required. Please provide a valid Bearer token."
    );
  }

  if (!isDatabaseConfigured()) {
    return apiError(
      "DATABASE_UNAVAILABLE",
      "Database connection is not configured on this server."
    );
  }

  let keepCurrent = true;
  const parsed = await parseJsonBody<{ keepCurrent?: boolean }>(request);
  if (parsed.success && typeof parsed.data.keepCurrent === "boolean") {
    keepCurrent = parsed.data.keepCurrent;
  }

  try {
    const revokedCount = await revokeAllSessions(
      auth.sub,
      keepCurrent ? auth.sid : undefined
    );

    return apiSuccess({
      success: true,
      message: keepCurrent
        ? "Revoked all other active sessions"
        : "Revoked all active sessions",
      revokedCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to revoke account sessions.");
  }
}
