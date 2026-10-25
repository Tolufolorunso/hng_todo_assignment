import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody } from "@/server/validation";
import { getTaskOrder, setTaskOrder } from "@/server/productivity";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const taskIds = await getTaskOrder(auth.sub);
    return apiSuccess({ taskIds });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve task order.");
  }
}

export async function PUT(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const parsed = await parseJsonBody<{ taskIds?: unknown }>(request);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  if (!Array.isArray(parsed.data.taskIds) || !parsed.data.taskIds.every((id) => typeof id === "string")) {
    return apiError("BAD_REQUEST", "taskIds must be an array of string task IDs.", {
      details: [{ field: "taskIds", message: "taskIds must be an array of string task IDs." }],
    });
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const result = await setTaskOrder(auth.sub, parsed.data.taskIds);
    return apiSuccess({
      taskIds: result.taskIds,
      revision: result.revision,
      updatedAt: result.updatedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to update task order.");
  }
}
