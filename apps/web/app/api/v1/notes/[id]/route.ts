import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateString } from "@/server/validation";
import { getNote, updateNote, deleteNote } from "@/server/productivity";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const { id: noteId } = await context.params;
  if (!noteId) {
    return apiError("BAD_REQUEST", "Note ID parameter is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const note = await getNote(auth.sub, noteId);
    if (!note) {
      return apiError("NOT_FOUND", "Note not found or belongs to another account.");
    }
    return apiSuccess({ note });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve note.");
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

  const { id: noteId } = await context.params;
  if (!noteId) {
    return apiError("BAD_REQUEST", "Note ID parameter is required.");
  }

  const parsed = await parseJsonBody<{
    title?: unknown;
    body?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  if (parsed.data.title !== undefined) {
    const titleError = validateString(parsed.data.title, "title", { required: true, maxLength: 200 });
    if (titleError) validationErrors.push({ field: "title", message: titleError });
  }

  if (parsed.data.body !== undefined) {
    const bodyError = validateString(parsed.data.body, "body", { maxLength: 50000 });
    if (bodyError) validationErrors.push({ field: "body", message: bodyError });
  }

  if (validationErrors.length > 0) {
    return apiError("BAD_REQUEST", "Validation failed", { details: validationErrors });
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const updated = await updateNote(auth.sub, noteId, {
      title: typeof parsed.data.title === "string" ? parsed.data.title : undefined,
      body: typeof parsed.data.body === "string" ? parsed.data.body : undefined,
    });

    if (!updated) {
      return apiError("NOT_FOUND", "Note not found or belongs to another account.");
    }

    return apiSuccess({ note: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to update note.");
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

  const { id: noteId } = await context.params;
  if (!noteId) {
    return apiError("BAD_REQUEST", "Note ID parameter is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const deleted = await deleteNote(auth.sub, noteId);
    if (!deleted) {
      return apiError("NOT_FOUND", "Note not found or already deleted.");
    }

    return apiSuccess({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to delete note.");
  }
}
