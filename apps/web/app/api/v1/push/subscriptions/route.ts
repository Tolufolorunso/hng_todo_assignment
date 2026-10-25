import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody } from "@/server/validation";
import {
  listPushSubscriptions,
  savePushSubscription,
  validateSubscriptionInput,
  type SavePushSubscriptionInput,
} from "@/server/push";

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
    const subscriptions = await listPushSubscriptions(auth.sub);
    return apiSuccess({ subscriptions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve push subscriptions.");
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  const parsed = await parseJsonBody<SavePushSubscriptionInput>(request);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  const validationError = validateSubscriptionInput(parsed.data);
  if (validationError) {
    return apiError("BAD_REQUEST", validationError);
  }

  try {
    const subscription = await savePushSubscription(auth.sub, parsed.data);
    return apiSuccess({ subscription }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    if (message.includes("VALIDATION_ERROR")) {
      return apiError("BAD_REQUEST", message.replace("VALIDATION_ERROR: ", ""));
    }
    return apiError("INTERNAL_ERROR", "Failed to register push subscription.");
  }
}
