import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateString, validateEnum } from "@/server/validation";
import { getFollowUp, updateFollowUp, deleteFollowUp, validateRecurrenceRule } from "@/server/productivity";

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
    const followUp = await getFollowUp(auth.sub, followUpId);
    if (!followUp) {
      return apiError("NOT_FOUND", "Follow-up not found or belongs to another account.");
    }
    return apiSuccess({ followUp });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve follow-up.");
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

  const { id: followUpId } = await context.params;
  if (!followUpId) {
    return apiError("BAD_REQUEST", "Follow-up ID parameter is required.");
  }

  const parsed = await parseJsonBody<{
    personName?: unknown;
    commitment?: unknown;
    details?: unknown;
    dueAt?: unknown;
    timeZone?: unknown;
    emailAddress?: unknown;
    phoneNumber?: unknown;
    whatsappNumber?: unknown;
    preferredAction?: unknown;
    recurrence?: unknown;
    status?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  if (parsed.data.personName !== undefined) {
    const nameError = validateString(parsed.data.personName, "personName", { required: true, maxLength: 200 });
    if (nameError) validationErrors.push({ field: "personName", message: nameError });
  }

  if (parsed.data.commitment !== undefined) {
    const commitError = validateString(parsed.data.commitment, "commitment", { required: true, maxLength: 1000 });
    if (commitError) validationErrors.push({ field: "commitment", message: commitError });
  }

  if (parsed.data.preferredAction !== undefined && parsed.data.preferredAction !== null) {
    const actError = validateEnum(
      parsed.data.preferredAction,
      "preferredAction",
      ["email", "whatsapp", "phone"] as const
    );
    if (actError) validationErrors.push({ field: "preferredAction", message: actError });
  }

  if (parsed.data.status !== undefined) {
    const statusError = validateEnum(
      parsed.data.status,
      "status",
      ["open", "completed", "archived"] as const
    );
    if (statusError) validationErrors.push({ field: "status", message: statusError });
  }

  if (parsed.data.recurrence !== undefined && parsed.data.recurrence !== null) {
    const recError = validateRecurrenceRule(parsed.data.recurrence);
    if (recError) validationErrors.push({ field: "recurrence", message: recError });
  }

  if (validationErrors.length > 0) {
    return apiError("BAD_REQUEST", "Validation failed", { details: validationErrors });
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const updated = await updateFollowUp(auth.sub, followUpId, {
      personName: typeof parsed.data.personName === "string" ? parsed.data.personName : undefined,
      commitment: typeof parsed.data.commitment === "string" ? parsed.data.commitment : undefined,
      details:
        parsed.data.details === null
          ? null
          : typeof parsed.data.details === "string"
          ? parsed.data.details
          : undefined,
      dueAt: typeof parsed.data.dueAt === "string" ? parsed.data.dueAt : undefined,
      timeZone: typeof parsed.data.timeZone === "string" ? parsed.data.timeZone : undefined,
      emailAddress:
        parsed.data.emailAddress === null
          ? null
          : typeof parsed.data.emailAddress === "string"
          ? parsed.data.emailAddress
          : undefined,
      phoneNumber:
        parsed.data.phoneNumber === null
          ? null
          : typeof parsed.data.phoneNumber === "string"
          ? parsed.data.phoneNumber
          : undefined,
      whatsappNumber:
        parsed.data.whatsappNumber === null
          ? null
          : typeof parsed.data.whatsappNumber === "string"
          ? parsed.data.whatsappNumber
          : undefined,
      preferredAction:
        parsed.data.preferredAction === null
          ? null
          : typeof parsed.data.preferredAction === "string"
          ? parsed.data.preferredAction
          : undefined,
      recurrence: parsed.data.recurrence,
      status: typeof parsed.data.status === "string" ? parsed.data.status : undefined,
    });

    if (!updated) {
      return apiError("NOT_FOUND", "Follow-up not found or belongs to another account.");
    }

    return apiSuccess({ followUp: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to update follow-up.");
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

  const { id: followUpId } = await context.params;
  if (!followUpId) {
    return apiError("BAD_REQUEST", "Follow-up ID parameter is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const deleted = await deleteFollowUp(auth.sub, followUpId);
    if (!deleted) {
      return apiError("NOT_FOUND", "Follow-up not found or already deleted.");
    }

    return apiSuccess({
      success: true,
      message: "Follow-up deleted successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to delete follow-up.");
  }
}
