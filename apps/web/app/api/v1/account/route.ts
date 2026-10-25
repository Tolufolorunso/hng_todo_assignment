import { apiError, apiSuccess } from "@/server/errors";
import {
  authenticateRequest,
  getAccountProfile,
  deleteAccount,
} from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";

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
    const profile = await getAccountProfile(auth.sub);
    if (!profile) {
      return apiError("NOT_FOUND", "Account profile not found or account was deleted.");
    }

    return apiSuccess({
      account: profile,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve account profile.");
  }
}

export async function DELETE(request: Request): Promise<Response> {
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
    const deleted = await deleteAccount(auth.sub);
    if (!deleted) {
      return apiError("NOT_FOUND", "Account not found or already deleted.");
    }

    return apiSuccess({
      success: true,
      message: "Account and associated sessions deleted successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to delete account.");
  }
}
