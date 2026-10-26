import type { SqliteDatabase } from "../db/driver.js";
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from "../types/task.js";
import { validateTaskInput } from "../services/validation.js";
import { SyncRepository, type RepositoryOptions } from "./syncRepository.js";

interface TaskRow {
  id: string;
  title: string;
  description: string;
  completed: number;
  completed_at: string | null;
  priority: string;
  due_date: string | null;
  category: string | null;
  estimated_minutes?: number | null;
  source_note_id?: string | null;
  source_excerpt?: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    completed: row.completed === 1,
    completedAt: row.completed_at,
    priority: (row.priority as Task["priority"]) || "medium",
    dueDate: row.due_date,
    category: (row.category as Task["category"]) || null,
    estimatedMinutes:
      row.estimated_minutes !== undefined && row.estimated_minutes !== null
        ? Number(row.estimated_minutes)
        : null,
    sourceNoteId: row.source_note_id || null,
    sourceExcerpt: row.source_excerpt || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TaskRepository {
  constructor(private db: SqliteDatabase) {}

  private getExecutor(options?: RepositoryOptions): SqliteDatabase {
    return options?.tx || this.db;
  }

  async create(input: CreateTaskInput, options?: RepositoryOptions): Promise<Task> {
    const validation = validateTaskInput(input, true);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid task input");
    }

    const executor = this.getExecutor(options);
    const id = "task_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();
    const title = input.title.trim();
    const description = input.description ? input.description.trim() : "";
    const priority = input.priority || "medium";
    const dueDate = input.dueDate || null;
    const category = input.category || null;
    const estimatedMinutes = input.estimatedMinutes !== undefined ? input.estimatedMinutes : null;
    const sourceNoteId = input.sourceNoteId || null;
    const sourceExcerpt = input.sourceExcerpt || null;

    await executor.execute(
      `INSERT INTO tasks (
        id, title, description, completed, completed_at, priority, due_date, category,
        estimated_minutes, source_note_id, source_excerpt, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        description,
        0,
        null,
        priority,
        dueDate,
        category,
        estimatedMinutes,
        sourceNoteId,
        sourceExcerpt,
        now,
        now,
      ]
    );

    const task: Task = {
      id,
      title,
      description,
      completed: false,
      completedAt: null,
      priority,
      dueDate,
      category,
      estimatedMinutes,
      sourceNoteId,
      sourceExcerpt,
      createdAt: now,
      updatedAt: now,
    };

    if (options?.enqueueOutbox) {
      const syncRepo = new SyncRepository(executor);
      await syncRepo.enqueueOutbox(
        {
          entityType: "task",
          entityId: id,
          action: "put",
          payload: JSON.stringify(task),
        },
        executor
      );
    }

    return task;
  }

  async getById(id: string): Promise<Task | null> {
    const row = await this.db.queryFirst<TaskRow>(
      "SELECT * FROM tasks WHERE id = ?",
      [id]
    );
    return row ? mapRowToTask(row) : null;
  }

  async list(filter?: TaskFilter): Promise<Task[]> {
    const rows = await this.db.query<TaskRow>(
      "SELECT * FROM tasks ORDER BY created_at DESC"
    );
    let tasks = rows.map(mapRowToTask);

    if (filter) {
      if (filter.completed !== undefined) {
        tasks = tasks.filter((t) => t.completed === filter.completed);
      }
      if (filter.priority !== undefined) {
        tasks = tasks.filter((t) => t.priority === filter.priority);
      }
      if (filter.category !== undefined) {
        tasks = tasks.filter((t) => t.category === filter.category);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        tasks = tasks.filter(
          (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
        );
      }
    }

    return tasks;
  }

  async update(id: string, input: UpdateTaskInput, options?: RepositoryOptions): Promise<Task> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Task ${id} not found`);
    }

