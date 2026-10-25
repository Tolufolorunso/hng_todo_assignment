import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET as getSubscriptionsHandler, POST as postSubscriptionsHandler } from "@/app/api/v1/push/subscriptions/route";
import { GET as getSubscriptionHandler, PATCH as patchSubscriptionHandler, DELETE as deleteSubscriptionHandler } from "@/app/api/v1/push/subscriptions/[id]/route";
import { POST as postDispatchHandler } from "@/app/api/v1/push/dispatch/route";
import * as authModule from "@/server/auth";
import * as dbClient from "@/server/db/client";
import * as pushModule from "@/server/push";
import * as dispatcherModule from "@/server/push-dispatcher";

describe("Push API Route Handlers", () => {
  const mockUserPayload: authModule.AccessTokenPayload = {
    sub: "acc_test_push_routes",
    sid: "ses_test_push_routes",
    email: "push.routes@example.com",
    iat: 100,
    exp: 9999999999,
  };

  const authHeaders = {
    Authorization: "Bearer mock_valid_jwt_token",
    "Content-Type": "application/json",
  };

  const sampleSubscription: pushModule.PushSubscriptionRecord = {
    id: "push_sub_route_1",
    accountId: "acc_test_push_routes",
    endpoint: "https://push.example.com/route_sub",
    keysP256dh: "key_p256dh",
    keysAuth: "key_auth",
    userAgent: "Mozilla/5.0",
    previewMode: "generic",
    isActive: true,
    createdAt: "2026-10-25T12:00:00.000Z",
    updatedAt: "2026-10-25T12:00:00.000Z",
    revokedAt: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/v1/push/subscriptions", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          endpoint: "https://push.example.com",
          keys: { p256dh: "key", auth: "auth" },
        }),
      });

      const res = await postSubscriptionsHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 503 when database is unconfigured", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(mockUserPayload);
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(false);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          endpoint: "https://push.example.com",
          keys: { p256dh: "key", auth: "auth" },
        }),
      });

      const res = await postSubscriptionsHandler(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error.code).toBe("DATABASE_UNAVAILABLE");
    });

    it("returns 400 when body is invalid JSON", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(mockUserPayload);
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions", {
        method: "POST",
        headers: authHeaders,
        body: "invalid-json-string",
      });

      const res = await postSubscriptionsHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 when endpoint or keys are missing", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(mockUserPayload);
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          endpoint: "",
          keys: { p256dh: "k" },
        }),
      });

      const res = await postSubscriptionsHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("BAD_REQUEST");
    });

    it("registers subscription successfully and returns 201", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(mockUserPayload);
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      vi.spyOn(pushModule, "savePushSubscription").mockResolvedValue(sampleSubscription);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          endpoint: "https://push.example.com/route_sub",
          keys: { p256dh: "key_p256dh", auth: "key_auth" },
          previewMode: "generic",
        }),
      });

      const res = await postSubscriptionsHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.subscription.id).toBe("push_sub_route_1");
    });
  });

  describe("GET /api/v1/push/subscriptions", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions");
      const res = await getSubscriptionsHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns list of subscriptions for authenticated account", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(mockUserPayload);
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      vi.spyOn(pushModule, "listPushSubscriptions").mockResolvedValue([sampleSubscription]);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions", {
        headers: authHeaders,
      });

      const res = await getSubscriptionsHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.subscriptions).toHaveLength(1);
      expect(json.subscriptions[0].id).toBe("push_sub_route_1");
    });
  });

  describe("Subscription by ID endpoints", () => {
    it("returns 401 when unauthenticated on DELETE /api/v1/push/subscriptions/[id]", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions/sub_1", {
        method: "DELETE",
      });
      const res = await deleteSubscriptionHandler(req, {
        params: Promise.resolve({ id: "sub_1" }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 404 when deleting non-existent subscription", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(mockUserPayload);
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      vi.spyOn(pushModule, "deletePushSubscription").mockResolvedValue(false);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions/sub_missing", {
        method: "DELETE",
        headers: authHeaders,
      });
      const res = await deleteSubscriptionHandler(req, {
        params: Promise.resolve({ id: "sub_missing" }),
      });
      expect(res.status).toBe(404);
    });

    it("deletes subscription successfully and returns 200", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(mockUserPayload);
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      vi.spyOn(pushModule, "deletePushSubscription").mockResolvedValue(true);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions/push_sub_route_1", {
        method: "DELETE",
        headers: authHeaders,
      });
      const res = await deleteSubscriptionHandler(req, {
        params: Promise.resolve({ id: "push_sub_route_1" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.id).toBe("push_sub_route_1");
    });

    it("returns subscription by ID on GET", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(mockUserPayload);
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      vi.spyOn(pushModule, "getPushSubscription").mockResolvedValue(sampleSubscription);

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions/push_sub_route_1", {
        headers: authHeaders,
      });
      const res = await getSubscriptionHandler(req, {
        params: Promise.resolve({ id: "push_sub_route_1" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.subscription.id).toBe("push_sub_route_1");
    });

    it("updates privacy mode via PATCH /api/v1/push/subscriptions/[id]", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(mockUserPayload);
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      vi.spyOn(pushModule, "updateSubscriptionPrivacy").mockResolvedValue({
        ...sampleSubscription,
        previewMode: "detailed",
      });

      const req = new Request("http://localhost:3000/api/v1/push/subscriptions/push_sub_route_1", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ previewMode: "detailed" }),
      });

      const res = await patchSubscriptionHandler(req, {
        params: Promise.resolve({ id: "push_sub_route_1" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.subscription.previewMode).toBe("detailed");
    });
  });

  describe("POST /api/v1/push/dispatch", () => {
    it("returns 401 when no auth token or cron secret is provided", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/v1/push/dispatch", {
        method: "POST",
      });
      const res = await postDispatchHandler(req);
      expect(res.status).toBe(401);
    });

    it("executes dispatcher when authenticated with user token", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue(mockUserPayload);
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      vi.spyOn(dispatcherModule, "dispatchDueNotifications").mockResolvedValue({
        evaluatedFollowUps: 2,
        dispatchedCount: 1,
        skippedCount: 1,
        failedCount: 0,
        expiredCount: 0,
        errors: [],
      });

      const req = new Request("http://localhost:3000/api/v1/push/dispatch", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ dryRun: false }),
      });

      const res = await postDispatchHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.summary.dispatchedCount).toBe(1);
    });

    it("executes dispatcher when authorized via cron secret header", async () => {
      process.env.CRON_SECRET = "test_cron_secret_123";
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      vi.spyOn(dispatcherModule, "dispatchDueNotifications").mockResolvedValue({
        evaluatedFollowUps: 5,
        dispatchedCount: 3,
        skippedCount: 2,
        failedCount: 0,
        expiredCount: 0,
        errors: [],
      });

      const req = new Request("http://localhost:3000/api/v1/push/dispatch", {
        method: "POST",
        headers: {
          "x-cron-secret": "test_cron_secret_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dryRun: false }),
      });

      const res = await postDispatchHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.summary.dispatchedCount).toBe(3);
    });
  });
});
