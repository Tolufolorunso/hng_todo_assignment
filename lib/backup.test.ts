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
  });
});
