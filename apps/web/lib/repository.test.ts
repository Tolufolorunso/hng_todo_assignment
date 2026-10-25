import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { deleteDb } from "./db";
import {
  DEFAULT_WORKSPACE_ID,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  createTask,
  getTask,
  listTasks,
  updateTask,
  deleteTask,
  getTaskOrder,
  setTaskOrder,
  createNote,
  getNote,
  updateNote,
  deleteNote,
  createFollowUp,
  recordOccurrence,
  listOccurrences,
  getDailyPlanByDate,
  upsertDailyPlan,
  createInboxCapture,
  getInboxCapture,
  updateInboxCapture,
  deleteInboxCapture,
  listOutbox,
  dequeueOutbox,
  clearOutbox,
  getSyncCursor,
  setSyncCursor,
  listTombstones,
  recordLocalConflict,
  listLocalConflicts,
  resolveLocalConflict,
} from "./repository";

describe("Web Repository Boundaries (apps/web/lib/repository.ts)", () => {
  beforeEach(async () => {
    await deleteDb();
    setActiveWorkspaceId(DEFAULT_WORKSPACE_ID);
  });

  describe("Workspace Scoping & Context", () => {
    it("defaults to local workspace and allows switching active workspace", () => {
      expect(getActiveWorkspaceId()).toBe(DEFAULT_WORKSPACE_ID);
      setActiveWorkspaceId("ws_work");
      expect(getActiveWorkspaceId()).toBe("ws_work");
      setActiveWorkspaceId(DEFAULT_WORKSPACE_ID);
    });

    it("creates, gets, and lists workspaces", async () => {
      const created = await createWorkspace({
        name: "Work Workspace",
        type: "account",
        accountId: "acc_123",
      });

      expect(created.id).toMatch(/^ws_/);
      expect(created.name).toBe("Work Workspace");
      expect(created.type).toBe("account");

      const fetched = await getWorkspace(created.id);
      expect(fetched).toEqual(created);

      const all = await listWorkspaces();
      expect(all.some((w) => w.id === "local")).toBe(true);
      expect(all.some((w) => w.id === created.id)).toBe(true);
    });
  });

  describe("Tasks & Atomic Outbox Logging", () => {
    it("creates a task and atomically enqueues an outbox mutation", async () => {
      const task = await createTask({
        title: "Test Task",
        priority: "high",
      });

      expect(task.id).toBeDefined();
      expect(task.workspaceId).toBe("local");

      const outbox = await listOutbox("local");
      expect(outbox).toHaveLength(1);
      expect(outbox[0].entityType).toBe("task");
      expect(outbox[0].entityId).toBe(task.id);
      expect(outbox[0].action).toBe("put");
      expect((outbox[0].payload as { title: string }).title).toBe("Test Task");
    });

    it("isolates tasks across different workspaces", async () => {
      await createTask({ title: "Local Task" }, { workspaceId: "local" });
      await createTask({ title: "Remote Task" }, { workspaceId: "ws_remote" });

      const localTasks = await listTasks({ workspaceId: "local" });
      expect(localTasks).toHaveLength(1);
      expect(localTasks[0].title).toBe("Local Task");

      const remoteTasks = await listTasks({ workspaceId: "ws_remote" });
      expect(remoteTasks).toHaveLength(1);
      expect(remoteTasks[0].title).toBe("Remote Task");
    });

    it("updates a task and records put outbox mutation", async () => {
      const task = await createTask({ title: "Initial Title", priority: "low" });
      await clearOutbox("local");

      const updated = await updateTask(task.id, {
        title: "Updated Title",
        completed: true,
      });

      expect(updated.title).toBe("Updated Title");
      expect(updated.completed).toBe(true);

      const outbox = await listOutbox("local");
      expect(outbox).toHaveLength(1);
      expect(outbox[0].action).toBe("put");
      expect((outbox[0].payload as { completed: boolean }).completed).toBe(true);
    });

    it("deletes a task, enqueues delete mutation, and creates a tombstone", async () => {
      const task = await createTask({ title: "Task to delete" });
      await clearOutbox("local");

      const success = await deleteTask(task.id);
      expect(success).toBe(true);

      const fetched = await getTask(task.id);
      expect(fetched).toBeNull();

      const outbox = await listOutbox("local");
      expect(outbox).toHaveLength(1);
      expect(outbox[0].action).toBe("delete");
      expect(outbox[0].entityId).toBe(task.id);

      const tombstones = await listTombstones("local");
      expect(tombstones).toHaveLength(1);
      expect(tombstones[0].entityType).toBe("task");
      expect(tombstones[0].entityId).toBe(task.id);
    });

    it("allows disabling outbox enqueue via option", async () => {
      const task = await createTask(
        { title: "No Outbox Task" },
        { enqueueOutbox: false }
      );
      expect(task.id).toBeDefined();

      const outbox = await listOutbox("local");
      expect(outbox).toHaveLength(0);
    });
  });

  describe("Task Orders", () => {
    it("persists ordered IDs and enqueues task_order mutation", async () => {
      const order = await setTaskOrder(["tsk_1", "tsk_2", "tsk_3"]);
      expect(order.orderedIds).toEqual(["tsk_1", "tsk_2", "tsk_3"]);

      const retrieved = await getTaskOrder();
      expect(retrieved).toEqual(["tsk_1", "tsk_2", "tsk_3"]);

      const outbox = await listOutbox("local");
      expect(outbox.some((m) => m.entityType === "task_order")).toBe(true);
    });
  });

  describe("Notes Repository", () => {
    it("creates, retrieves, updates, and deletes notes with outbox logging", async () => {
      const note = await createNote({
        title: "Meeting Notes",
        body: "<p>Discussion points</p>",
      });

      expect(note.title).toBe("Meeting Notes");
      expect(note.workspaceId).toBe("local");

      const fetched = await getNote(note.id);
      expect(fetched?.body).toBe("<p>Discussion points</p>");

      const updated = await updateNote(note.id, { title: "Updated Meeting Notes" });
      expect(updated.title).toBe("Updated Meeting Notes");

      const deleted = await deleteNote(note.id);
      expect(deleted).toBe(true);
      expect(await getNote(note.id)).toBeNull();

      const tombstones = await listTombstones("local");
      expect(tombstones.some((t) => t.entityType === "note" && t.entityId === note.id)).toBe(true);
    });
  });

  describe("FollowUps & Occurrences", () => {
    it("creates follow-up and logs occurrences with workspace isolation", async () => {
      const followUp = await createFollowUp({
        personName: "Alice Smith",
        commitment: "Send quarterly report",
        dueAt: "2026-11-01T10:00:00.000Z",
      });

      expect(followUp.id).toBeDefined();
      expect(followUp.workspaceId).toBe("local");

      const occurrence = await recordOccurrence(
        followUp.id,
        "2026-11-01T10:00:00.000Z",
        "completed"
      );

      expect(occurrence.followUpId).toBe(followUp.id);
      expect(occurrence.outcome).toBe("completed");

      const occurrences = await listOccurrences({ followUpId: followUp.id });
      expect(occurrences).toHaveLength(1);
    });
  });

  describe("Daily Plans & Inbox Captures", () => {
    it("upserts daily plan and tracks in outbox", async () => {
      const plan = await upsertDailyPlan({
        date: "2026-10-26",
        availableMinutes: 240,
        items: [],
      });

      expect(plan.date).toBe("2026-10-26");
      const fetched = await getDailyPlanByDate("2026-10-26");
      expect(fetched?.availableMinutes).toBe(240);

      const outbox = await listOutbox("local");
      expect(outbox.some((m) => m.entityType === "plan")).toBe(true);
    });

    it("creates, updates, and deletes inbox captures with outbox mutations", async () => {
      const capture = await createInboxCapture({
        text: "Read research paper",
        sharedUrl: "https://example.com/paper.pdf",
      });

      expect(capture.text).toBe("Read research paper");
      expect(capture.state).toBe("pending");

      const updated = await updateInboxCapture(capture.id, {
        state: "processed",
        targetType: "task",
        targetId: "tsk_paper",
      });

      expect(updated.state).toBe("processed");
      expect(updated.processedAt).toBeDefined();

      const deleted = await deleteInboxCapture(capture.id);
      expect(deleted).toBe(true);
      expect(await getInboxCapture(capture.id)).toBeNull();
    });
  });

  describe("Outbox, Cursors & Local Conflicts", () => {
    it("dequeues outbox mutations", async () => {
      await createTask({ title: "Task for dequeue" });
      const outboxBefore = await listOutbox("local");
      expect(outboxBefore.length).toBeGreaterThan(0);

      await dequeueOutbox(outboxBefore[0].mutationId);
      const outboxAfter = await listOutbox("local");
      expect(outboxAfter).toHaveLength(outboxBefore.length - 1);
    });

    it("gets and sets sync cursor per workspace", async () => {
      expect(await getSyncCursor("local")).toBe(0);

      await setSyncCursor("local", 42, "2026-10-25T18:00:00.000Z");
      expect(await getSyncCursor("local")).toBe(42);

      // Other workspace cursor remains 0
      expect(await getSyncCursor("ws_other")).toBe(0);
    });

    it("records, lists, and resolves local conflicts", async () => {
      const conflict = await recordLocalConflict({
        workspaceId: "local",
        entityType: "task",
        entityId: "tsk_conflict_1",
        baseRevision: 2,
        serverRevision: 3,
        currentServerEntity: { id: "tsk_conflict_1", title: "Server Version", revision: 3 },
        attemptedMutation: {
          mutationId: "mut_test",
          workspaceId: "local",
          protocolVersion: 1,
          entityType: "task",
          entityId: "tsk_conflict_1",
          action: "put",
          baseRevision: 2,
          payload: { title: "Local Version" },
          createdAt: "2026-10-25T18:00:00.000Z",
        },
        status: "open",
      });

      expect(conflict.id).toMatch(/^cnf_/);
      expect(conflict.status).toBe("open");

      const openConflicts = await listLocalConflicts("local", "open");
      expect(openConflicts).toHaveLength(1);

      const resolved = await resolveLocalConflict(conflict.id);
      expect(resolved).toBe(true);

      const remainingOpen = await listLocalConflicts("local", "open");
      expect(remainingOpen).toHaveLength(0);

      const allConflicts = await listLocalConflicts("local");
      expect(allConflicts[0].status).toBe("resolved");
      expect(allConflicts[0].resolvedAt).toBeDefined();
    });
  });
});
