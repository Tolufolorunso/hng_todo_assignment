import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { deleteDb, getDb } from "@/lib/db";
import {
  performSyncCycle,
  resolveConflict,
} from "@/lib/sync";
import {
  getSyncCursor,
  listLocalConflicts,
  listOutbox,
  recordLocalConflict,
  setActiveWorkspaceId,
} from "@/lib/repository";
import type { OutboxMutationRecord } from "@/types/storage";

describe("client synchronization engine", () => {
  const workspaceId = "account_user_1";
  const token = "mock_token_abc";

  beforeEach(async () => {
    await deleteDb();
    setActiveWorkspaceId(workspaceId);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("pushes outbox mutations and dequeues on applied receipts", async () => {
    const db = await getDb();
    const mutation: OutboxMutationRecord = {
      mutationId: "mut_1",
      workspaceId,
      protocolVersion: 1,
      entityType: "task",
      entityId: "t1",
      action: "put",
      baseRevision: null,
      payload: { id: "t1", title: "Offline task", completed: false },
      createdAt: "2026-10-25T10:00:00.000Z",
    };
    await db.put("outbox", mutation);

    expect(await listOutbox(workspaceId)).toHaveLength(1);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          protocolVersion: 1,
          receipts: [
            {
              mutationId: "mut_1",
              entityType: "task",
              entityId: "t1",
              action: "put",
              status: "applied",
              appliedRevision: 1,
            },
          ],
          changes: {
            items: [],
            nextCursor: 1,
            hasMore: false,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await performSyncCycle(workspaceId, token);
    expect(result.ok).toBe(true);
    expect(result.appliedCount).toBe(1);

    // Verify outbox was dequeued
    expect(await listOutbox(workspaceId)).toHaveLength(0);

    // Verify sync cursor was advanced
    const cursor = await getSyncCursor(workspaceId);
    expect(cursor).toBe(1);

    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/sync", expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }));
  });

  it("records local conflict and dequeues outbox on conflict receipt", async () => {
    const db = await getDb();
    const mutation: OutboxMutationRecord = {
      mutationId: "mut_conflict_1",
      workspaceId,
      protocolVersion: 1,
      entityType: "task",
      entityId: "t1",
      action: "put",
      baseRevision: 1,
      payload: { id: "t1", title: "Client Title", completed: false },
      createdAt: "2026-10-25T10:00:00.000Z",
    };
    await db.put("outbox", mutation);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          protocolVersion: 1,
          receipts: [
            {
              mutationId: "mut_conflict_1",
              entityType: "task",
              entityId: "t1",
              action: "put",
              status: "conflict",
              conflictDetails: {
                message: "Entity was updated on server",
                serverRevision: 3,
                currentServerEntity: {
                  id: "t1",
                  title: "Server Title",
                  completed: true,
                  revision: 3,
                },
              },
            },
          ],
          changes: {
            items: [],
            nextCursor: 3,
            hasMore: false,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await performSyncCycle(workspaceId, token);
    expect(result.ok).toBe(true);
    expect(result.conflictsCount).toBe(1);

    // Outbox dequeued to prevent re-submitting stale revision
    expect(await listOutbox(workspaceId)).toHaveLength(0);

    // Local conflict stored
    const conflicts = await listLocalConflicts(workspaceId);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].id).toBe("conf_mut_conflict_1");
    expect(conflicts[0].status).toBe("open");
    expect(conflicts[0].serverRevision).toBe(3);
  });

  it("applies incoming change stream updates and deletion tombstones", async () => {
    const db = await getDb();
    // Existing task to be deleted via tombstone
    await db.put("tasks", {
      id: "t_delete",
      workspaceId,
      title: "To be deleted",
      description: "",
      completed: false,
      priority: "low",
      dueDate: null,
      category: null,
      createdAt: "2026-10-20T10:00:00.000Z",
      updatedAt: "2026-10-20T10:00:00.000Z",
      completedAt: null,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          protocolVersion: 1,
          receipts: [],
          changes: {
            items: [
              {
                entityType: "task",
                id: "t_new",
                title: "Server Added Task",
                description: "From cloud",
                completed: false,
                priority: "high",
                dueDate: "2026-10-30",
                category: "work",
                createdAt: "2026-10-25T12:00:00.000Z",
                updatedAt: "2026-10-25T12:00:00.000Z",
                completedAt: null,
                revision: 5,
              },
              {
                entityType: "tombstone",
                entityId: "t_delete",
                deletedAt: "2026-10-25T12:05:00.000Z",
                revision: 6,
              },
            ],
            nextCursor: 6,
            hasMore: false,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await performSyncCycle(workspaceId, token);
    expect(result.ok).toBe(true);
    expect(result.changesCount).toBe(2);

    // t_new should exist in local db
    const newTask = await db.get("tasks", "t_new");
    expect(newTask?.title).toBe("Server Added Task");
    expect(newTask?.workspaceId).toBe(workspaceId);

    // t_delete should be removed
    const deletedTask = await db.get("tasks", "t_delete");
    expect(deletedTask).toBeUndefined();
  });

  it("resolves conflict with keep-server choice", async () => {
    const db = await getDb();
    await db.put("tasks", {
      id: "t1",
      workspaceId,
      title: "Local Title",
      description: "",
      completed: false,
      priority: "low",
      dueDate: null,
      category: null,
      createdAt: "now",
      updatedAt: "now",
      completedAt: null,
    });

    await recordLocalConflict({
      id: "conf_1",
      workspaceId,
      entityType: "task",
      entityId: "t1",
      baseRevision: 1,
      serverRevision: 4,
      currentServerEntity: {
        id: "t1",
        title: "Server Winner Title",
        description: "",
        completed: true,
        priority: "high",
        dueDate: null,
        category: null,
        createdAt: "now",
        updatedAt: "now",
        completedAt: null,
        revision: 4,
      },
      attemptedMutation: {
        mutationId: "mut_old",
        workspaceId,
        protocolVersion: 1,
        entityType: "task",
        entityId: "t1",
        action: "put",
        baseRevision: 1,
        payload: { title: "Local Title" },
        createdAt: "now",
      },
      status: "open",
      detectedAt: "now",
      resolvedAt: null,
    });

    const res = await resolveConflict("conf_1", "keep-server", workspaceId);
    expect(res).toBe(true);

    const updatedTask = await db.get("tasks", "t1");
    expect(updatedTask?.title).toBe("Server Winner Title");
    expect(updatedTask?.completed).toBe(true);

    const conflicts = await listLocalConflicts(workspaceId);
    expect(conflicts[0].status).toBe("resolved");
  });

  it("resolves conflict with keep-local choice by queueing mutation with updated baseRevision", async () => {
    await recordLocalConflict({
      id: "conf_2",
      workspaceId,
      entityType: "task",
      entityId: "t2",
      baseRevision: 1,
      serverRevision: 7,
      currentServerEntity: { id: "t2", title: "Server Title" },
      attemptedMutation: {
        mutationId: "mut_local",
        workspaceId,
        protocolVersion: 1,
        entityType: "task",
        entityId: "t2",
        action: "put",
        baseRevision: 1,
        payload: { id: "t2", title: "Local Preferred Title" },
        createdAt: "now",
      },
      status: "open",
      detectedAt: "now",
      resolvedAt: null,
    });

    const res = await resolveConflict("conf_2", "keep-local", workspaceId);
    expect(res).toBe(true);

    const outbox = await listOutbox(workspaceId);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].baseRevision).toBe(7); // Uses serverRevision as new baseRevision
    expect(outbox[0].entityId).toBe("t2");
  });
});
