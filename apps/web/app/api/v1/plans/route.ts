import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateDateFormat, validateInteger } from "@/server/validation";
import { listDailyPlans, upsertDailyPlan } from "@/server/productivity";

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
    const plans = await listDailyPlans(auth.sub);
    return apiSuccess({ plans });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve daily plans.");
  }
}

export async function PUT(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const parsed = await parseJsonBody<{
    id?: unknown;
    planDate?: unknown;
    availableMinutes?: unknown;
    items?: unknown;
    status?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  const dateError = validateDateFormat(parsed.data.planDate, "planDate", true);
  if (dateError) validationErrors.push({ field: "planDate", message: dateError });

  const minutesError = validateInteger(parsed.data.availableMinutes, "availableMinutes", {
    required: true,
    min: 0,
    max: 1440,
  });
  if (minutesError) validationErrors.push({ field: "availableMinutes", message: minutesError });

  if (!Array.isArray(parsed.data.items)) {
    validationErrors.push({ field: "items", message: "items must be an array" });
  }

  if (validationErrors.length > 0) {
    return apiError("BAD_REQUEST", "Validation failed", { details: validationErrors });
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const plan = await upsertDailyPlan(auth.sub, {
      id: typeof parsed.data.id === "string" ? parsed.data.id : undefined,
      planDate: String(parsed.data.planDate),
      availableMinutes: Number(parsed.data.availableMinutes),
      items: parsed.data.items as unknown[],
      status: typeof parsed.data.status === "string" ? parsed.data.status : "active",
    });

    return apiSuccess({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to upsert daily plan.");
  }
}
