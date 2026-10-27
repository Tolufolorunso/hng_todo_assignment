import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySqliteDatabase } from "../db/driver";
import { runMigrations } from "../db/migrations";
import { TaskRepository } from "./taskRepository";
import { NoteRepository } from "./noteRepository";

describe("Mobile Task and Note Repositories", () => {
  let db: InMemorySqliteDatabase;
  let taskRepo: TaskRepository;
  let noteRepo: NoteRepository;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);
    taskRepo = new TaskRepository(db);
    noteRepo = new NoteRepository(db);
  });

  describe("TaskRepository CRUD & Filters", () => {
    it("creates a task with valid attributes", async () => {
      const task = await taskRepo.create({
        title: "Buy groceries",
        description: "Milk, eggs, and bread",
        priority: "high",
        dueDate: "2026-10-30",
        category: "personal",
      });

      expect(task.id).toMatch(/^task_/);
      expect(task.title).toBe("Buy groceries");
      expect(task.description).toBe("Milk, eggs, and bread");
      expect(task.priority).toBe("high");
      expect(task.dueDate).toBe("2026-10-30");
      expect(task.category).toBe("personal");
      expect(task.completed).toBe(false);
      expect(task.completedAt).toBeNull();
    });

    it("rejects invalid task input", async () => {
      await expect(taskRepo.create({ title: "   " })).rejects.toThrow("Title is required");
      await expect(taskRepo.create({ title: "a".repeat(201) })).rejects.toThrow("Title must be 200 characters or less");
      await expect(
        taskRepo.create({ title: "Valid Title", priority: "urgent" as any })
      ).rejects.toThrow("Priority must be low, medium, or high");
      await expect(
        taskRepo.create({ title: "Valid Title", dueDate: "invalid-date" })
      ).rejects.toThrow("Due date must be in YYYY-MM-DD format");
    });

    it("lists and filters tasks by completion, category, priority, and search", async () => {
      const t1 = await taskRepo.create({ title: "Work meeting", priority: "high", category: "work" });
      const t2 = await taskRepo.create({ title: "Read book", priority: "low", category: "study" });
      const t3 = await taskRepo.create({ title: "Gym workout", priority: "medium", category: "personal" });

      await taskRepo.toggleComplete(t2.id);

      const all = await taskRepo.list();
      expect(all.length).toBe(3);

      const completed = await taskRepo.list({ completed: true });
      expect(completed.length).toBe(1);
      expect(completed[0].id).toBe(t2.id);

      const highPriority = await taskRepo.list({ priority: "high" });
      expect(highPriority.length).toBe(1);
      expect(highPriority[0].id).toBe(t1.id);

      const workCategory = await taskRepo.list({ category: "work" });
      expect(workCategory.length).toBe(1);
      expect(workCategory[0].id).toBe(t1.id);

      const searched = await taskRepo.list({ search: "gym" });
      expect(searched.length).toBe(1);
      expect(searched[0].id).toBe(t3.id);
    });

    it("updates task fields and toggles completion", async () => {
      const task = await taskRepo.create({ title: "Initial Title", priority: "low" });

      const updated = await taskRepo.update(task.id, {
        title: "Updated Title",
        priority: "high",
        category: "ideas",
      });
      expect(updated.title).toBe("Updated Title");
      expect(updated.priority).toBe("high");
      expect(updated.category).toBe("ideas");

      const toggled = await taskRepo.toggleComplete(task.id);
      expect(toggled.completed).toBe(true);
      expect(toggled.completedAt).not.toBeNull();

      const toggledBack = await taskRepo.toggleComplete(task.id);
      expect(toggledBack.completed).toBe(false);
      expect(toggledBack.completedAt).toBeNull();
    });

    it("deletes a task", async () => {
      const task = await taskRepo.create({ title: "To be deleted" });
      const deleted = await taskRepo.delete(task.id);
      expect(deleted).toBe(true);

      const fetched = await taskRepo.getById(task.id);
      expect(fetched).toBeNull();
    });
  });

  describe("NoteRepository CRUD & Search", () => {
    it("creates, reads, updates, and deletes notes", async () => {
      const note = await noteRepo.create({
        title: "Meeting Notes",
        body: "Discuss mobile architecture and SQLite persistence",
      });

      expect(note.id).toMatch(/^note_/);
      expect(note.title).toBe("Meeting Notes");
      expect(note.body).toBe("Discuss mobile architecture and SQLite persistence");

      const fetched = await noteRepo.getById(note.id);
      expect(fetched).toEqual(note);

      const updated = await noteRepo.update(note.id, {
        title: "Updated Meeting Notes",
        body: "Action items decided",
      });
      expect(updated.title).toBe("Updated Meeting Notes");
      expect(updated.body).toBe("Action items decided");

      const searchMatch = await noteRepo.list("action items");
      expect(searchMatch.length).toBe(1);
      expect(searchMatch[0].id).toBe(note.id);

      const searchNoMatch = await noteRepo.list("unrelated topic");
      expect(searchNoMatch.length).toBe(0);

      const deleted = await noteRepo.delete(note.id);
      expect(deleted).toBe(true);
      expect(await noteRepo.getById(note.id)).toBeNull();
    });

    it("rejects invalid note inputs", async () => {
      await expect(noteRepo.create({ title: "   " })).rejects.toThrow("Title is required");
      await expect(noteRepo.create({ title: "a".repeat(201) })).rejects.toThrow("Title must be 200 characters or less");
    });
  });
});
