import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
  buildBackupPayload,
  exportDatabaseBackup,
  generateBackupFilename,
  isValidInboxCapture,
  isValidNote,
  isValidTask,
  isValidTaskOrder,
  parseAndValidateBackup,
  restoreDatabaseBackup,
  type BackupPayload,
  type BackupPayloadV1,
  type BackupPayloadV2,
} from "@/lib/backup";
import { deleteDb, getDb } from "@/lib/db";
import type { Note } from "@/types/note";
import type { Task } from "@/types/task";
import type { InboxCapture } from "@/types/inbox";

function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Test Task",
    description: "Task description",
    completed: false,
    priority: "medium",
    dueDate: "2026-10-15",
    category: "work",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    completedAt: null,
    order: 0,
    workspaceId: "local",
    ...overrides,
  };
}

function mockNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    title: "Test Note",
    body: "Note body text",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    workspaceId: "local",
    ...overrides,
  };
}

describe("backup and restore logic", () => {
  beforeEach(async () => {
    await deleteDb();
  });

  describe("validators", () => {
    it("validates valid task objects", () => {
      expect(isValidTask(mockTask())).toBe(true);
      expect(isValidTask(mockTask({ dueDate: null, category: null, order: undefined }))).toBe(
        true
      );
    });

    it("rejects invalid task objects", () => {
      expect(isValidTask(null)).toBe(false);
      expect(isValidTask({})).toBe(false);
      expect(isValidTask(mockTask({ title: "" }))).toBe(false);
      expect(isValidTask(mockTask({ priority: "urgent" as unknown as Task["priority"] }))).toBe(
        false
      );
      expect(
        isValidTask(mockTask({ category: "invalid-cat" as unknown as Task["category"] }))
      ).toBe(false);
      expect(isValidTask(mockTask({ completed: "yes" as unknown as boolean }))).toBe(false);
    });

    it("validates valid note objects", () => {
      expect(isValidNote(mockNote())).toBe(true);
    });

    it("rejects invalid note objects", () => {
      expect(isValidNote(null)).toBe(false);
      expect(isValidNote(mockNote({ title: "" }))).toBe(false);
      expect(isValidNote(mockNote({ body: 123 as unknown as string }))).toBe(false);
    });

    it("validates valid inbox capture objects", () => {
      expect(
        isValidInboxCapture({
          id: "cap-1",
          text: "Capture text",
          sharedUrl: null,
          sourceAppLabel: null,
          capturedAt: "2026-10-25T10:00:00.000Z",
          state: "pending",
          targetType: null,
          targetId: null,
          createdAt: "2026-10-25T10:00:00.000Z",
          updatedAt: "2026-10-25T10:00:00.000Z",
        })
      ).toBe(true);
    });

    it("rejects invalid inbox capture objects", () => {
      expect(isValidInboxCapture(null)).toBe(false);
      expect(isValidInboxCapture({})).toBe(false);
      expect(
        isValidInboxCapture({
          id: "cap-1",
          text: "",
          state: "pending",
        })
      ).toBe(false);
      expect(
        isValidInboxCapture({
          id: "cap-1",
          text: "Hi",
          state: "unknown-state",
        })
      ).toBe(false);
    });

    it("validates valid task order objects", () => {
      expect(isValidTaskOrder({ id: "local", orderedIds: ["task-1", "task-2"] })).toBe(true);
      expect(isValidTaskOrder({ id: "work", orderedIds: [] })).toBe(true);
    });

    it("rejects invalid task order objects", () => {
      expect(isValidTaskOrder(null)).toBe(false);
      expect(isValidTaskOrder({})).toBe(false);
      expect(isValidTaskOrder({ id: "", orderedIds: [] })).toBe(false);
      expect(isValidTaskOrder({ id: "local", orderedIds: "not-an-array" })).toBe(false);
      expect(isValidTaskOrder({ id: "local", orderedIds: [123] })).toBe(false);
    });
  });

  describe("payload builders & filename", () => {
    it("builds valid version 2 BackupPayload structure by default", () => {
      const tasks = [mockTask()];
      const notes = [mockNote()];
      const payload = buildBackupPayload(tasks, notes);

      expect(payload.version).toBe(2);
      expect(payload.app).toBe("TaskFlow");
      expect(typeof payload.exportedAt).toBe("string");
      expect((payload as BackupPayloadV2).workspaceId).toBe("local");
      expect((payload as BackupPayloadV2).metadata).toEqual({
        format: "taskflow-backup-v2",
        exportedFrom: "web",
        schemaVersion: 9,
      });
      expect(payload.data.tasks).toEqual(tasks);
      expect(payload.data.notes).toEqual(notes);
      expect((payload as BackupPayloadV2).data.taskOrders).toEqual([]);
    });

    it("builds valid version 1 BackupPayload when requested", () => {
      const tasks = [mockTask()];
      const notes = [mockNote()];
      const payload = buildBackupPayload(
        tasks,
        notes,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { version: 1 }
      );

      expect(payload.version).toBe(1);
      expect(payload.app).toBe("TaskFlow");
      expect(typeof payload.exportedAt).toBe("string");
      expect(payload.data.tasks).toEqual(tasks);
      expect(payload.data.notes).toEqual(notes);
    });

    it("generates timestamped filename matching expected format", () => {
      const fixedDate = new Date(2026, 9, 15, 14, 30);
      const filename = generateBackupFilename(fixedDate);
      expect(filename).toBe("taskflow-backup-2026-10-15-1430.json");
    });
  });

  describe("parseAndValidateBackup", () => {
    it("accepts valid version 2 JSON backup payload", () => {
      const payload = buildBackupPayload([mockTask()], [mockNote()]);
      const json = JSON.stringify(payload);
      const result = parseAndValidateBackup(json);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.version).toBe(2);
        expect(result.value.data.tasks).toHaveLength(1);
        expect(result.value.data.notes).toHaveLength(1);
      }
    });

    it("accepts valid version 1 JSON backup payload", () => {
      const payload: BackupPayloadV1 = {
        version: 1,
        app: "TaskFlow",
        exportedAt: new Date().toISOString(),
        data: {
          tasks: [mockTask()],
          notes: [mockNote()],
        },
      };
      const json = JSON.stringify(payload);
      const result = parseAndValidateBackup(json);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.version).toBe(1);
        expect(result.value.data.tasks).toHaveLength(1);
      }
    });

    it("rejects invalid JSON syntax", () => {
      const result = parseAndValidateBackup("{ invalid json");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not valid JSON");
      }
    });

    it("rejects non-TaskFlow backups", () => {
      const result = parseAndValidateBackup(JSON.stringify({ app: "OtherApp", version: 2 }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Not a valid TaskFlow backup");
      }
    });

    it("rejects unsupported backup versions", () => {
      const result = parseAndValidateBackup(
        JSON.stringify({ app: "TaskFlow", version: 3, exportedAt: "now", data: {} })
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Unsupported backup version");
      }
    });

    it("rejects version 2 backup missing metadata or wrong format", () => {
      const badV2 = {
        app: "TaskFlow",
        version: 2,
        exportedAt: new Date().toISOString(),
        data: { tasks: [], notes: [] },
      };
      const result1 = parseAndValidateBackup(JSON.stringify(badV2));
      expect(result1.ok).toBe(false);

      const badFormat = {
        ...badV2,
        metadata: { format: "wrong-format" },
      };
      const result2 = parseAndValidateBackup(JSON.stringify(badFormat));
      expect(result2.ok).toBe(false);
    });

    it("rejects version 2 backup with malformed task orders", () => {
      const payload = {
        app: "TaskFlow",
        version: 2,
        exportedAt: new Date().toISOString(),
        metadata: { format: "taskflow-backup-v2", exportedFrom: "web", schemaVersion: 9 },
        data: {
          tasks: [],
          notes: [],
          taskOrders: [{ id: "local", orderedIds: [123] }],
        },
      };
      const result = parseAndValidateBackup(JSON.stringify(payload));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Task order at position 1 is corrupted");
      }
    });

    it("identifies corrupted task in backup", () => {
      const badPayload = {
        version: 2,
        app: "TaskFlow",
        exportedAt: new Date().toISOString(),
        metadata: { format: "taskflow-backup-v2", exportedFrom: "web", schemaVersion: 9 },
        data: {
          tasks: [mockTask({ title: "" })],
          notes: [],
        },
      };

      const result = parseAndValidateBackup(JSON.stringify(badPayload));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Task at position 1 is corrupted");
      }
    });
  });

  describe("database export and restore", () => {
    it("exports database tasks, notes, and task orders into version 2 snapshot", async () => {
      const db = await getDb();
      await db.put("tasks", mockTask({ id: "t1" }));
      await db.put("notes", mockNote({ id: "n1" }));
      await db.put("task_orders", {
        id: "local",
        workspaceId: "local",
        orderedIds: ["t1"],
        updatedAt: "2026-10-25T10:00:00.000Z",
      });

      const exportResult = await exportDatabaseBackup();
      expect(exportResult.payload.version).toBe(2);
      expect(exportResult.payload.data.tasks).toHaveLength(1);
      expect(exportResult.payload.data.notes).toHaveLength(1);
      expect((exportResult.payload as BackupPayloadV2).data.taskOrders).toHaveLength(1);
      expect(exportResult.filename).toMatch(/^taskflow-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
    });

    it("excludes sync runtime state and entity revisions from export", async () => {
      const db = await getDb();
      await db.put("tasks", mockTask({ id: "t1", revision: 4 }));
      await db.put("notes", mockNote({ id: "n1", revision: 2 }));
      await db.put("outbox", {
        mutationId: "mut_secret",
        workspaceId: "local",
        protocolVersion: 1,
        entityType: "task",
        entityId: "t1",
        action: "put",
        baseRevision: null,
        payload: { title: "Draft" },
        createdAt: "2026-10-25T10:00:00.000Z",
      });
      await db.put("sync_cursors", {
        workspaceId: "local",
        cursor: 12345,
        lastSyncedAt: "2026-10-25T10:00:00.000Z",
        updatedAt: "2026-10-25T10:00:00.000Z",
      });
      await db.put("tombstones", {
        id: "tomb_1",
        workspaceId: "local",
        entityType: "task",
        entityId: "old_task",
        deletedAt: "2026-10-25T10:00:00.000Z",
      });
      const attemptedMutation = {
        mutationId: "mut_conflict",
        workspaceId: "local",
        protocolVersion: 1 as const,
        entityType: "task" as const,
        entityId: "t1",
        action: "put" as const,
        baseRevision: 1,
        payload: { title: "Attempted title" },
        createdAt: "2026-10-25T10:00:00.000Z",
      };
      await db.put("conflicts", {
        id: "conf_1",
        workspaceId: "local",
        entityType: "task",
        entityId: "t1",
        baseRevision: 1,
        serverRevision: 2,
        currentServerEntity: { id: "t1", title: "Server title" },
        attemptedMutation,
        status: "open",
        detectedAt: "2026-10-25T10:00:00.000Z",
        resolvedAt: null,
      });

      const { payload, jsonString } = await exportDatabaseBackup("local");

      // Verify revision is stripped from entities
      expect(payload.data.tasks[0].revision).toBeUndefined();
      expect(payload.data.notes[0].revision).toBeUndefined();

      // Verify runtime sync stores and sensitive terms are completely absent
      const rawParsed = JSON.parse(jsonString) as Record<string, unknown>;
      expect(rawParsed.outbox).toBeUndefined();
      expect(rawParsed.sync_cursors).toBeUndefined();
      expect(rawParsed.tombstones).toBeUndefined();
      expect(rawParsed.conflicts).toBeUndefined();
      expect(jsonString).not.toContain("mut_secret");
      expect(jsonString).not.toContain("cur_12345");
      expect(jsonString).not.toContain("old_task");
    });

    it("exports records scoped to the requested workspaceId", async () => {
      const db = await getDb();
      await db.put("tasks", mockTask({ id: "t-local", workspaceId: "local" }));
      await db.put("tasks", mockTask({ id: "t-work", workspaceId: "work" }));

      const exportLocal = await exportDatabaseBackup("local");
      expect(exportLocal.payload.data.tasks).toHaveLength(1);
      expect(exportLocal.payload.data.tasks[0].id).toBe("t-local");

      const exportWork = await exportDatabaseBackup("work");
      expect(exportWork.payload.data.tasks).toHaveLength(1);
      expect(exportWork.payload.data.tasks[0].id).toBe("t-work");
    });

    it("restores backup in merge mode without removing existing distinct items", async () => {
      const db = await getDb();
      await db.put("tasks", mockTask({ id: "existing-task", title: "Existing Task" }));
      await db.put("notes", mockNote({ id: "existing-note", title: "Existing Note" }));

      const backup: BackupPayload = {
        version: 1,
        app: "TaskFlow",
        exportedAt: new Date().toISOString(),
        data: {
          tasks: [mockTask({ id: "new-task", title: "New Task" })],
          notes: [mockNote({ id: "new-note", title: "New Note" })],
        },
      };

      const result = await restoreDatabaseBackup(backup, "merge");
      expect(result.tasksCount).toBe(1);
      expect(result.notesCount).toBe(1);

      const allTasks = await db.getAll("tasks");
      const allNotes = await db.getAll("notes");
      expect(allTasks).toHaveLength(2);
      expect(allNotes).toHaveLength(2);
    });

    it("restores backup in replace mode wiping existing items only for target workspace", async () => {
      const db = await getDb();
      await db.put("tasks", mockTask({ id: "old-local-task", workspaceId: "local" }));
      await db.put("tasks", mockTask({ id: "work-task", workspaceId: "work" }));

      const backup: BackupPayloadV2 = {
        version: 2,
        app: "TaskFlow",
        exportedAt: new Date().toISOString(),
        workspaceId: "local",
        metadata: { format: "taskflow-backup-v2", exportedFrom: "web", schemaVersion: 9 },
        data: {
          tasks: [mockTask({ id: "fresh-local-task", workspaceId: "local" })],
          notes: [],
          taskOrders: [{ id: "local", orderedIds: ["fresh-local-task"] }],
        },
      };

      const result = await restoreDatabaseBackup(backup, "replace");
      expect(result.tasksCount).toBe(1);
      expect(result.taskOrdersCount).toBe(1);

      const allTasks = await db.getAll("tasks");
      expect(allTasks).toHaveLength(2);
      expect(allTasks.map((t) => t.id).sort()).toEqual(["fresh-local-task", "work-task"]);

      const restoredOrder = await db.get("task_orders", "local");
      expect(restoredOrder?.orderedIds).toEqual(["fresh-local-task"]);
    });

    it("restores version 1 legacy backups with workspaceId backfilled to local", async () => {
      const db = await getDb();
      const legacyBackup: BackupPayloadV1 = {
        version: 1,
        app: "TaskFlow",
        exportedAt: new Date().toISOString(),
        data: {
          tasks: [
            {
              id: "legacy-t1",
              title: "Legacy Task",
              description: "Legacy content",
              completed: false,
              priority: "high",
              dueDate: null,
              category: "work",
              createdAt: "2026-09-01T10:00:00.000Z",
              updatedAt: "2026-09-01T10:00:00.000Z",
              completedAt: null,
            },
          ],
          notes: [
            {
              id: "legacy-n1",
              title: "Legacy Note",
              body: "Legacy note body",
              createdAt: "2026-09-01T10:00:00.000Z",
              updatedAt: "2026-09-01T10:00:00.000Z",
            },
          ],
        },
      };

      const result = await restoreDatabaseBackup(legacyBackup, "replace");
      expect(result.tasksCount).toBe(1);
      expect(result.notesCount).toBe(1);

      const savedTask = await db.get("tasks", "legacy-t1");
      expect(savedTask?.workspaceId).toBe("local");

      const savedNote = await db.get("notes", "legacy-n1");
      expect(savedNote?.workspaceId).toBe("local");
    });

    it("sanitizes dangerous HTML in tasks and notes on restore", async () => {
      const db = await getDb();
      const backup: BackupPayload = {
        version: 1,
        app: "TaskFlow",
        exportedAt: new Date().toISOString(),
        data: {
          tasks: [
            mockTask({
              id: "xss-task",
              description:
                '<p>Task detail</p><script>alert("xss")</script><img src="x" onerror="steal()">',
            }),
          ],
          notes: [
            mockNote({
              id: "xss-note",
              body: '<h1>Heading</h1><iframe src="evil.com"></iframe><a href="javascript:alert(1)">Click</a>',
            }),
          ],
        },
      };

      await restoreDatabaseBackup(backup, "replace");

      const savedTask = await db.get("tasks", "xss-task");
      const savedNote = await db.get("notes", "xss-note");

      expect(savedTask?.description).toBe("<p>Task detail</p>");
      expect(savedNote?.body).toBe("<h1>Heading</h1><a>Click</a>");
    });

    it("exports and restores followups and occurrences round-trip", async () => {
      const db = await getDb();
      const sampleFollowUp = {
        id: "fu-1",
        workspaceId: "local",
        personName: "Bob Ross",
        commitment: "Send painting guide",
        details: "Oil on canvas techniques",
        dueAt: "2026-11-10T15:00:00.000Z",
        timeZone: "UTC",
        emailAddress: "bob@example.com",
        phoneNumber: null,
        whatsAppNumber: null,
        preferredAction: "email" as const,
        recurrence: null,
        status: "open" as const,
        sourceNoteId: null,
        sourceExcerpt: null,
        createdAt: "2026-10-24T12:00:00.000Z",
        updatedAt: "2026-10-24T12:00:00.000Z",
      };

      const sampleOccurrence = {
        id: "occ-1",
        workspaceId: "local",
        followUpId: "fu-1",
        dueAt: "2026-11-10T15:00:00.000Z",
        outcome: "completed" as const,
        resolvedAt: "2026-11-10T15:30:00.000Z",
        nextDueAt: null,
        notes: null,
      };

      await db.put("followups", sampleFollowUp);
      await db.put("followup_occurrences", sampleOccurrence);

      const exported = await exportDatabaseBackup();
      expect(exported.payload.data.followups).toHaveLength(1);
      expect(exported.payload.data.followupOccurrences).toHaveLength(1);

      await db.clear("followups");
      await db.clear("followup_occurrences");
      expect(await db.getAll("followups")).toHaveLength(0);

      const restoreResult = await restoreDatabaseBackup(exported.payload, "replace");
      expect(restoreResult.followupsCount).toBe(1);
      expect(restoreResult.occurrencesCount).toBe(1);

      const restoredFollowUp = await db.get("followups", "fu-1");
      expect(restoredFollowUp).toEqual(sampleFollowUp);

      const restoredOccurrences = await db.getAll("followup_occurrences");
      expect(restoredOccurrences).toHaveLength(1);
      expect(restoredOccurrences[0].id).toBe("occ-1");
    });

    it("round-trips daily plans through export and restore", async () => {
      const db = await getDb();
      const samplePlan = {
        id: "plan-1",
        workspaceId: "local",
        date: "2026-10-25",
        timeZone: "UTC",
        availableMinutes: 240,
        items: [
          {
            id: "it-1",
            type: "task" as const,
            targetId: "t-1",
            title: "Task 1",
            estimatedMinutes: 60,
            completed: false,
            recommendationReason: "Due today",
            order: 0,
          },
        ],
        acceptedAt: "2026-10-25T08:00:00.000Z",
        createdAt: "2026-10-25T08:00:00.000Z",
        updatedAt: "2026-10-25T08:00:00.000Z",
      };

      await db.put("daily_plans", samplePlan);

      const exported = await exportDatabaseBackup();
      expect(exported.payload.data.dailyPlans).toHaveLength(1);

      await db.clear("daily_plans");
      expect(await db.getAll("daily_plans")).toHaveLength(0);

      const restoreResult = await restoreDatabaseBackup(exported.payload, "replace");
      expect(restoreResult.plansCount).toBe(1);

      const restoredPlan = await db.get("daily_plans", "plan-1");
      expect(restoredPlan).toEqual(samplePlan);
    });

    it("round-trips tasks with sourceNoteId and sourceExcerpt through export and restore", async () => {
      const db = await getDb();
      const taskWithSource = mockTask({
        id: "task-linked",
        title: "Linked Task",
        sourceNoteId: "note-123",
        sourceExcerpt: "Snippet from note",
      });

      await db.put("tasks", taskWithSource);

      const exported = await exportDatabaseBackup();
      const exportedTask = exported.payload.data.tasks.find((t) => t.id === "task-linked");
      expect(exportedTask?.sourceNoteId).toBe("note-123");
      expect(exportedTask?.sourceExcerpt).toBe("Snippet from note");

      await db.clear("tasks");
      await restoreDatabaseBackup(exported.payload, "replace");

      const restored = await db.get("tasks", "task-linked");
      expect(restored?.sourceNoteId).toBe("note-123");
      expect(restored?.sourceExcerpt).toBe("Snippet from note");
    });

    it("round-trips inbox captures through export and restore", async () => {
      const db = await getDb();
      const sampleCapture: InboxCapture = {
        id: "cap-1",
        workspaceId: "local",
        text: "Read article later",
        sharedUrl: "https://example.com/read",
        sourceAppLabel: "Web Share",
        capturedAt: "2026-10-25T10:00:00.000Z",
        state: "pending",
        targetType: null,
        targetId: null,
        processedAt: null,
        discardedAt: null,
        createdAt: "2026-10-25T10:00:00.000Z",
        updatedAt: "2026-10-25T10:00:00.000Z",
      };

      await db.put("inbox_captures", sampleCapture);

      const exported = await exportDatabaseBackup();
      expect(exported.payload.data.inboxCaptures).toHaveLength(1);
      expect(exported.payload.data.inboxCaptures?.[0].id).toBe("cap-1");

      await db.clear("inbox_captures");
      expect(await db.getAll("inbox_captures")).toHaveLength(0);

      const restoreResult = await restoreDatabaseBackup(exported.payload, "replace");
      expect(restoreResult.capturesCount).toBe(1);

      const restored = await db.get("inbox_captures", "cap-1");
      expect(restored).toEqual(sampleCapture);
    });
  });

  describe("Cross-Platform Backup Fixtures", () => {
    it("imports valid v1 and v2 cross-platform backup fixtures", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");

      const resolveFixture = (rel: string) => {
        const candidates = [
          path.resolve(process.cwd(), "../../fixtures", rel),
          path.resolve(process.cwd(), "fixtures", rel),
          path.resolve(process.cwd(), "../fixtures", rel),
        ];
        const match = candidates.find((p) => fs.existsSync(p));
        expect(match).toBeDefined();
        return match!;
      };

      // Test v1 valid
      const v1Raw = fs.readFileSync(resolveFixture("backups/v1-valid.json"), "utf8");
      const v1Result = parseAndValidateBackup(v1Raw);
      expect(v1Result.ok).toBe(true);
      if (v1Result.ok) {
        const restoreV1 = await restoreDatabaseBackup(v1Result.value, "replace");
        expect(restoreV1.tasksCount).toBe(2);
        expect(restoreV1.notesCount).toBe(1);
      }

      const v2Raw = fs.readFileSync(resolveFixture("backups/v2-valid.json"), "utf8");
      const v2Result = parseAndValidateBackup(v2Raw);
      expect(v2Result.ok).toBe(true);
      if (v2Result.ok) {
        const restoreV2 = await restoreDatabaseBackup(v2Result.value, "replace");
        expect(restoreV2.tasksCount).toBe(1);
        expect(restoreV2.notesCount).toBe(1);
        expect(restoreV2.followupsCount).toBe(1);
        expect(restoreV2.plansCount).toBe(1);
        expect(restoreV2.capturesCount).toBe(1);
      }
    });

    it("cleanly rejects corrupted backup fixtures", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");

      const resolveFixture = (rel: string) => {
        const candidates = [
          path.resolve(process.cwd(), "../../fixtures", rel),
          path.resolve(process.cwd(), "fixtures", rel),
          path.resolve(process.cwd(), "../fixtures", rel),
        ];
        return candidates.find((p) => fs.existsSync(p))!;
      };

      const corruptedRaw = fs.readFileSync(resolveFixture("backups/v2-corrupted.json"), "utf8");
      const result = parseAndValidateBackup(corruptedRaw);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeTruthy();
      }
    });
  });
});
