import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemorySqliteDatabase } from "../db/driver.js";
import { runMigrations } from "../db/migrations.js";
import { SyncEngine } from "./syncEngine.js";
import { AuthService } from "./auth.js";
import { SyncRepository } from "../storage/syncRepository.js";
import { TaskRepository } from "../storage/taskRepository.js";
import { NoteRepository } from "../storage/noteRepository.js";
import type { SyncResponse } from "../types/sync.js";

describe("Mobile SyncEngine", () => {
  let db: InMemorySqliteDatabase;
  let authService: AuthService;
  let syncEngine: SyncEngine;
  let syncRepo: SyncRepository;
  let taskRepo: TaskRepository;
  let noteRepo: NoteRepository;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);

    mockFetch = vi.fn();
    authService = new AuthService(db, {
      baseUrl: "https://api.taskflow.test",
      fetchFn: mockFetch as unknown as typeof fetch,
    });
    syncEngine = new SyncEngine(db, authService, {
      baseUrl: "https://api.taskflow.test",
      fetchFn: mockFetch as unknown as typeof fetch,
    });
    syncRepo = new SyncRepository(db);
    taskRepo = new TaskRepository(db);
    noteRepo = new NoteRepository(db);
  });

  it("skips sync and remains idle when user is unauthenticated", async () => {
    const res = await syncEngine.syncOnce();
    expect(res.success).toBe(false);
    expect(res.error).toBe("Unauthenticated");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(syncEngine.getSyncState().status).toBe("idle");
  });

  describe("Authenticated Sync Cycles", () => {
    beforeEach(async () => {
      // Authenticate
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: "token_abc",
          refreshToken: "refresh_xyz",
          user: { id: "user_123", email: "tester@taskflow.dev" },
          session: { id: "sess_1", expiresAt: "2026-11-26T00:00:00Z" },
        }),
      });
      await authService.verifyOtp("tester@taskflow.dev", "123456");
    });

    it("pushes outbox mutations, processes applied receipts, and advances cursor", async () => {
      const task = await taskRepo.create({ title: "Local Task" }, { enqueueOutbox: true });
      expect(await syncRepo.countOutbox()).toBe(1);

      const syncResponse: SyncResponse = {
        receipts: [
          {
            mutationId: (await syncRepo.listOutbox())[0].mutationId,
            status: "applied",
            entityType: "task",
            entityId: task.id,
            appliedRevision: 15,
          },
        ],
        changes: [],
        nextCursor: 15,
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => syncResponse,
      });

      const result = await syncEngine.syncOnce();
      expect(result.success).toBe(true);
      expect(result.pushed).toBe(1);
      expect(result.pulled).toBe(0);

      // Verify outbox was dequeued
      expect(await syncRepo.countOutbox()).toBe(0);

      // Verify server revision was tracked
      expect(await syncRepo.getServerRevision("task", task.id)).toBe(15);

      // Verify cursor was advanced
      expect(await syncRepo.getCursor("user_123")).toBe(15);

      expect(syncEngine.getSyncState().status).toBe("idle");
    });

    it("pulls server changes and applies them directly into local database", async () => {
      const syncResponse: SyncResponse = {
        receipts: [],
        changes: [
          {
            entityType: "note",
            entityId: "note_cloud_1",
            action: "put",
            revision: 21,
            data: {
              id: "note_cloud_1",
              title: "Cloud Note",
              body: "Content from cloud",
              createdAt: "2026-10-26T06:00:00.000Z",
              updatedAt: "2026-10-26T06:00:00.000Z",
            },
          },
        ],
        nextCursor: 21,
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => syncResponse,
      });

      const result = await syncEngine.syncOnce();
      expect(result.success).toBe(true);
      expect(result.pulled).toBe(1);

      const savedNote = await noteRepo.getById("note_cloud_1");
      expect(savedNote?.title).toBe("Cloud Note");
      expect(await syncRepo.getServerRevision("note", "note_cloud_1")).toBe(21);
      expect(await syncRepo.getCursor("user_123")).toBe(21);
    });

    it("handles conflict receipt by recording conflict and dequeuing outbox", async () => {
      const task = await taskRepo.create({ title: "Conflicting Task" }, { enqueueOutbox: true });
      const mutationId = (await syncRepo.listOutbox())[0].mutationId;

      const syncResponse: SyncResponse = {
        receipts: [
          {
            mutationId,
            status: "conflict",
            entityType: "task",
            entityId: task.id,
            conflictDetails: {
              message: "Revision mismatch",
              serverRevision: 8,
              currentServerEntity: {
                id: task.id,
                title: "Server Version of Task",
                completed: false,
                priority: "medium",
                createdAt: "2026-10-25T00:00:00Z",
                updatedAt: "2026-10-26T00:00:00Z",
              },
            },
          },
        ],
        changes: [],
        nextCursor: 8,
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => syncResponse,
      });

      const result = await syncEngine.syncOnce();
      expect(result.success).toBe(true);
      expect(result.conflicts).toBe(1);

      // Outbox dequeued to prevent loop
      expect(await syncRepo.countOutbox()).toBe(0);

      // Conflict record created
      const conflicts = await syncRepo.listConflicts("user_123");
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].entityId).toBe(task.id);
      expect(conflicts[0].serverRevision).toBe(8);

      expect(syncEngine.getSyncState().status).toBe("conflict");
      expect(syncEngine.getSyncState().unresolvedConflictsCount).toBe(1);
    });

    it("resolves conflict with 'keepServer'", async () => {
      const task = await taskRepo.create({ title: "My Local Task" });
      const conflict = await syncRepo.recordConflict({
        workspaceId: "user_123",
        entityType: "task",
        entityId: task.id,
        localValue: JSON.stringify(task),
        serverValue: JSON.stringify({
          id: task.id,
          title: "Overwriting Server Title",
          description: "",
          completed: true,
          completedAt: "2026-10-26T06:00:00Z",
          priority: "high",
          dueDate: null,
          category: null,
          estimatedMinutes: null,
          sourceNoteId: null,
          sourceExcerpt: null,
          createdAt: task.createdAt,
          updatedAt: "2026-10-26T06:00:00Z",
        }),
        serverRevision: 10,
      });

      await syncEngine.resolveConflict(conflict.id, "keepServer");

      const resolved = await taskRepo.getById(task.id);
      expect(resolved?.title).toBe("Overwriting Server Title");
      expect(resolved?.completed).toBe(true);
      expect(await syncRepo.getServerRevision("task", task.id)).toBe(10);
      expect(await syncRepo.listConflicts("user_123")).toHaveLength(0);
    });

    it("resolves conflict with 'keepLocal' by enqueuing fresh outbox mutation", async () => {
      const task = await taskRepo.create({ title: "My Local Task" });
      const conflict = await syncRepo.recordConflict({
        workspaceId: "user_123",
        entityType: "task",
        entityId: task.id,
        localValue: JSON.stringify(task),
        serverValue: JSON.stringify({ id: task.id, title: "Server Title" }),
        serverRevision: 12,
      });

      await syncEngine.resolveConflict(conflict.id, "keepLocal");

      const outbox = await syncRepo.listOutbox();
      expect(outbox).toHaveLength(1);
      expect(outbox[0].entityId).toBe(task.id);
      expect(outbox[0].baseRevision).toBe(12); // Fresh mutation uses serverRevision as new baseRevision
      expect(await syncRepo.listConflicts("user_123")).toHaveLength(0);
    });
  });
});
