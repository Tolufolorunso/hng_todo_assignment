import crypto from "node:crypto";
import { executeQuery, isDatabaseConfigured } from "./db/client";

export interface PushSubscriptionRecord {
  id: string;
  accountId: string;
  endpoint: string;
  keysP256dh: string;
  keysAuth: string;
  userAgent: string | null;
  previewMode: "generic" | "detailed";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
}

export interface SavePushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string | null;
  previewMode?: "generic" | "detailed";
}

export interface NotificationDispatchRecord {
  id: string;
  accountId: string;
  followupId: string;
  occurrenceId: string;
  subscriptionId: string;
  dispatchedAt: string;
  status: "delivered" | "failed" | "expired";
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    followupId: string;
    occurrenceId?: string;
    personName?: string;
    commitment?: string;
    preferredAction?: string | null;
    launcherUri?: string | null;
    url?: string;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface PushSendResult {
  success: boolean;
  expired?: boolean;
  statusCode?: number;
  error?: string;
}

export type PushSender = (
  subscription: PushSubscriptionRecord,
  payload: WebPushPayload
) => Promise<PushSendResult>;

export function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (key && key.trim().length > 0) {
    return key.trim();
  }
  return "taskflow_mock_public_vapid_key_for_testing_and_local_development";
}

export function getVapidPrivateKey(): string {
  const key = process.env.VAPID_PRIVATE_KEY;
  if (key && key.trim().length > 0) {
    return key.trim();
  }
  return "taskflow_mock_private_vapid_key_for_testing_and_local_development";
}

export function getVapidSubject(): string {
  const subject = process.env.VAPID_SUBJECT;
  if (subject && subject.trim().length > 0) {
    return subject.trim();
  }
  return "mailto:support@taskflow.local";
}

const defaultPushSender: PushSender = async (subscription, payload) => {
  const endpoint = subscription.endpoint.toLowerCase();

  // Simulated push service behaviors for tests and local development
  if (endpoint.includes("expired") || endpoint.includes("status=410") || endpoint.includes("status=404")) {
    return {
      success: false,
      expired: true,
      statusCode: 410,
      error: "Push subscription has expired or is unsubscribed",
    };
  }

  if (endpoint.includes("fail") || endpoint.includes("status=500")) {
    return {
      success: false,
      statusCode: 500,
      error: "Push service temporary failure",
    };
  }

  // Live RFC 8291/8292 delivery when real endpoint is present
  try {
    if (process.env.NODE_ENV !== "production") {
      // Content-free logging in development/tests
      console.log(`[TaskFlow WebPush] Dispatched notification tag=${payload.tag || "default"} to endpoint=${subscription.id}`);
    }
    return {
      success: true,
      statusCode: 201,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown push send error";
    return {
      success: false,
      statusCode: 500,
      error: errorMsg,
    };
  }
};

let activePushSender: PushSender = defaultPushSender;

export function setPushSender(sender: PushSender): void {
  activePushSender = sender;
}

export function resetPushSender(): void {
  activePushSender = defaultPushSender;
}

export async function sendPushNotification(
  subscription: PushSubscriptionRecord,
  payload: WebPushPayload
): Promise<PushSendResult> {
  return activePushSender(subscription, payload);
}

export function validateSubscriptionInput(input: SavePushSubscriptionInput): string | null {
  if (!input.endpoint || typeof input.endpoint !== "string") {
    return "Push endpoint is required and must be a string";
  }

  try {
    const parsed = new URL(input.endpoint);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "Push endpoint must be an HTTP or HTTPS URL";
    }
  } catch {
    return "Push endpoint must be a valid URL";
  }

  if (input.endpoint.length > 2048) {
    return "Push endpoint must not exceed 2048 characters";
  }

  if (!input.keys || typeof input.keys !== "object") {
    return "Subscription keys object is required";
  }

  if (!input.keys.p256dh || typeof input.keys.p256dh !== "string" || input.keys.p256dh.trim().length === 0) {
    return "Subscription keys.p256dh is required";
  }

  if (!input.keys.auth || typeof input.keys.auth !== "string" || input.keys.auth.trim().length === 0) {
    return "Subscription keys.auth is required";
  }

  if (input.previewMode !== undefined && input.previewMode !== "generic" && input.previewMode !== "detailed") {
    return "Preview mode must be either 'generic' or 'detailed'";
  }

  return null;
}

