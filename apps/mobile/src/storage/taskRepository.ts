import type { SqliteDatabase } from "../db/driver.js";
import type { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from "../types/task.js";
import { validateTaskInput } from "../services/validation.js";

interface TaskRow {
  id: string;
  title: string;
  description: string;
  completed: number;
  completed_at: string | null;
  priority: string;
  due_date: string | null;
  category: string | null;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TaskRepository {
  constructor(private db: SqliteDatabase) {}

  async create(input: CreateTaskInput): Promise<Task> {
    const validation = validateTaskInput(input, true);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid task input");
    }

    const id = "task_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();
    const title = input.title.trim();
    const description = input.description ? input.description.trim() : "";
    const priority = input.priority || "medium";
    const dueDate = input.dueDate || null;
    const category = input.category || null;

    await this.db.execute(
      `INSERT INTO tasks (id, title, description, completed, completed_at, priority, due_date, category, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, 0, null, priority, dueDate, category, now, now]
    );

    return {
      id,
      title,
      description,
      completed: false,
      completedAt: null,
      priority,
      dueDate,
      category,
      createdAt: now,
      updatedAt: now,
    };
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

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Task ${id} not found`);
    }

    const validation = validateTaskInput(input, false);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid task update");
    }

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

    await this.db.execute(
      `UPDATE tasks
       SET title = ?, description = ?, completed = ?, completed_at = ?, priority = ?, due_date = ?, category = ?, updated_at = ?
       WHERE id = ?`,
      [
        title,
        description,
        completed ? 1 : 0,
        completedAt,
        priority,
        dueDate,
        category,
        now,
        id,
      ]
    );

    return {
      id,
      title,
      description,
      completed,
      completedAt,
      priority,
      dueDate,
      category,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  }

  async toggleComplete(id: string): Promise<Task> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Task ${id} not found`);
    }
    return this.update(id, { completed: !existing.completed });
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    await this.db.execute("DELETE FROM tasks WHERE id = ?", [id]);
    return true;
  }
}
