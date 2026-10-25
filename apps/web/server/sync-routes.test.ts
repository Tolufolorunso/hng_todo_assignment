import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as postSyncHandler } from "@/app/api/v1/sync/route";
import { createAccessToken } from "@/server/auth";
import * as authModule from "@/server/auth";
import * as dbClient from "@/server/db/client";
import * as syncModule from "@/server/sync";

describe("Sync Route Handler (POST /api/v1/sync)", () => {
  const validToken = createAccessToken({
    accountId: "acc_sync_routes_test",
    sessionId: "ses_sync_routes_test",
    email: "sync.routes@example.com",
  });

  const authHeaders = {
    Authorization: `Bearer ${validToken}`,
    "Content-Type": "application/json",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 Unauthorized when no Bearer token is provided", async () => {
    const req = new Request("http://localhost:3000/api/v1/sync", {
      method: "POST",
      body: JSON.stringify({ mutations: [] }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await postSyncHandler(req);
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("no-store, private");

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 Bad Request when JSON body is malformed", async () => {
    const req = new Request("http://localhost:3000/api/v1/sync", {
      method: "POST",
      body: "not-json{",
      headers: authHeaders,
    });

    const res = await postSyncHandler(req);
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store, private");

    const json = await res.json();
    expect(json.error.code).toBe("BAD_REQUEST");
  });

  it("returns 400 Bad Request when protocolVersion is unsupported", async () => {
    const req = new Request("http://localhost:3000/api/v1/sync", {
      method: "POST",
      body: JSON.stringify({ protocolVersion: 99 }),
      headers: authHeaders,
    });

    const res = await postSyncHandler(req);
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store, private");

    const json = await res.json();
    expect(json.error.code).toBe("BAD_REQUEST");
    expect(json.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "protocolVersion" }),
      ])
    );
  });

  it("returns 400 Bad Request when batch size exceeds maximum limit", async () => {
    const tooManyMutations = Array.from({ length: 101 }, (_, i) => ({
      mutationId: `mut_${i}`,
      entityType: "task",
      entityId: `tsk_${i}`,
      action: "put",
    }));

    const req = new Request("http://localhost:3000/api/v1/sync", {
      method: "POST",
      body: JSON.stringify({ mutations: tooManyMutations }),
      headers: authHeaders,
    });

    const res = await postSyncHandler(req);
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store, private");

    const json = await res.json();
    expect(json.error.code).toBe("BAD_REQUEST");
    expect(json.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "mutations" }),
      ])
    );
  });

  it("returns 400 Bad Request when mutation items have invalid fields", async () => {
    const req = new Request("http://localhost:3000/api/v1/sync", {
      method: "POST",
      body: JSON.stringify({
        mutations: [
          {
            mutationId: "",
            entityType: "unsupported_type",
            entityId: "",
            action: "invalid_action",
            baseRevision: -5,
          },
        ],
      }),
      headers: authHeaders,
    });

    const res = await postSyncHandler(req);
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store, private");

    const json = await res.json();
    expect(json.error.code).toBe("BAD_REQUEST");
    expect(json.error.details).toHaveLength(5);
  });

  it("returns 400 Bad Request when cursor or limit are invalid", async () => {
    const req = new Request("http://localhost:3000/api/v1/sync", {
      method: "POST",
      body: JSON.stringify({
        cursor: -1,
        limit: 500,
      }),
      headers: authHeaders,
    });

    const res = await postSyncHandler(req);
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBe("no-store, private");

    const json = await res.json();
    expect(json.error.code).toBe("BAD_REQUEST");
    expect(json.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "cursor" }),
        expect.objectContaining({ field: "limit" }),
      ])
    );
  });

  it("returns 503 Database Unavailable when database is not configured", async () => {
    vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(false);

    const req = new Request("http://localhost:3000/api/v1/sync", {
      method: "POST",
      body: JSON.stringify({ mutations: [] }),
      headers: authHeaders,
    });

    const res = await postSyncHandler(req);
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store, private");

    const json = await res.json();
    expect(json.error.code).toBe("DATABASE_UNAVAILABLE");
  });

  it("processes sync request successfully and returns private no-store headers", async () => {
    vi.spyOn(authModule, "authenticateRequest").mockResolvedValue({
      sub: "acc_sync_routes_test",
      sid: "ses_sync_routes_test",
      email: "sync.routes@example.com",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
    vi.spyOn(syncModule, "processSyncBatch").mockResolvedValue({
      protocolVersion: 1,
      receipts: [
        {
          mutationId: "mut_test1",
          status: "applied",
          entityType: "task",
          entityId: "tsk_123",
          appliedRevision: 10,
        },
      ],
      changes: {
        tasks: [],
        notes: [],
        followups: [],
        occurrences: [],
        plans: [],
        inbox: [],
        taskOrder: null,
        tombstones: [],
      },
      nextCursor: 10,
      hasMore: false,
      serverTime: "2026-10-25T18:00:00.000Z",
    });

    const req = new Request("http://localhost:3000/api/v1/sync", {
      method: "POST",
      body: JSON.stringify({
        protocolVersion: 1,
        mutations: [
          {
            mutationId: "mut_test1",
            entityType: "task",
            entityId: "tsk_123",
            action: "put",
            baseRevision: 0,
            payload: { title: "Test Sync Task" },
          },
        ],
        cursor: 0,
        limit: 50,
      }),
      headers: authHeaders,
    });

    const res = await postSyncHandler(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store, private");

    const json = await res.json();
    expect(json.protocolVersion).toBe(1);
    expect(json.receipts).toHaveLength(1);
    expect(json.receipts[0].status).toBe("applied");
    expect(json.nextCursor).toBe(10);
  });
});
