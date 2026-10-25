import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest, revokeAllSessions } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";

export const dynamic = "force-dynamic";

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

  try {
    const revokedCount = await revokeAllSessions(auth.sub, auth.sid);

    return apiSuccess({
      success: true,
      message: "Revoked all other active sessions successfully",
      revokedCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to revoke active sessions.");
  }
}
