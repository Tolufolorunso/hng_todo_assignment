import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateString, validateEnum } from "@/server/validation";
import { listFollowUps, createFollowUp, validateRecurrenceRule } from "@/server/productivity";

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
  const status = url.searchParams.get("status") ?? undefined;

  try {
    const followUps = await listFollowUps(auth.sub, status);
    return apiSuccess({ followUps });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve follow-ups.");
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const parsed = await parseJsonBody<{
    id?: unknown;
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
    sourceNoteId?: unknown;
    sourceExcerpt?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  const nameError = validateString(parsed.data.personName, "personName", { required: true, maxLength: 200 });
  if (nameError) validationErrors.push({ field: "personName", message: nameError });

  const commitError = validateString(parsed.data.commitment, "commitment", { required: true, maxLength: 1000 });
  if (commitError) validationErrors.push({ field: "commitment", message: commitError });

  const dueError = validateString(parsed.data.dueAt, "dueAt", { required: true });
  if (dueError) validationErrors.push({ field: "dueAt", message: dueError });

  if (parsed.data.preferredAction !== undefined && parsed.data.preferredAction !== null) {
    const actError = validateEnum(
      parsed.data.preferredAction,
      "preferredAction",
      ["email", "whatsapp", "phone"] as const
    );
    if (actError) validationErrors.push({ field: "preferredAction", message: actError });
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
    const followUp = await createFollowUp(auth.sub, {
      id: typeof parsed.data.id === "string" ? parsed.data.id : undefined,
      personName: String(parsed.data.personName),
      commitment: String(parsed.data.commitment),
      details: typeof parsed.data.details === "string" ? parsed.data.details : null,
      dueAt: String(parsed.data.dueAt),
      timeZone: typeof parsed.data.timeZone === "string" ? parsed.data.timeZone : "UTC",
      emailAddress: typeof parsed.data.emailAddress === "string" ? parsed.data.emailAddress : null,
      phoneNumber: typeof parsed.data.phoneNumber === "string" ? parsed.data.phoneNumber : null,
      whatsappNumber: typeof parsed.data.whatsappNumber === "string" ? parsed.data.whatsappNumber : null,
      preferredAction: typeof parsed.data.preferredAction === "string" ? parsed.data.preferredAction : null,
      recurrence: parsed.data.recurrence ?? null,
      sourceNoteId: typeof parsed.data.sourceNoteId === "string" ? parsed.data.sourceNoteId : null,
      sourceExcerpt: typeof parsed.data.sourceExcerpt === "string" ? parsed.data.sourceExcerpt : null,
    });

    return apiSuccess({ followUp }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to create follow-up.");
  }
}
