import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateString } from "@/server/validation";
import { listOccurrences, recordOccurrence } from "@/server/productivity";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const { id: followUpId } = await context.params;
  if (!followUpId) {
    return apiError("BAD_REQUEST", "Follow-up ID parameter is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const occurrences = await listOccurrences(auth.sub, followUpId);
    return apiSuccess({ occurrences });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve occurrences.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const { id: followUpId } = await context.params;
  if (!followUpId) {
    return apiError("BAD_REQUEST", "Follow-up ID parameter is required.");
  }

  const parsed = await parseJsonBody<{
    dueAt?: unknown;
    completedAt?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const dueError = validateString(parsed.data.dueAt, "dueAt", { required: true });
  if (dueError) {
    return apiError("BAD_REQUEST", dueError, { details: [{ field: "dueAt", message: dueError }] });
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const occurrence = await recordOccurrence(
      auth.sub,
      followUpId,
      String(parsed.data.dueAt),
      typeof parsed.data.completedAt === "string" ? parsed.data.completedAt : undefined
    );

    return apiSuccess({ occurrence }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("NOT_FOUND")) {
      return apiError("NOT_FOUND", message);
    }
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to record occurrence.");
  }
}
