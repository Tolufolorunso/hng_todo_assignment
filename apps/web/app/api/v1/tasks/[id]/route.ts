import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateString, validateEnum, validateInteger, validateDateFormat } from "@/server/validation";
import { getTask, updateTask, deleteTask } from "@/server/productivity";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const { id: taskId } = await context.params;
  if (!taskId) {
    return apiError("BAD_REQUEST", "Task ID parameter is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const task = await getTask(auth.sub, taskId);
    if (!task) {
      return apiError("NOT_FOUND", "Task not found or belongs to another account.");
    }
    return apiSuccess({ task });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve task.");
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

  const { id: taskId } = await context.params;
  if (!taskId) {
    return apiError("BAD_REQUEST", "Task ID parameter is required.");
  }

  const parsed = await parseJsonBody<{
    title?: unknown;
    description?: unknown;
    completed?: unknown;
    priority?: unknown;
    dueDate?: unknown;
    category?: unknown;
    estimatedMinutes?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  if (parsed.data.title !== undefined) {
    const titleError = validateString(parsed.data.title, "title", { required: true, maxLength: 200 });
    if (titleError) validationErrors.push({ field: "title", message: titleError });
  }

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
    const updated = await updateTask(auth.sub, taskId, {
      title: typeof parsed.data.title === "string" ? parsed.data.title : undefined,
      description:
        parsed.data.description === null
          ? null
          : typeof parsed.data.description === "string"
          ? parsed.data.description
          : undefined,
      completed: typeof parsed.data.completed === "boolean" ? parsed.data.completed : undefined,
      priority: typeof parsed.data.priority === "string" ? parsed.data.priority : undefined,
      dueDate:
        parsed.data.dueDate === null || parsed.data.dueDate === ""
          ? null
          : typeof parsed.data.dueDate === "string"
          ? parsed.data.dueDate
          : undefined,
      category:
        parsed.data.category === null
          ? null
          : typeof parsed.data.category === "string"
          ? parsed.data.category
          : undefined,
      estimatedMinutes:
        parsed.data.estimatedMinutes === null
          ? null
          : typeof parsed.data.estimatedMinutes === "number"
          ? parsed.data.estimatedMinutes
          : undefined,
    });

    if (!updated) {
      return apiError("NOT_FOUND", "Task not found or belongs to another account.");
    }

    return apiSuccess({ task: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to update task.");
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

  const { id: taskId } = await context.params;
  if (!taskId) {
    return apiError("BAD_REQUEST", "Task ID parameter is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const deleted = await deleteTask(auth.sub, taskId);
    if (!deleted) {
      return apiError("NOT_FOUND", "Task not found or already deleted.");
    }

    return apiSuccess({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to delete task.");
  }
}
