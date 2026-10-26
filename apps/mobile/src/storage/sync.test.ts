import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySqliteDatabase } from "../db/driver.js";
import { runMigrations, getMigrationVersion } from "../db/migrations.js";
import { SyncRepository } from "./syncRepository.js";
import { TaskRepository } from "./taskRepository.js";
import { NoteRepository } from "./noteRepository.js";
import { FollowUpRepository } from "./followUpRepository.js";
import { DailyPlanRepository } from "./dailyPlanRepository.js";
import { InboxRepository } from "./inboxRepository.js";

describe("Mobile Sync Storage and Migration 3", () => {
  let db: InMemorySqliteDatabase;
  let syncRepo: SyncRepository;
  let taskRepo: TaskRepository;
  let noteRepo: NoteRepository;
  let followUpRepo: FollowUpRepository;
  let dailyPlanRepo: DailyPlanRepository;
  let inboxRepo: InboxRepository;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);
    syncRepo = new SyncRepository(db);
    taskRepo = new TaskRepository(db);
    noteRepo = new NoteRepository(db);
    followUpRepo = new FollowUpRepository(db);
    dailyPlanRepo = new DailyPlanRepository(db);
    inboxRepo = new InboxRepository(db);
  });

  it("applies migration 3 and achieves schema version 3", async () => {
    const version = await getMigrationVersion(db);
    expect(version).toBe(3);
  });

  describe("SyncRepository basic operations", () => {
    it("enqueues and lists outbox mutations in chronological order", async () => {
      const mut1 = await syncRepo.enqueueOutbox({
        entityType: "task",
        entityId: "task_1",
        action: "put",
        baseRevision: null,
        payload: JSON.stringify({ title: "Task 1" }),
      });

      const mut2 = await syncRepo.enqueueOutbox({
        entityType: "note",
        entityId: "note_1",
        action: "put",
        baseRevision: 1,
        payload: JSON.stringify({ title: "Note 1" }),
      });

      const outbox = await syncRepo.listOutbox();
      expect(outbox).toHaveLength(2);
      expect(outbox[0].mutationId).toBe(mut1.mutationId);
      expect(outbox[0].entityType).toBe("task");
      expect(outbox[1].mutationId).toBe(mut2.mutationId);
      expect(outbox[1].entityType).toBe("note");
      expect(outbox[1].baseRevision).toBe(1);
    });

    it("dequeues outbox mutations by mutationId", async () => {
      const mut1 = await syncRepo.enqueueOutbox({
        entityType: "task",
        entityId: "task_1",
        action: "put",
      });
      const mut2 = await syncRepo.enqueueOutbox({
        entityType: "task",
        entityId: "task_2",
        action: "put",
      });

      expect(await syncRepo.countOutbox()).toBe(2);
      await syncRepo.dequeueOutbox([mut1.mutationId]);

      const remaining = await syncRepo.listOutbox();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].mutationId).toBe(mut2.mutationId);
    });

    it("persists and updates sync cursors per workspace", async () => {
      expect(await syncRepo.getCursor("ws_1")).toBe(0);
      await syncRepo.setCursor("ws_1", 42);
      expect(await syncRepo.getCursor("ws_1")).toBe(42);
      await syncRepo.setCursor("ws_1", 108);
      expect(await syncRepo.getCursor("ws_1")).toBe(108);
    });

    it("records, lists, and resolves conflicts", async () => {
      const conflict = await syncRepo.recordConflict({
        workspaceId: "ws_user",
        entityType: "task",
        entityId: "task_conf",
        localValue: JSON.stringify({ title: "Local Title" }),
        serverValue: JSON.stringify({ title: "Server Title" }),
        serverRevision: 5,
      });

      const list = await syncRepo.listConflicts("ws_user");
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe(conflict.id);
      expect(list[0].serverRevision).toBe(5);

      await syncRepo.resolveConflict(conflict.id);
      expect(await syncRepo.listConflicts("ws_user")).toHaveLength(0);
    });

    it("records and checks tombstones", async () => {
      expect(await syncRepo.isTombstone("local", "task", "t_del")).toBe(false);
      await syncRepo.recordTombstone("local", "task", "t_del");
      expect(await syncRepo.isTombstone("local", "task", "t_del")).toBe(true);
    });

    it("tracks server revisions per entity", async () => {
      expect(await syncRepo.getServerRevision("task", "t_rev")).toBeNull();
      await syncRepo.setServerRevision("task", "t_rev", 12);
      expect(await syncRepo.getServerRevision("task", "t_rev")).toBe(12);
      await syncRepo.setServerRevision("task", "t_rev", 13);
      expect(await syncRepo.getServerRevision("task", "t_rev")).toBe(13);
    });
  });

  describe("Repository outbox logging integration", () => {
    it("enqueues outbox mutation when task is created with enqueueOutbox", async () => {
      const task = await taskRepo.create(
        { title: "Sync Task", priority: "high" },
        { enqueueOutbox: true }
      );
      const outbox = await syncRepo.listOutbox();
      expect(outbox).toHaveLength(1);
      expect(outbox[0].entityType).toBe("task");
      expect(outbox[0].entityId).toBe(task.id);
      expect(outbox[0].action).toBe("put");

      const payload = JSON.parse(outbox[0].payload!);
      expect(payload.title).toBe("Sync Task");
    });

    it("enqueues outbox mutation with baseRevision when updating task", async () => {
      const task = await taskRepo.create({ title: "Task Before Update" });
      await syncRepo.setServerRevision("task", task.id, 7);

      await taskRepo.update(task.id, { title: "Task After Update" }, { enqueueOutbox: true });
      const outbox = await syncRepo.listOutbox();
      expect(outbox).toHaveLength(1);
      expect(outbox[0].baseRevision).toBe(7);
      expect(outbox[0].action).toBe("put");
    });

    it("enqueues delete mutation and records tombstone on task deletion", async () => {
      const task = await taskRepo.create({ title: "Task To Delete" });
      await syncRepo.setServerRevision("task", task.id, 9);

      await taskRepo.delete(task.id, { enqueueOutbox: true });
      const outbox = await syncRepo.listOutbox();
      expect(outbox).toHaveLength(1);
      expect(outbox[0].action).toBe("delete");
      expect(outbox[0].baseRevision).toBe(9);

      expect(await syncRepo.isTombstone("local", "task", task.id)).toBe(true);
    });

    it("applies entities directly with putRaw without creating outbox mutations", async () => {
      await taskRepo.putRaw({
        id: "task_raw_1",
        title: "From Server",
        description: "Pulled description",
        completed: false,
        completedAt: null,
        priority: "medium",
        dueDate: null,
        category: null,
        estimatedMinutes: null,
        sourceNoteId: null,
        sourceExcerpt: null,
        createdAt: "2026-10-26T00:00:00.000Z",
        updatedAt: "2026-10-26T00:00:00.000Z",
      });

      const fetched = await taskRepo.getById("task_raw_1");
      expect(fetched?.title).toBe("From Server");

      const outbox = await syncRepo.listOutbox();
      expect(outbox).toHaveLength(0);
    });

    it("enqueues outbox mutations for notes, followups, plans, and inbox", async () => {
      const note = await noteRepo.create({ title: "Sync Note", body: "Note content" }, { enqueueOutbox: true });
      const fu = await followUpRepo.create({ personName: "Alex", commitment: "Send contract", dueAt: "2026-10-28T12:00:00Z" }, { enqueueOutbox: true });
      const plan = await dailyPlanRepo.save({ localDate: "2026-10-27", timeZone: "UTC", items: [], availableMinutes: 360 }, { enqueueOutbox: true });
      const inbox = await inboxRepo.create({ text: "Quick thought" }, { enqueueOutbox: true });

      const outbox = await syncRepo.listOutbox();
      const entityTypes = outbox.map((o) => o.entityType);
      expect(entityTypes).toContain("note");
      expect(entityTypes).toContain("followup");
      expect(entityTypes).toContain("occurrence");
      expect(entityTypes).toContain("plan");
      expect(entityTypes).toContain("inbox");
    });
  });
});
