import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateEnum, validateString } from "@/server/validation";
import { getInboxCapture, updateInboxCapture, deleteInboxCapture } from "@/server/productivity";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const { id: captureId } = await context.params;
  if (!captureId) {
    return apiError("BAD_REQUEST", "Capture ID parameter is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const capture = await getInboxCapture(auth.sub, captureId);
    if (!capture) {
      return apiError("NOT_FOUND", "Inbox capture not found or belongs to another account.");
    }
    return apiSuccess({ capture });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve inbox capture.");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const { id: captureId } = await context.params;
  if (!captureId) {
    return apiError("BAD_REQUEST", "Capture ID parameter is required.");
  }

  const parsed = await parseJsonBody<{
    state?: unknown;
    targetType?: unknown;
    targetId?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  if (parsed.data.state !== undefined) {
    const stateError = validateEnum(
      parsed.data.state,
      "state",
      ["pending", "processed", "discarded"] as const
    );
    if (stateError) validationErrors.push({ field: "state", message: stateError });
  }

  if (parsed.data.targetType !== undefined && parsed.data.targetType !== null) {
    const targetError = validateEnum(
      parsed.data.targetType,
      "targetType",
      ["task", "note", "followup"] as const
    );
    if (targetError) validationErrors.push({ field: "targetType", message: targetError });
  }

  if (parsed.data.targetId !== undefined && parsed.data.targetId !== null) {
    const idError = validateString(parsed.data.targetId, "targetId", { maxLength: 64 });
    if (idError) validationErrors.push({ field: "targetId", message: idError });
  }

  if (validationErrors.length > 0) {
    return apiError("BAD_REQUEST", "Validation failed", { details: validationErrors });
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const updated = await updateInboxCapture(auth.sub, captureId, {
      state: typeof parsed.data.state === "string" ? parsed.data.state : undefined,
      targetType:
        parsed.data.targetType === null
          ? null
          : typeof parsed.data.targetType === "string"
          ? parsed.data.targetType
          : undefined,
      targetId:
        parsed.data.targetId === null
          ? null
          : typeof parsed.data.targetId === "string"
          ? parsed.data.targetId
          : undefined,
    });

    if (!updated) {
      return apiError("NOT_FOUND", "Inbox capture not found or belongs to another account.");
    }

    return apiSuccess({ capture: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to update inbox capture.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const { id: captureId } = await context.params;
  if (!captureId) {
    return apiError("BAD_REQUEST", "Capture ID parameter is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const deleted = await deleteInboxCapture(auth.sub, captureId);
    if (!deleted) {
      return apiError("NOT_FOUND", "Inbox capture not found or already deleted.");
    }

    return apiSuccess({
      success: true,
      message: "Inbox capture deleted successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to delete inbox capture.");
  }
}
