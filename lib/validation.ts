import type { TaskCategory, TaskPriority } from "@/types/task";

export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 20000;

const TASK_PRIORITY_VALUES: readonly TaskPriority[] = ["low", "medium", "high"];
const DEFAULT_TASK_PRIORITY: TaskPriority = "medium";
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TASK_CATEGORY_VALUES: readonly TaskCategory[] = [
  "work",
  "personal",
  "urgent",
  "study",
  "ideas",
];

export type TaskField =
  | "title"
  | "description"
  | "completed"
  | "priority"
  | "dueDate"
  | "category"
  | "order";

export type NoteField = "title" | "body";

export type ValidationResult<T, F extends string = string> =
  | { ok: true; value: T }
  | { ok: false; error: string; field?: F };

export interface TaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  category?: TaskCategory | null;
  order?: number;
}

export interface ValidTaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string | null;
  category: TaskCategory | null;
  order?: number;
}

export interface TaskPatch {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TaskPriority;
  dueDate?: string | null;
  category?: TaskCategory | null;
  order?: number;
}

export interface ValidTaskPatch {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TaskPriority;
  dueDate?: string | null;
  category?: TaskCategory | null;
  order?: number;
}

function validateTitle(raw: string): ValidationResult<string, TaskField> {
  const title = raw.trim();
  if (title.length === 0) {
    return { ok: false, error: "Title is required.", field: "title" };
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`,
      field: "title",
    };
  }
  return { ok: true, value: title };
}

function validateDescription(raw: string): ValidationResult<string, TaskField> {
  const description = raw.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,
      field: "description",
    };
  }
  return { ok: true, value: description };
}

function validatePriority(
  raw: TaskPriority | undefined,
): ValidationResult<TaskPriority, TaskField> {
  if (raw === undefined) {
    return { ok: true, value: DEFAULT_TASK_PRIORITY };
  }
  if (typeof raw !== "string" || !TASK_PRIORITY_VALUES.includes(raw)) {
    return {
      ok: false,
      error: "Priority must be low, medium, or high.",
      field: "priority",
    };
  }
  return { ok: true, value: raw };
}

function validateDueDate(
  raw: string | null | undefined,
): ValidationResult<string | null, TaskField> {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: null };
  }
  if (typeof raw !== "string" || !DATE_ONLY_PATTERN.test(raw)) {
    return { ok: false, error: "Due date must be a valid date.", field: "dueDate" };
  }
  const [year, month, day] = raw.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
  if (!isRealDate) {
    return { ok: false, error: "Due date must be a valid date.", field: "dueDate" };
  }
  return { ok: true, value: raw };
}

function validateCategory(
  raw: TaskCategory | null | undefined,
): ValidationResult<TaskCategory | null, TaskField> {
  if (raw === undefined || raw === null) {
    return { ok: true, value: null };
  }
  if (typeof raw !== "string" || !TASK_CATEGORY_VALUES.includes(raw as TaskCategory)) {
    return {
      ok: false,
      error: "Category must be work, personal, urgent, study, ideas, or null.",
      field: "category",
    };
  }
  return { ok: true, value: raw as TaskCategory };
}

export function validateTaskInput(input: TaskInput): ValidationResult<ValidTaskInput, TaskField> {
  const title = validateTitle(input.title);
  if (!title.ok) {
    return title;
  }
  const description = validateDescription(input.description ?? "");
  if (!description.ok) {
    return description;
  }
  const priority = validatePriority(input.priority);
  if (!priority.ok) {
    return priority;
  }
  const dueDate = validateDueDate(input.dueDate);
  if (!dueDate.ok) {
    return dueDate;
  }
  const category = validateCategory(input.category);
  if (!category.ok) {
    return category;
  }
  if (input.order !== undefined) {
    if (typeof input.order !== "number" || !Number.isFinite(input.order)) {
      return { ok: false, error: "Order must be a valid number.", field: "order" };
    }
  }
  return {
    ok: true,
    value: {
      title: title.value,
      description: description.value,
      priority: priority.value,
      dueDate: dueDate.value,
      category: category.value,
      ...(input.order !== undefined ? { order: input.order } : {}),
    },
  };
}

export function validateTaskPatch(patch: TaskPatch): ValidationResult<ValidTaskPatch, TaskField> {
  const value: ValidTaskPatch = {};

  if (patch.title !== undefined) {
    const title = validateTitle(patch.title);
    if (!title.ok) {
      return title;
    }
    value.title = title.value;
  }

  if (patch.description !== undefined) {
    const description = validateDescription(patch.description);
    if (!description.ok) {
      return description;
    }
    value.description = description.value;
  }

  if (patch.completed !== undefined) {
    if (typeof patch.completed !== "boolean") {
      return { ok: false, error: "Completed must be a boolean.", field: "completed" };
    }
    value.completed = patch.completed;
  }

  if (patch.priority !== undefined) {
    const priority = validatePriority(patch.priority);
    if (!priority.ok) {
      return priority;
    }
    value.priority = priority.value;
  }

  if (patch.dueDate !== undefined) {
    const dueDate = validateDueDate(patch.dueDate);
    if (!dueDate.ok) {
      return dueDate;
    }
    value.dueDate = dueDate.value;
  }

  if (patch.category !== undefined) {
    const category = validateCategory(patch.category);
    if (!category.ok) {
      return category;
    }
    value.category = category.value;
  }

  if (patch.order !== undefined) {
    if (typeof patch.order !== "number" || !Number.isFinite(patch.order)) {
      return { ok: false, error: "Order must be a valid number.", field: "order" };
    }
    value.order = patch.order;
  }

  return { ok: true, value };
}

export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_BODY_MAX_LENGTH = 50000;

export interface NoteInput {
  title: string;
  body?: string;
}

export interface ValidNoteInput {
  title: string;
  body: string;
}

export interface NotePatch {
  title?: string;
  body?: string;
}

export interface ValidNotePatch {
  title?: string;
  body?: string;
}

function validateNoteTitle(raw: string): ValidationResult<string, NoteField> {
  const title = raw.trim();
  if (title.length === 0) {
    return { ok: false, error: "Title is required.", field: "title" };
  }
  if (title.length > NOTE_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Title must be ${NOTE_TITLE_MAX_LENGTH} characters or fewer.`,
      field: "title",
    };
  }
  return { ok: true, value: title };
}

function validateNoteBody(raw: string): ValidationResult<string, NoteField> {
  const body = raw.trim();
  if (body.length > NOTE_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `Body must be ${NOTE_BODY_MAX_LENGTH} characters or fewer.`,
      field: "body",
    };
  }
  return { ok: true, value: body };
}

export function validateNoteInput(input: NoteInput): ValidationResult<ValidNoteInput, NoteField> {
  const title = validateNoteTitle(input.title);
  if (!title.ok) {
    return title;
  }
  const body = validateNoteBody(input.body ?? "");
  if (!body.ok) {
    return body;
  }
  return { ok: true, value: { title: title.value, body: body.value } };
}

export function validateNotePatch(patch: NotePatch): ValidationResult<ValidNotePatch, NoteField> {
  const value: ValidNotePatch = {};

  if (patch.title !== undefined) {
    const title = validateNoteTitle(patch.title);
    if (!title.ok) {
      return title;
    }
    value.title = title.value;
  }

  if (patch.body !== undefined) {
    const body = validateNoteBody(patch.body);
    if (!body.ok) {
      return body;
    }
    value.body = body.value;
  }

  return { ok: true, value };
}
