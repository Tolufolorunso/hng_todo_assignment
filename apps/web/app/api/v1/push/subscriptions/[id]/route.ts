import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { deletePushSubscription, getPushSubscription, updateSubscriptionPrivacy } from "@/server/push";
import { parseJsonBody } from "@/server/validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.");
  }

  const { id: subscriptionId } = await context.params;
  if (!subscriptionId) {
    return apiError("BAD_REQUEST", "Subscription ID is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const subscription = await getPushSubscription(auth.sub, subscriptionId);
    if (!subscription || !subscription.isActive) {
      return apiError("NOT_FOUND", "Push subscription not found or inactive.");
    }
    return apiSuccess({ subscription });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to retrieve subscription.");
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

  const { id: subscriptionId } = await context.params;
  if (!subscriptionId) {
    return apiError("BAD_REQUEST", "Subscription ID is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  const parsed = await parseJsonBody<{ previewMode?: string }>(request);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error);
  }

  if (parsed.data.previewMode !== "generic" && parsed.data.previewMode !== "detailed") {
    return apiError("BAD_REQUEST", "Preview mode must be either 'generic' or 'detailed'.");
  }

  try {
    const updated = await updateSubscriptionPrivacy(auth.sub, subscriptionId, parsed.data.previewMode);
    if (!updated) {
      return apiError("NOT_FOUND", "Push subscription not found.");
    }
    return apiSuccess({ subscription: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to update subscription privacy mode.");
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

  const { id: subscriptionId } = await context.params;
  if (!subscriptionId) {
    return apiError("BAD_REQUEST", "Subscription ID is required.");
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.");
  }

  try {
    const deleted = await deletePushSubscription(auth.sub, subscriptionId);
    if (!deleted) {
      return apiError("NOT_FOUND", "Push subscription not found or already deleted.");
    }
    return apiSuccess({ success: true, id: subscriptionId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message);
    }
    return apiError("INTERNAL_ERROR", "Failed to delete push subscription.");
  }
}
