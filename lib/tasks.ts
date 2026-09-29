import { getDb } from "@/lib/db";
import {
  validateTaskInput,
  validateTaskPatch,
  type TaskInput,
  type TaskPatch,
} from "@/lib/validation";
import type { Task } from "@/types/task";

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskValidationError";
  }
}

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task not found: ${id}`);
    this.name = "TaskNotFoundError";
  }
}

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export async function createTask(input: TaskInput): Promise<Task> {
  const validation = validateTaskInput(input);
  if (!validation.ok) {
    throw new TaskValidationError(validation.error);
  }

  const timestamp = now();
  const task: Task = {
    id: newId(),
    title: validation.value.title,
    description: validation.value.description,
    completed: false,
    priority: validation.value.priority,
    dueDate: validation.value.dueDate,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };

  const db = await getDb();
  await db.put("tasks", task);
  return task;
}

export async function getTask(id: string): Promise<Task | undefined> {
  const db = await getDb();
  return db.get("tasks", id);
}

export async function listTasks(): Promise<Task[]> {
  const db = await getDb();
  const tasks = await db.getAll("tasks");
  return tasks.sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? 1 : -1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
  const validation = validateTaskPatch(patch);
  if (!validation.ok) {
    throw new TaskValidationError(validation.error);
  }

  const db = await getDb();
  const existing = await db.get("tasks", id);
  if (existing === undefined) {
    throw new TaskNotFoundError(id);
  }

  const updated: Task = { ...existing, ...validation.value, updatedAt: now() };
  if (validation.value.completed !== undefined) {
    updated.completedAt = validation.value.completed ? now() : null;
  }

  await db.put("tasks", updated);
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("tasks", id);
}

export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isOverdue(task: Task, todayIso: string): boolean {
  if (task.completed || task.dueDate === null) {
    return false;
  }
  return task.dueDate < todayIso;
}
