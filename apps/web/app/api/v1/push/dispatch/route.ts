import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { dispatchDueNotifications } from "@/server/push-dispatcher";
import { parseJsonBody } from "@/server/validation";

export const dynamic = "force-dynamic";

function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || "taskflow_cron_secret";
  const authHeader = request.headers.get("Authorization");
  const xCronSecret = request.headers.get("x-cron-secret");

  if (xCronSecret && xCronSecret === cronSecret) {
    return true;
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === cronSecret) {
      return true;
    }
  }

  return false;
}

export async function POST(request: Request): Promise<Response> {
  const isCron = isAuthorizedCron(request);
  const auth = isCron ? null : await authenticateRequest(request);

  if (!isCron && !auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Provide valid user Bearer token or Cron secret.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  const parsed = await parseJsonBody<{
    dryRun?: boolean;
    accountId?: string;
  }>(request);

  const dryRun = parsed.success ? parsed.data.dryRun ?? false : false;
  // If invoked by a regular user, lock dispatch to their own account
  const accountId = isCron ? (parsed.success ? parsed.data.accountId : undefined) : auth?.sub;

  try {
    const summary = await dispatchDueNotifications({
      dryRun,
      accountId,
      now: new Date(),
    });

    return apiSuccess({
      success: true,
      dryRun,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to execute notification dispatcher.");
  }
}
