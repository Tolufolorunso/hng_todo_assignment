import { getDb } from "@/lib/db";
import { stripHtmlToText } from "@/lib/html";
import {
  validateTaskInput,
  validateTaskPatch,
  type TaskInput,
  type TaskPatch,
} from "@/lib/validation";
import type { Task, TaskCategory, TaskPriority } from "@/types/task";

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
    category: validation.value.category,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    ...(validation.value.order !== undefined ? { order: validation.value.order } : {}),
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

export async function reorderTasks(orderedIds: string[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("tasks", "readwrite");
  for (let i = 0; i < orderedIds.length; i++) {
    const task = await tx.store.get(orderedIds[i]);
    if (task) {
      task.order = i;
      task.updatedAt = now();
      await tx.store.put(task);
    }
  }
  await tx.done;
}

/**
 * Interleaves reordered visible tasks with existing hidden tasks, preserving
 * the original slot positions occupied by hidden tasks rather than pushing them
 * to the end of the manual order.
 */
export function interleaveReorderedTasks(
  allTasks: Task[],
  reorderedVisible: Task[],
): Task[] {
  const visibleIdSet = new Set(reorderedVisible.map((t) => t.id));
  let visibleIndex = 0;
  const result: Task[] = [];

  for (const task of allTasks) {
    if (visibleIdSet.has(task.id)) {
      if (visibleIndex < reorderedVisible.length) {
        result.push(reorderedVisible[visibleIndex]);
        visibleIndex++;
      }
    } else {
      result.push(task);
    }
  }

  while (visibleIndex < reorderedVisible.length) {
    result.push(reorderedVisible[visibleIndex]);
    visibleIndex++;
  }

  return result;
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

export type TaskStatusFilter = "all" | "active" | "completed";
export type TaskSortKey = "manual" | "created" | "dueDate" | "priority";

const PRIORITY_RANK: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function byCreatedThenId(a: Task, b: Task): number {
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? 1 : -1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function searchTasks(tasks: Task[], query: string): Task[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    return tasks;
  }
  return tasks.filter((task) => {
    if (task.title.toLowerCase().includes(needle)) {
      return true;
    }
    const plain = stripHtmlToText(task.description).toLowerCase();
    return plain.includes(needle) || task.description.toLowerCase().includes(needle);
  });
}

export function filterTasksByStatus(
  tasks: Task[],
  status: TaskStatusFilter,
): Task[] {
  if (status === "active") {
    return tasks.filter((task) => !task.completed);
  }
  if (status === "completed") {
    return tasks.filter((task) => task.completed);
  }
  return tasks;
}

export type TaskCategoryFilter = "all" | TaskCategory;

export function filterTasksByCategory(
  tasks: Task[],
  category: TaskCategoryFilter,
): Task[] {
  if (category === "all") {
    return tasks;
  }
  return tasks.filter((task) => task.category === category);
}

export function sortTasks(tasks: Task[], sort: TaskSortKey): Task[] {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    if (sort === "manual") {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return byCreatedThenId(a, b);
    }
    if (sort === "created") {
      return byCreatedThenId(a, b);
    }
    if (sort === "priority") {
      const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      return rank !== 0 ? rank : byCreatedThenId(a, b);
    }
    // due date: ascending, with tasks that have no due date after dated ones
    if (a.dueDate === null && b.dueDate === null) {
      return byCreatedThenId(a, b);
    }
    if (a.dueDate === null) {
      return 1;
    }
    if (b.dueDate === null) {
      return -1;
    }
    if (a.dueDate !== b.dueDate) {
      return a.dueDate < b.dueDate ? -1 : 1;
    }
    return byCreatedThenId(a, b);
  });
  return sorted;
}
