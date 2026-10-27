import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySqliteDatabase } from "../db/driver";
import { runMigrations } from "../db/migrations";
import { TaskRepository } from "../storage/taskRepository";
import { NoteRepository } from "../storage/noteRepository";
import { SearchService } from "./search";

describe("Mobile SearchService", () => {
  let db: InMemorySqliteDatabase;
  let taskRepo: TaskRepository;
  let noteRepo: NoteRepository;
  let searchService: SearchService;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);
    taskRepo = new TaskRepository(db);
    noteRepo = new NoteRepository(db);
    searchService = new SearchService(taskRepo, noteRepo);

    await taskRepo.create({
      title: "Plan Architecture Meeting",
      description: "Discuss offline-first SQLite strategies",
      priority: "high",
    });
    await taskRepo.create({
      title: "Deploy Vercel App",
      description: "Check production build status",
      priority: "medium",
    });

    await noteRepo.create({
      title: "Architecture Decisions",
      body: "We decided to keep apps/mobile isolated with its own SQLite database.",
    });
    await noteRepo.create({
      title: "Sprint Retrospective",
      body: "Great teamwork on the synchronization engine.",
    });
  });

  it("returns empty results for empty query", async () => {
    const res = await searchService.search("   ");
    expect(res.totalCount).toBe(0);
    expect(res.tasks).toEqual([]);
    expect(res.notes).toEqual([]);
  });

  it("finds matching tasks and notes across titles and bodies", async () => {
    const res = await searchService.search("Architecture");
    expect(res.totalCount).toBe(2);
    expect(res.tasks.length).toBe(1);
    expect(res.tasks[0].title).toBe("Plan Architecture Meeting");
    expect(res.notes.length).toBe(1);
    expect(res.notes[0].title).toBe("Architecture Decisions");
  });

  it("finds tasks by description match", async () => {
    const res = await searchService.search("SQLite");
    expect(res.tasks.length).toBe(1);
    expect(res.tasks[0].title).toBe("Plan Architecture Meeting");
    expect(res.notes.length).toBe(1);
    expect(res.notes[0].title).toBe("Architecture Decisions");
  });

  it("respects result limit parameter", async () => {
    const res = await searchService.search("a", { limit: 1 });
    expect(res.tasks.length).toBeLessThanOrEqual(1);
    expect(res.notes.length).toBeLessThanOrEqual(1);
  });
});
