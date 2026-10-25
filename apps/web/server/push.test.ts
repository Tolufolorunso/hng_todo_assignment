import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  validateSubscriptionInput,
  getVapidPublicKey,
  getVapidPrivateKey,
  getVapidSubject,
  setPushSender,
  resetPushSender,
  sendPushNotification,
  savePushSubscription,
  listPushSubscriptions,
  deletePushSubscription,
  markSubscriptionExpired,
  updateSubscriptionPrivacy,
  type PushSubscriptionRecord,
  type SavePushSubscriptionInput,
} from "./push";
import {
  formatNotificationPayload,
  dispatchDueNotifications,
} from "./push-dispatcher";
import * as dbClient from "./db/client";
import type { FollowUpRecord } from "./productivity";

describe("Push Subscriptions and Dispatcher (server/push.ts & push-dispatcher.ts)", () => {
  const sampleSubscription: PushSubscriptionRecord = {
    id: "push_sub_1",
    accountId: "acc_1",
    endpoint: "https://push.example.com/v1/sub_1",
    keysP256dh: "BMockP256dhKey_1234567890abcdef",
    keysAuth: "MockAuthKey_abcdef",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    previewMode: "generic",
    isActive: true,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
    revokedAt: null,
  };

  const sampleFollowUp: FollowUpRecord = {
    id: "fu_1",
    accountId: "acc_1",
    personName: "Alice Walker",
    commitment: "Review the quarterly roadmap document",
    details: "Focus on feature priorities and timeline.",
    dueAt: "2026-10-25T10:00:00.000Z",
    timeZone: "UTC",
    emailAddress: "alice@example.com",
    phoneNumber: "+1234567890",
    whatsappNumber: "+1234567890",
    preferredAction: "email",
    recurrence: null,
    status: "open",
    sourceNoteId: null,
    sourceExcerpt: null,
    revision: 1,
    createdAt: "2026-10-25T09:00:00.000Z",
    updatedAt: "2026-10-25T09:00:00.000Z",
  };

  beforeEach(() => {
    resetPushSender();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetPushSender();
    vi.restoreAllMocks();
  });

  describe("Input Validation", () => {
    it("accepts valid subscription input", () => {
      const input: SavePushSubscriptionInput = {
        endpoint: "https://fcm.googleapis.com/fcm/send/sample-token",
        keys: {
          p256dh: "BMockPublicKey",
          auth: "MockAuthSecret",
        },
        previewMode: "generic",
      };
      expect(validateSubscriptionInput(input)).toBeNull();
    });

    it("rejects missing or malformed endpoint", () => {
      expect(
        validateSubscriptionInput({
          endpoint: "",
          keys: { p256dh: "key", auth: "auth" },
        })
      ).toContain("Push endpoint is required");

      expect(
        validateSubscriptionInput({
          endpoint: "not-a-valid-url",
          keys: { p256dh: "key", auth: "auth" },
        })
      ).toContain("must be a valid URL");
    });

    it("rejects missing keys", () => {
      expect(
        validateSubscriptionInput({
          endpoint: "https://push.example.com",
          keys: { p256dh: "", auth: "auth" },
        })
      ).toContain("keys.p256dh is required");

      expect(
        validateSubscriptionInput({
          endpoint: "https://push.example.com",
          keys: { p256dh: "key", auth: "" },
        })
      ).toContain("keys.auth is required");
    });

    it("rejects invalid preview mode", () => {
      expect(
        validateSubscriptionInput({
          endpoint: "https://push.example.com",
          keys: { p256dh: "key", auth: "auth" },
          previewMode: "unsupported" as unknown as "generic",
        })
      ).toContain("Preview mode must be either");
    });
  });

  describe("VAPID Configuration", () => {
    it("returns default or configured VAPID parameters", () => {
      expect(getVapidPublicKey().length).toBeGreaterThan(0);
      expect(getVapidPrivateKey().length).toBeGreaterThan(0);
      expect(getVapidSubject()).toContain("mailto:");
    });
  });

  describe("PushSender Seam and Error Handling", () => {
    it("dispatches successfully through default sender for valid endpoint", async () => {
      const result = await sendPushNotification(sampleSubscription, {
        title: "Test",
        body: "Hello",
      });
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);
    });

    it("detects expired subscriptions on endpoints marked expired or status 410", async () => {
      const expiredSub = {
        ...sampleSubscription,
        endpoint: "https://push.example.com/expired-subscription",
      };
      const result = await sendPushNotification(expiredSub, {
        title: "Test",
        body: "Hello",
      });
      expect(result.success).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.statusCode).toBe(410);
    });

    it("allows replacing the push sender seam for custom testing", async () => {
      const mockSender = vi.fn(async () => ({
        success: true,
        statusCode: 200,
      }));
      setPushSender(mockSender);

      const result = await sendPushNotification(sampleSubscription, {
        title: "Mock Test",
        body: "Body",
      });
      expect(result.success).toBe(true);
      expect(mockSender).toHaveBeenCalledTimes(1);
    });
  });

  describe("Notification Payload Formatting and Privacy Controls", () => {
    it("formats generic payload without exposing contact name or commitment", () => {
      const genericSub = { ...sampleSubscription, previewMode: "generic" as const };
      const payload = formatNotificationPayload(sampleFollowUp, genericSub, "occ_1");

      expect(payload.title).toBe("TaskFlow Commitment Due");
      expect(payload.body).toBe("You have a Follow Up commitment due.");
      expect(payload.data?.followupId).toBe("fu_1");
      expect(payload.data?.preferredAction).toBe("email");
      expect(payload.data?.launcherUri).toContain("mailto:alice");
      expect(payload.actions?.some((a) => a.action === "email")).toBe(true);
    });

    it("formats detailed payload with contact name and commitment when explicitly configured", () => {
      const detailedSub = { ...sampleSubscription, previewMode: "detailed" as const };
      const payload = formatNotificationPayload(sampleFollowUp, detailedSub, "occ_1");

      expect(payload.title).toBe("Follow up: Alice Walker");
      expect(payload.body).toBe("Review the quarterly roadmap document");
      expect(payload.data?.personName).toBe("Alice Walker");
      expect(payload.data?.commitment).toBe("Review the quarterly roadmap document");
    });
  });

  describe("Database Operations & Dispatcher Execution", () => {
    it("handles database unavailability safely in dispatcher", async () => {
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(false);

      const summary = await dispatchDueNotifications();
      expect(summary.evaluatedFollowUps).toBe(0);
      expect(summary.dispatchedCount).toBe(0);
    });

    it("saves and retrieves push subscription with database queries", async () => {
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      const querySpy = vi.spyOn(dbClient, "executeQuery").mockResolvedValue({
        command: "INSERT",
        oid: 0,
        fields: [],
        rowCount: 1,
        rows: [sampleSubscription],
      });

      const saved = await savePushSubscription("acc_1", {
        endpoint: "https://push.example.com/v1/sub_1",
        keys: { p256dh: "key", auth: "auth" },
        previewMode: "generic",
      });

      expect(saved.id).toBe("push_sub_1");
      expect(querySpy).toHaveBeenCalled();

      const list = await listPushSubscriptions("acc_1");
      expect(list).toHaveLength(1);

      const updated = await updateSubscriptionPrivacy("acc_1", "push_sub_1", "detailed");
      expect(updated?.id).toBe("push_sub_1");

      const deleted = await deletePushSubscription("acc_1", "push_sub_1");
      expect(deleted).toBe(true);

      await markSubscriptionExpired("push_sub_1");
    });

    it("dispatches due follow-up notifications and records receipts", async () => {
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);

      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (sql: string) => {
        if (typeof sql === "string" && sql.includes("FROM followups")) {
          return {
            command: "SELECT",
            oid: 0,
            fields: [],
            rowCount: 1,
            rows: [sampleFollowUp],
          };
        }
        if (typeof sql === "string" && sql.includes("FROM push_subscriptions")) {
          return {
            command: "SELECT",
            oid: 0,
            fields: [],
            rowCount: 1,
            rows: [sampleSubscription],
          };
        }
        if (typeof sql === "string" && sql.includes("FROM notification_dispatches")) {
          // No prior dispatch found
          return {
            command: "SELECT",
            oid: 0,
            fields: [],
            rowCount: 0,
            rows: [],
          };
        }
        return {
          command: "INSERT",
          oid: 0,
          fields: [],
          rowCount: 1,
          rows: [],
        };
      });

      const summary = await dispatchDueNotifications({
        now: new Date("2026-10-25T11:00:00.000Z"),
      });

      expect(summary.evaluatedFollowUps).toBe(1);
      expect(summary.dispatchedCount).toBe(1);
      expect(summary.skippedCount).toBe(0);
      expect(summary.expiredCount).toBe(0);
    });

    it("guarantees idempotent delivery by skipping occurrences already dispatched", async () => {
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);

      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (sql: string) => {
        if (typeof sql === "string" && sql.includes("FROM followups")) {
          return {
            command: "SELECT",
            oid: 0,
            fields: [],
            rowCount: 1,
            rows: [sampleFollowUp],
          };
        }
        if (typeof sql === "string" && sql.includes("FROM push_subscriptions")) {
          return {
            command: "SELECT",
            oid: 0,
            fields: [],
            rowCount: 1,
            rows: [sampleSubscription],
          };
        }
        if (typeof sql === "string" && sql.includes("FROM notification_dispatches")) {
          // Already dispatched!
          return {
            command: "SELECT",
            oid: 0,
            fields: [],
            rowCount: 1,
            rows: [{ id: "disp_existing_1" }],
          };
        }
        return {
          command: "SELECT",
          oid: 0,
          fields: [],
          rowCount: 0,
          rows: [],
        };
      });

      const summary = await dispatchDueNotifications({
        now: new Date("2026-10-25T11:00:00.000Z"),
      });

      expect(summary.evaluatedFollowUps).toBe(1);
      expect(summary.dispatchedCount).toBe(0);
      expect(summary.skippedCount).toBe(1);
    });

    it("deactivates subscription and updates metrics when push service reports 410 expired", async () => {
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);

      const expiredSubscription = {
        ...sampleSubscription,
        endpoint: "https://push.example.com/expired-410",
      };

      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (sql: string) => {
        if (typeof sql === "string" && sql.includes("FROM followups")) {
          return {
            command: "SELECT",
            oid: 0,
            fields: [],
            rowCount: 1,
            rows: [sampleFollowUp],
          };
        }
        if (typeof sql === "string" && sql.includes("FROM push_subscriptions")) {
          return {
            command: "SELECT",
            oid: 0,
            fields: [],
            rowCount: 1,
            rows: [expiredSubscription],
          };
        }
        if (typeof sql === "string" && sql.includes("FROM notification_dispatches")) {
          return {
            command: "SELECT",
            oid: 0,
            fields: [],
            rowCount: 0,
            rows: [],
          };
        }
        return {
          command: "UPDATE",
          oid: 0,
          fields: [],
          rowCount: 1,
          rows: [],
        };
      });

      const summary = await dispatchDueNotifications({
        now: new Date("2026-10-25T11:00:00.000Z"),
      });

      expect(summary.evaluatedFollowUps).toBe(1);
      expect(summary.dispatchedCount).toBe(0);
      expect(summary.expiredCount).toBe(1);
    });
  });
});
