import type { CreateTaskInput, UpdateTaskInput, TaskPriority, TaskCategory } from "../types/task.js";
import type { CreateNoteInput, UpdateNoteInput } from "../types/note.js";

export interface ValidationResult {
  valid: boolean;
  field?: string;
  error?: string;
}

const VALID_PRIORITIES = new Set<TaskPriority>(["low", "medium", "high"]);
const VALID_CATEGORIES = new Set<TaskCategory>(["work", "personal", "urgent", "study", "ideas"]);
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateTaskInput(input: CreateTaskInput | UpdateTaskInput, isCreate = false): ValidationResult {
  if (isCreate || input.title !== undefined) {
    if (!input.title || typeof input.title !== "string" || input.title.trim().length === 0) {
      return { valid: false, field: "title", error: "Title is required" };
    }
    if (input.title.trim().length > 200) {
      return { valid: false, field: "title", error: "Title must be 200 characters or less" };
    }
  }

  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== "string") {
      return { valid: false, field: "description", error: "Description must be a string" };
    }
    if (input.description.length > 20000) {
      return { valid: false, field: "description", error: "Description must be 20000 characters or less" };
    }
  }

  if (input.priority !== undefined) {
    if (!VALID_PRIORITIES.has(input.priority)) {
      return { valid: false, field: "priority", error: "Priority must be low, medium, or high" };
    }
  }

  if (input.category !== undefined && input.category !== null) {
    if (!VALID_CATEGORIES.has(input.category)) {
      return { valid: false, field: "category", error: "Invalid category" };
    }
  }

  if (input.dueDate !== undefined && input.dueDate !== null) {
    if (typeof input.dueDate !== "string" || !DATE_FORMAT_REGEX.test(input.dueDate)) {
      return { valid: false, field: "dueDate", error: "Due date must be in YYYY-MM-DD format" };
    }
    const [year, month, day] = input.dueDate.split("-").map((v) => parseInt(v, 10));
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
      return { valid: false, field: "dueDate", error: "Due date is not a valid calendar day" };
    }
  }

  return { valid: true };
}

export function validateNoteInput(input: CreateNoteInput | UpdateNoteInput, isCreate = false): ValidationResult {
  if (isCreate || input.title !== undefined) {
    if (!input.title || typeof input.title !== "string" || input.title.trim().length === 0) {
      return { valid: false, field: "title", error: "Title is required" };
    }
    if (input.title.trim().length > 200) {
      return { valid: false, field: "title", error: "Title must be 200 characters or less" };
    }
  }

  if (input.body !== undefined && input.body !== null) {
    if (typeof input.body !== "string") {
      return { valid: false, field: "body", error: "Body must be a string" };
    }
    if (input.body.length > 50000) {
      return { valid: false, field: "body", error: "Body must be 50000 characters or less" };
    }
  }

  return { valid: true };
}
