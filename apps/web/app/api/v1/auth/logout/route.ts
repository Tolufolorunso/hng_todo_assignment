import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest, revokeSession } from "@/server/auth";
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

  if (isDatabaseConfigured()) {
    try {
      await revokeSession(auth.sid, auth.sub);
    } catch {
      // In case of transient error, still acknowledge client logout intent
    }
  }

  return apiSuccess({
    success: true,
    message: "Logged out successfully",
  });
}
