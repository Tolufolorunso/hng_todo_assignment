import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateString, validateEnum, validateInteger, validateDateFormat } from "@/server/validation";
import { listTasks, createTask } from "@/server/productivity";

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
  const completedParam = url.searchParams.get("completed");
  const category = url.searchParams.get("category") ?? undefined;
  const priority = url.searchParams.get("priority") ?? undefined;

  let completed: boolean | undefined = undefined;
  if (completedParam === "true") completed = true;
  if (completedParam === "false") completed = false;

  try {
    const tasks = await listTasks(auth.sub, { completed, category, priority });
    return apiSuccess({ tasks });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve tasks.");
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
    description?: unknown;
    completed?: unknown;
    priority?: unknown;
    dueDate?: unknown;
    category?: unknown;
    estimatedMinutes?: unknown;
    sourceNoteId?: unknown;
    sourceExcerpt?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  const titleError = validateString(parsed.data.title, "title", { required: true, maxLength: 200 });
  if (titleError) validationErrors.push({ field: "title", message: titleError });

  if (parsed.data.description !== undefined && parsed.data.description !== null) {
    const descError = validateString(parsed.data.description, "description", { maxLength: 20000 });
    if (descError) validationErrors.push({ field: "description", message: descError });
  }

  if (parsed.data.priority !== undefined) {
    const prioError = validateEnum(
      parsed.data.priority,
      "priority",
      ["low", "medium", "high", "urgent"] as const
    );
    if (prioError) validationErrors.push({ field: "priority", message: prioError });
  }

  if (parsed.data.dueDate !== undefined && parsed.data.dueDate !== null && parsed.data.dueDate !== "") {
    const dateError = validateDateFormat(parsed.data.dueDate, "dueDate");
    if (dateError) validationErrors.push({ field: "dueDate", message: dateError });
  }

  if (parsed.data.estimatedMinutes !== undefined && parsed.data.estimatedMinutes !== null) {
    const estError = validateInteger(parsed.data.estimatedMinutes, "estimatedMinutes", { min: 1, max: 1440 });
    if (estError) validationErrors.push({ field: "estimatedMinutes", message: estError });
  }

  if (validationErrors.length > 0) {
    return apiError("BAD_REQUEST", "Validation failed", { details: validationErrors });
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const task = await createTask(auth.sub, {
      id: typeof parsed.data.id === "string" ? parsed.data.id : undefined,
      title: String(parsed.data.title),
      description: typeof parsed.data.description === "string" ? parsed.data.description : null,
      completed: typeof parsed.data.completed === "boolean" ? parsed.data.completed : false,
      priority: typeof parsed.data.priority === "string" ? parsed.data.priority : "medium",
      dueDate: typeof parsed.data.dueDate === "string" ? parsed.data.dueDate : null,
      category: typeof parsed.data.category === "string" ? parsed.data.category : null,
      estimatedMinutes: typeof parsed.data.estimatedMinutes === "number" ? parsed.data.estimatedMinutes : null,
      sourceNoteId: typeof parsed.data.sourceNoteId === "string" ? parsed.data.sourceNoteId : null,
      sourceExcerpt: typeof parsed.data.sourceExcerpt === "string" ? parsed.data.sourceExcerpt : null,
    });

    return apiSuccess({ task }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to create task.");
  }
}
