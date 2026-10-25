import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest, revokeSession } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError(
      "UNAUTHORIZED",
      "Authentication required. Please provide a valid Bearer token."
    );
  }

  const { id: sessionId } = await context.params;
  if (!sessionId) {
    return apiError("BAD_REQUEST", "Session ID parameter is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError(
      "DATABASE_UNAVAILABLE",
      "Database connection is not configured on this server."
    );
  }

  try {
    const revoked = await revokeSession(sessionId, auth.sub);
    if (!revoked) {
      return apiError(
        "NOT_FOUND",
        "Session not found, already revoked, or belongs to another account."
      );
    }

    return apiSuccess({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to revoke session.");
  }
}
