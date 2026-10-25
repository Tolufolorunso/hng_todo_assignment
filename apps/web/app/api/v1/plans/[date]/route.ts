import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { validateDateFormat } from "@/server/validation";
import { getDailyPlanByDate } from "@/server/productivity";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ date: string }> }
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const { date: planDate } = await context.params;
  const dateError = validateDateFormat(planDate, "date", true);
  if (dateError) {
    return apiError("BAD_REQUEST", dateError);
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const plan = await getDailyPlanByDate(auth.sub, planDate);
    if (!plan) {
      return apiError("NOT_FOUND", `Daily plan for date ${planDate} not found.`);
    }
    return apiSuccess({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve daily plan.");
  }
}