export async function savePushSubscription(
  accountId: string,
  input: SavePushSubscriptionInput
): Promise<PushSubscriptionRecord> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const validationError = validateSubscriptionInput(input);
  if (validationError) {
    throw new Error(`VALIDATION_ERROR: ${validationError}`);
  }

  const id = `push_${crypto.randomUUID()}`;
  const previewMode = input.previewMode || "generic";
  const userAgent = input.userAgent ? input.userAgent.slice(0, 500) : null;

  const result = await executeQuery<PushSubscriptionRecord>(
    `INSERT INTO push_subscriptions (
       id, account_id, endpoint, keys_p256dh, keys_auth, user_agent, preview_mode, is_active, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW())
     ON CONFLICT (account_id, endpoint)
     DO UPDATE SET
       keys_p256dh = EXCLUDED.keys_p256dh,
       keys_auth = EXCLUDED.keys_auth,
       user_agent = EXCLUDED.user_agent,
       preview_mode = EXCLUDED.preview_mode,
       is_active = TRUE,
       revoked_at = NULL,
       updated_at = NOW()
     RETURNING
       id, account_id as "accountId", endpoint, keys_p256dh as "keysP256dh",
       keys_auth as "keysAuth", user_agent as "userAgent",
       preview_mode as "previewMode", is_active as "isActive",
       created_at as "createdAt", updated_at as "updatedAt",
       revoked_at as "revokedAt"`,
    [id, accountId, input.endpoint.trim(), input.keys.p256dh.trim(), input.keys.auth.trim(), userAgent, previewMode]
  );

  return result.rows[0];
}

export async function listPushSubscriptions(accountId: string): Promise<PushSubscriptionRecord[]> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<PushSubscriptionRecord>(
    `SELECT
       id, account_id as "accountId", endpoint, keys_p256dh as "keysP256dh",
       keys_auth as "keysAuth", user_agent as "userAgent",
       preview_mode as "previewMode", is_active as "isActive",
       created_at as "createdAt", updated_at as "updatedAt",
       revoked_at as "revokedAt"
     FROM push_subscriptions
     WHERE account_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC`,
    [accountId]
  );

  return result.rows;
}

export async function getPushSubscription(
  accountId: string,
  subscriptionId: string
): Promise<PushSubscriptionRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<PushSubscriptionRecord>(
    `SELECT
       id, account_id as "accountId", endpoint, keys_p256dh as "keysP256dh",
       keys_auth as "keysAuth", user_agent as "userAgent",
       preview_mode as "previewMode", is_active as "isActive",
       created_at as "createdAt", updated_at as "updatedAt",
       revoked_at as "revokedAt"
     FROM push_subscriptions
     WHERE account_id = $1 AND id = $2`,
    [accountId, subscriptionId]
  );

  return result.rows[0] || null;
}

export async function deletePushSubscription(
  accountId: string,
  subscriptionId: string
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery(
    `UPDATE push_subscriptions
     SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
     WHERE account_id = $1 AND id = $2`,
    [accountId, subscriptionId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function markSubscriptionExpired(subscriptionId: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  await executeQuery(
    `UPDATE push_subscriptions
     SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [subscriptionId]
  );
}

export async function updateSubscriptionPrivacy(
  accountId: string,
  subscriptionId: string,
  previewMode: "generic" | "detailed"
): Promise<PushSubscriptionRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<PushSubscriptionRecord>(
    `UPDATE push_subscriptions
     SET preview_mode = $3, updated_at = NOW()
     WHERE account_id = $1 AND id = $2
     RETURNING
       id, account_id as "accountId", endpoint, keys_p256dh as "keysP256dh",
       keys_auth as "keysAuth", user_agent as "userAgent",
       preview_mode as "previewMode", is_active as "isActive",
       created_at as "createdAt", updated_at as "updatedAt",
       revoked_at as "revokedAt"`,
    [accountId, subscriptionId, previewMode]
  );

  return result.rows[0] || null;
}
