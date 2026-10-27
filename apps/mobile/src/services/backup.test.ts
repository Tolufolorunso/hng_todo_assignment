import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySqliteDatabase } from "../db/driver.js";
import { runMigrations } from "../db/migrations.js";
import { TaskRepository } from "../storage/taskRepository.js";
import { NoteRepository } from "../storage/noteRepository.js";
import { BackupService } from "./backup.js";

describe("Mobile BackupService", () => {
  let db: InMemorySqliteDatabase;
  let taskRepo: TaskRepository;
  let noteRepo: NoteRepository;
  let backupService: BackupService;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);
    taskRepo = new TaskRepository(db);
    noteRepo = new NoteRepository(db);
    backupService = new BackupService(db, taskRepo, noteRepo);

    await taskRepo.create({
      title: "Initial Task",
      priority: "high",
      dueDate: "2026-10-28",
    });
    await noteRepo.create({
      title: "Initial Note",
      body: "Initial content",
    });
  });

  it("exports valid backup snapshot and JSON string", async () => {
    const snapshot = await backupService.exportSnapshot();
    expect(snapshot.version).toBe(2);
    expect(snapshot.origin).toBe("taskflow-mobile");
    expect(snapshot.tasks.length).toBe(1);
    expect(snapshot.notes.length).toBe(1);
    expect(snapshot.tasks[0].title).toBe("Initial Task");
    expect(snapshot.notes[0].title).toBe("Initial Note");

    const jsonStr = await backupService.exportJsonString();
    const parsed = JSON.parse(jsonStr);
    expect(parsed.tasks).toHaveLength(1);
  });

  it("imports backup in merge mode without removing existing data", async () => {
    const externalSnapshot = {
      version: 2,
      origin: "taskflow-web",
      tasks: [
        {
          id: "task_ext_1",
          title: "Imported Task",
          completed: false,
          priority: "medium",
        },
      ],
      notes: [
        {
          id: "note_ext_1",
          title: "Imported Note",
          body: "External note body",
        },
      ],
    };

    const result = await backupService.importSnapshot(externalSnapshot, "merge");
    expect(result.mode).toBe("merge");
    expect(result.tasksImported).toBe(1);
    expect(result.notesImported).toBe(1);

    const allTasks = await taskRepo.list();
    expect(allTasks).toHaveLength(2);

    const allNotes = await noteRepo.list();
    expect(allNotes).toHaveLength(2);
  });

  it("imports backup in replace mode replacing current data", async () => {
    const externalSnapshot = {
      version: 2,
      origin: "taskflow-web",
      tasks: [
        {
          id: "task_rep_1",
          title: "Only This Task Survives",
          priority: "low",
        },
      ],
      notes: [],
    };

    const result = await backupService.importSnapshot(externalSnapshot, "replace");
    expect(result.mode).toBe("replace");
    expect(result.tasksImported).toBe(1);

    const allTasks = await taskRepo.list();
    expect(allTasks).toHaveLength(1);
    expect(allTasks[0].title).toBe("Only This Task Survives");

    const allNotes = await noteRepo.list();
    expect(allNotes).toHaveLength(0);
  });

  it("rejects malformed or empty payloads", async () => {
    await expect(backupService.importSnapshot("not-json")).rejects.toThrow(
      "Invalid JSON: failed to parse backup data"
    );
    await expect(backupService.importSnapshot({ tasks: [], notes: [] })).rejects.toThrow(
      "Invalid backup: no valid tasks or notes found in snapshot"
    );
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

      const v1Raw = fs.readFileSync(resolveFixture("backups/v1-valid.json"), "utf8");
      const v1Result = await backupService.importSnapshot(v1Raw, "replace");
      expect(v1Result.tasksImported).toBe(2);
      expect(v1Result.notesImported).toBe(1);

      const v2Raw = fs.readFileSync(resolveFixture("backups/v2-valid.json"), "utf8");
      const v2Result = await backupService.importSnapshot(v2Raw, "replace");
      expect(v2Result.tasksImported).toBe(1);
      expect(v2Result.notesImported).toBe(1);
    });

    it("rejects corrupted backup fixtures", async () => {
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
      await expect(backupService.importSnapshot(corruptedRaw)).rejects.toThrow();
    });
  });
});
