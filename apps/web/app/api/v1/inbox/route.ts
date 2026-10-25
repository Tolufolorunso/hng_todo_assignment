import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateString } from "@/server/validation";
import { listInboxCaptures, createInboxCapture } from "@/server/productivity";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? undefined;

  try {
    const captures = await listInboxCaptures(auth.sub, state);
    return apiSuccess({ captures });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve inbox captures.");
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const parsed = await parseJsonBody<{
    id?: unknown;
    text?: unknown;
    sharedUrl?: unknown;
    sourceAppLabel?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  const textError = validateString(parsed.data.text, "text", { required: true, maxLength: 20000 });
  if (textError) validationErrors.push({ field: "text", message: textError });

  if (parsed.data.sharedUrl !== undefined && parsed.data.sharedUrl !== null) {
    const urlError = validateString(parsed.data.sharedUrl, "sharedUrl", { maxLength: 2048 });
    if (urlError) validationErrors.push({ field: "sharedUrl", message: urlError });
  }

  if (parsed.data.sourceAppLabel !== undefined && parsed.data.sourceAppLabel !== null) {
    const labelError = validateString(parsed.data.sourceAppLabel, "sourceAppLabel", { maxLength: 100 });
    if (labelError) validationErrors.push({ field: "sourceAppLabel", message: labelError });
  }

  if (validationErrors.length > 0) {
    return apiError("BAD_REQUEST", "Validation failed", { details: validationErrors });
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const capture = await createInboxCapture(auth.sub, {
      id: typeof parsed.data.id === "string" ? parsed.data.id : undefined,
      text: String(parsed.data.text),
      sharedUrl: typeof parsed.data.sharedUrl === "string" ? parsed.data.sharedUrl : null,
      sourceAppLabel: typeof parsed.data.sourceAppLabel === "string" ? parsed.data.sourceAppLabel : null,
    });

    return apiSuccess({ capture }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to create inbox capture.");
  }
}