    const validation = validateTaskInput(input, false);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid task update");
    }

    const executor = this.getExecutor(options);
    const now = new Date().toISOString();
    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const description = input.description !== undefined ? input.description.trim() : existing.description;
    const completed = input.completed !== undefined ? input.completed : existing.completed;
    const completedAt =
      input.completed !== undefined
        ? input.completed
          ? existing.completedAt || now
          : null
        : existing.completedAt;
    const priority = input.priority !== undefined ? input.priority : existing.priority;
    const dueDate = input.dueDate !== undefined ? input.dueDate : existing.dueDate;
    const category = input.category !== undefined ? input.category : existing.category;
    const estimatedMinutes =
      input.estimatedMinutes !== undefined ? input.estimatedMinutes : existing.estimatedMinutes;
    const sourceNoteId =
      input.sourceNoteId !== undefined ? input.sourceNoteId : existing.sourceNoteId;
    const sourceExcerpt =
      input.sourceExcerpt !== undefined ? input.sourceExcerpt : existing.sourceExcerpt;

    await executor.execute(
      `UPDATE tasks
       SET title = ?, description = ?, completed = ?, completed_at = ?, priority = ?, due_date = ?,
           category = ?, estimated_minutes = ?, source_note_id = ?, source_excerpt = ?, updated_at = ?
       WHERE id = ?`,
      [
        title,
        description,
        completed ? 1 : 0,
        completedAt,
        priority,
        dueDate,
        category,
        estimatedMinutes,
        sourceNoteId,
        sourceExcerpt,
        now,
        id,
      ]
    );

    const updatedTask: Task = {
      id,
      title,
      description,
      completed,
      completedAt,
      priority,
      dueDate,
      category,
      estimatedMinutes,
      sourceNoteId,
      sourceExcerpt,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    if (options?.enqueueOutbox) {
      const syncRepo = new SyncRepository(executor);
      const baseRev = await syncRepo.getServerRevision("task", id);
      await syncRepo.enqueueOutbox(
        {
          entityType: "task",
          entityId: id,
          action: "put",
          baseRevision: baseRev,
          payload: JSON.stringify(updatedTask),
        },
        executor
      );
    }

    return updatedTask;
  }

  async toggleComplete(id: string, options?: RepositoryOptions): Promise<Task> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Task ${id} not found`);
    }
    return this.update(id, { completed: !existing.completed }, options);
  }

  async delete(id: string, options?: RepositoryOptions): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    const executor = this.getExecutor(options);
    await executor.execute("DELETE FROM tasks WHERE id = ?", [id]);

    if (options?.enqueueOutbox) {
      const syncRepo = new SyncRepository(executor);
      const baseRev = await syncRepo.getServerRevision("task", id);
      await syncRepo.enqueueOutbox(
        {
          entityType: "task",
          entityId: id,
          action: "delete",
          baseRevision: baseRev,
        },
        executor
      );
      await syncRepo.recordTombstone("local", "task", id, executor);
    }

    return true;
  }

  async putRaw(task: Task, tx?: SqliteDatabase): Promise<void> {
    const executor = tx || this.db;
    const existing = await executor.queryFirst<{ id: string }>("SELECT id FROM tasks WHERE id = ?", [task.id]);
    if (existing) {
      await executor.execute(
        `UPDATE tasks
         SET title = ?, description = ?, completed = ?, completed_at = ?, priority = ?, due_date = ?,
             category = ?, estimated_minutes = ?, source_note_id = ?, source_excerpt = ?, updated_at = ?
         WHERE id = ?`,
        [
          task.title,
          task.description,
          task.completed ? 1 : 0,
          task.completedAt,
          task.priority,
          task.dueDate,
          task.category,
          task.estimatedMinutes,
          task.sourceNoteId,
          task.sourceExcerpt,
          task.updatedAt,
          task.id,
        ]
      );
    } else {
      await executor.execute(
        `INSERT INTO tasks (
          id, title, description, completed, completed_at, priority, due_date, category,
          estimated_minutes, source_note_id, source_excerpt, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.title,
          task.description,
          task.completed ? 1 : 0,
          task.completedAt,
          task.priority,
          task.dueDate,
          task.category,
          task.estimatedMinutes,
          task.sourceNoteId,
          task.sourceExcerpt,
          task.createdAt,
          task.updatedAt,
        ]
      );
    }
  }
}
