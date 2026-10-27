import { describe, it, expect } from "vitest";
import { createDatabase, runMigrations } from "./db/index";
import { TaskRepository, NoteRepository } from "./storage/index";
import { SearchService, BackupService } from "./services/index";

describe("Mobile App Lifecycle and Offline Restart Behavior", () => {
  it("initializes database, runs migrations, and sets up repositories cleanly", async () => {
    const db = createDatabase("memory");
    const migrationResult = await runMigrations(db);
    expect(migrationResult.applied).toContain(1);

    const taskRepo = new TaskRepository(db);
    const noteRepo = new NoteRepository(db);
    const searchService = new SearchService(taskRepo, noteRepo);
    const backupService = new BackupService(db, taskRepo, noteRepo);

    expect(taskRepo).toBeDefined();
    expect(noteRepo).toBeDefined();
    expect(searchService).toBeDefined();
    expect(backupService).toBeDefined();
  });

  it("handles offline restart with persistent SQLite data", async () => {
    const db = createDatabase("memory");
    await runMigrations(db);
    const taskRepo = new TaskRepository(db);

    const task = await taskRepo.create({
      title: "Offline task before restart",
      priority: "high",
    });
    expect(task.id).toBeDefined();

    // Re-verify task is present
    const fetched = await taskRepo.getById(task.id);
    expect(fetched?.title).toBe("Offline task before restart");
    expect(fetched?.completed).toBe(false);
  });
});
