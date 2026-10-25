import crypto from "node:crypto";
import { executeQuery, isDatabaseConfigured } from "./db/client";
import {
  type PushSubscriptionRecord,
  type WebPushPayload,
  listPushSubscriptions,
  markSubscriptionExpired,
  sendPushNotification,
} from "./push";
import {
  getEmailLauncherUri,
  getWhatsAppLauncherUri,
  getPhoneLauncherUri,
} from "@/lib/launchers";
import type { FollowUpRecord } from "./productivity";

export interface DispatchSummary {
  evaluatedFollowUps: number;
  dispatchedCount: number;
  skippedCount: number;
  failedCount: number;
  expiredCount: number;
  errors: string[];
}

export function formatNotificationPayload(
  followUp: FollowUpRecord,
  subscription: PushSubscriptionRecord,
  occurrenceId: string
): WebPushPayload {
  const isDetailed = subscription.previewMode === "detailed";

  const title = isDetailed
    ? `Follow up: ${followUp.personName}`
    : "TaskFlow Commitment Due";

  const body = isDetailed
    ? followUp.commitment
    : "You have a Follow Up commitment due.";

  let launcherUri: string | null = null;
  if (followUp.preferredAction === "email" && followUp.emailAddress) {
    launcherUri = getEmailLauncherUri(followUp.emailAddress, followUp.commitment, followUp.personName);
  } else if (followUp.preferredAction === "whatsapp" && followUp.whatsappNumber) {
    launcherUri = getWhatsAppLauncherUri(followUp.whatsappNumber, followUp.commitment, followUp.personName);
  } else if (followUp.preferredAction === "phone" && followUp.phoneNumber) {
    launcherUri = getPhoneLauncherUri(followUp.phoneNumber);
  }

  const actions: Array<{ action: string; title: string }> = [];
  if (followUp.preferredAction === "email") {
    actions.push({ action: "email", title: "Send Email" });
  } else if (followUp.preferredAction === "whatsapp") {
    actions.push({ action: "whatsapp", title: "WhatsApp" });
  } else if (followUp.preferredAction === "phone") {
    actions.push({ action: "phone", title: "Call" });
  }
  actions.push({ action: "view", title: "View Follow Up" });

  return {
    title,
    body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: `followup_${followUp.id}`,
    data: {
      followupId: followUp.id,
      occurrenceId,
      personName: followUp.personName,
      commitment: followUp.commitment,
      preferredAction: followUp.preferredAction,
      launcherUri,
      url: `/followups?id=${encodeURIComponent(followUp.id)}`,
    },
    actions,
  };
}

export async function dispatchDueNotifications(options?: {
  now?: Date;
  accountId?: string;
  dryRun?: boolean;
}): Promise<DispatchSummary> {
  const summary: DispatchSummary = {
    evaluatedFollowUps: 0,
    dispatchedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    expiredCount: 0,
    errors: [],
  };

  if (!isDatabaseConfigured()) {
    return summary;
  }

  const targetDate = options?.now || new Date();
  const dryRun = options?.dryRun ?? false;

  let query = `
    SELECT
      id,
      account_id as "accountId",
      person_name as "personName",
      commitment,
      details,
      due_at as "dueAt",
      time_zone as "timeZone",
      email_address as "emailAddress",
      phone_number as "phoneNumber",
      whatsapp_number as "whatsappNumber",
      preferred_action as "preferredAction",
      recurrence_json as "recurrence",
      status,
      source_note_id as "sourceNoteId",
      source_excerpt as "sourceExcerpt",
      revision,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM followups
    WHERE status = 'open' AND due_at <= $1
  `;
  const params: unknown[] = [targetDate.toISOString()];

  if (options?.accountId) {
    query += " AND account_id = $2";
    params.push(options.accountId);
  }

  query += " ORDER BY due_at ASC";

  const followupsResult = await executeQuery<FollowUpRecord>(query, params);
  const dueFollowUps = followupsResult.rows;
  summary.evaluatedFollowUps = dueFollowUps.length;

  for (const followUp of dueFollowUps) {
    const dueTime = new Date(followUp.dueAt).toISOString();
    const occurrenceId = `occ_${followUp.id}_${dueTime}`;

    const subscriptions = await listPushSubscriptions(followUp.accountId);
    if (!subscriptions || subscriptions.length === 0) {
      continue;
    }

    for (const subscription of subscriptions) {
      // Check if already dispatched to this subscription for this occurrence (idempotent delivery)
      const existingDispatch = await executeQuery<{ id: string }>(
        `SELECT id FROM notification_dispatches
         WHERE account_id = $1 AND followup_id = $2 AND occurrence_id = $3 AND subscription_id = $4`,
        [followUp.accountId, followUp.id, occurrenceId, subscription.id]
      );

      if (existingDispatch.rows.length > 0) {
        summary.skippedCount++;
        continue;
      }

      if (dryRun) {
        summary.dispatchedCount++;
        continue;
      }

      const payload = formatNotificationPayload(followUp, subscription, occurrenceId);
      const sendResult = await sendPushNotification(subscription, payload);

      if (sendResult.success) {
        summary.dispatchedCount++;
        const dispatchId = `disp_${crypto.randomUUID()}`;
        await executeQuery(
          `INSERT INTO notification_dispatches (
             id, account_id, followup_id, occurrence_id, subscription_id, dispatched_at, status
           ) VALUES ($1, $2, $3, $4, $5, NOW(), 'delivered')
           ON CONFLICT (account_id, followup_id, occurrence_id, subscription_id) DO NOTHING`,
          [dispatchId, followUp.accountId, followUp.id, occurrenceId, subscription.id]
        );
      } else if (sendResult.expired) {
        summary.expiredCount++;
        await markSubscriptionExpired(subscription.id);
        const dispatchId = `disp_${crypto.randomUUID()}`;
        await executeQuery(
          `INSERT INTO notification_dispatches (
             id, account_id, followup_id, occurrence_id, subscription_id, dispatched_at, status
           ) VALUES ($1, $2, $3, $4, $5, NOW(), 'expired')
           ON CONFLICT (account_id, followup_id, occurrence_id, subscription_id) DO NOTHING`,
          [dispatchId, followUp.accountId, followUp.id, occurrenceId, subscription.id]
        );
      } else {
        summary.failedCount++;
        const dispatchId = `disp_${crypto.randomUUID()}`;
        await executeQuery(
          `INSERT INTO notification_dispatches (
             id, account_id, followup_id, occurrence_id, subscription_id, dispatched_at, status
           ) VALUES ($1, $2, $3, $4, $5, NOW(), 'failed')
           ON CONFLICT (account_id, followup_id, occurrence_id, subscription_id) DO NOTHING`,
          [dispatchId, followUp.accountId, followUp.id, occurrenceId, subscription.id]
        );
        if (sendResult.error) {
          summary.errors.push(sendResult.error);
        }
      }
    }
  }

  return summary;
}
