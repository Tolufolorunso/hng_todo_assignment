import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
  buildBackupPayload,
  exportDatabaseBackup,
  generateBackupFilename,
  isValidNote,
  isValidTask,
  parseAndValidateBackup,
  restoreDatabaseBackup,
  type BackupPayload,
} from "@/lib/backup";
import { deleteDb, getDb } from "@/lib/db";
import type { Note } from "@/types/note";
import type { Task } from "@/types/task";

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
        true,
      );
    });

    it("rejects invalid task objects", () => {
      expect(isValidTask(null)).toBe(false);
      expect(isValidTask({})).toBe(false);
      expect(isValidTask(mockTask({ title: "" }))).toBe(false);
      expect(isValidTask(mockTask({ priority: "urgent" as unknown as Task["priority"] }))).toBe(false);
      expect(isValidTask(mockTask({ category: "invalid-cat" as unknown as Task["category"] }))).toBe(false);
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
  });

  describe("payload builders & filename", () => {
    it("builds valid BackupPayload structure", () => {
      const tasks = [mockTask()];
      const notes = [mockNote()];
      const payload = buildBackupPayload(tasks, notes);

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
    it("accepts valid JSON backup payload", () => {
      const payload = buildBackupPayload([mockTask()], [mockNote()]);
      const json = JSON.stringify(payload);
      const result = parseAndValidateBackup(json);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.data.tasks).toHaveLength(1);
        expect(result.value.data.notes).toHaveLength(1);
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
      const result = parseAndValidateBackup(JSON.stringify({ app: "OtherApp", version: 1 }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Not a valid TaskFlow backup");
      }
    });

    it("identifies corrupted task in backup", () => {
      const badPayload = {
        version: 1,
        app: "TaskFlow",
        exportedAt: new Date().toISOString(),
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
    it("exports database tasks and notes into backup snapshot", async () => {
      const db = await getDb();
      await db.put("tasks", mockTask({ id: "t1" }));
      await db.put("notes", mockNote({ id: "n1" }));

      const exportResult = await exportDatabaseBackup();
      expect(exportResult.payload.data.tasks).toHaveLength(1);
      expect(exportResult.payload.data.notes).toHaveLength(1);
      expect(exportResult.filename).toMatch(/^taskflow-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
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

    it("restores backup in replace mode wiping existing items", async () => {
      const db = await getDb();
      await db.put("tasks", mockTask({ id: "old-task", title: "Old Task" }));
      await db.put("notes", mockNote({ id: "old-note", title: "Old Note" }));

      const backup: BackupPayload = {
        version: 1,
        app: "TaskFlow",
        exportedAt: new Date().toISOString(),
        data: {
          tasks: [mockTask({ id: "fresh-task", title: "Fresh Task" })],
          notes: [mockNote({ id: "fresh-note", title: "Fresh Note" })],
        },
      };

      const result = await restoreDatabaseBackup(backup, "replace");
      expect(result.tasksCount).toBe(1);
      expect(result.notesCount).toBe(1);

      const allTasks = await db.getAll("tasks");
      const allNotes = await db.getAll("notes");
      expect(allTasks).toHaveLength(1);
      expect(allTasks[0].id).toBe("fresh-task");
      expect(allNotes).toHaveLength(1);
      expect(allNotes[0].id).toBe("fresh-note");
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
              description: '<p>Task detail</p><script>alert("xss")</script><img src="x" onerror="steal()">',
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

      // Clear db
      await db.clear("followups");
      await db.clear("followup_occurrences");
      expect(await db.getAll("followups")).toHaveLength(0);

      // Restore
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
  });
});

