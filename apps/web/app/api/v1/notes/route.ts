import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateString } from "@/server/validation";
import { listNotes, createNote } from "@/server/productivity";

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
    const notes = await listNotes(auth.sub);
    return apiSuccess({ notes });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve notes.");
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const parsed = await parseJsonBody<{
    id?: unknown;
    title?: unknown;
    body?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  const titleError = validateString(parsed.data.title, "title", { required: true, maxLength: 200 });
  if (titleError) validationErrors.push({ field: "title", message: titleError });

  if (parsed.data.body !== undefined && parsed.data.body !== null) {
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
    const note = await createNote(auth.sub, {
      id: typeof parsed.data.id === "string" ? parsed.data.id : undefined,
      title: String(parsed.data.title),
      body: typeof parsed.data.body === "string" ? parsed.data.body : "",
    });

    return apiSuccess({ note }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to create note.");
  }
}
