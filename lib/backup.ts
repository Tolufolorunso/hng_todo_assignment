import { getDb } from "@/lib/db";
import { sanitizeHtml } from "@/lib/html";
import type { Note } from "@/types/note";
import type { Task, TaskCategory, TaskPriority } from "@/types/task";

export interface BackupPayload {
  version: 1;
  app: "TaskFlow";
  exportedAt: string;
  data: {
    tasks: Task[];
    notes: Note[];
  };
}

export type RestoreMode = "merge" | "replace";

export interface ValidationSuccess {
  ok: true;
  value: BackupPayload;
}

export interface ValidationFailure {
  ok: false;
  error: string;
}

export type BackupValidationResult = ValidationSuccess | ValidationFailure;

export interface RestoreResult {
  tasksCount: number;
  notesCount: number;
}

const VALID_PRIORITIES = new Set<TaskPriority>(["low", "medium", "high"]);
const VALID_CATEGORIES = new Set<TaskCategory>([
  "work",
  "personal",
  "urgent",
  "study",
  "ideas",
]);

export function isValidTask(item: unknown): item is Task {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;

  if (typeof candidate.id !== "string" || !candidate.id) return false;
  if (typeof candidate.title !== "string" || !candidate.title.trim()) return false;
  if (typeof candidate.description !== "string") return false;
  if (typeof candidate.completed !== "boolean") return false;

  if (
    typeof candidate.priority !== "string" ||
    !VALID_PRIORITIES.has(candidate.priority as TaskPriority)
  ) {
    return false;
  }

  if (candidate.dueDate !== null && typeof candidate.dueDate !== "string") {
    return false;
  }

  if (
    candidate.category !== null &&
    (typeof candidate.category !== "string" ||
      !VALID_CATEGORIES.has(candidate.category as TaskCategory))
  ) {
    return false;
  }

  if (typeof candidate.createdAt !== "string") return false;
  if (typeof candidate.updatedAt !== "string") return false;
  if (candidate.completedAt !== null && typeof candidate.completedAt !== "string") {
    return false;
  }

  if (candidate.order !== undefined && typeof candidate.order !== "number") {
    return false;
  }

  return true;
}

export function isValidNote(item: unknown): item is Note {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;

  if (typeof candidate.id !== "string" || !candidate.id) return false;
  if (typeof candidate.title !== "string" || !candidate.title.trim()) return false;
  if (typeof candidate.body !== "string") return false;
  if (typeof candidate.createdAt !== "string") return false;
  if (typeof candidate.updatedAt !== "string") return false;

  return true;
}

export function buildBackupPayload(tasks: Task[], notes: Note[]): BackupPayload {
  return {
    version: 1,
    app: "TaskFlow",
    exportedAt: new Date().toISOString(),
    data: {
      tasks,
      notes,
    },
  };
}

export function generateBackupFilename(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `taskflow-backup-${y}-${m}-${d}-${hh}${mm}.json`;
}

export function parseAndValidateBackup(jsonString: string): BackupValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "The backup file format is unrecognized." };
  }

  const candidate = parsed as Record<string, unknown>;

  if (candidate.app !== "TaskFlow") {
    return { ok: false, error: "Not a valid TaskFlow backup file." };
  }

  if (candidate.version !== 1) {
    return { ok: false, error: "Unsupported backup version." };
  }

  if (typeof candidate.exportedAt !== "string") {
    return { ok: false, error: "Missing export timestamp in backup." };
  }

  if (typeof candidate.data !== "object" || candidate.data === null) {
    return { ok: false, error: "Missing data payload in backup." };
  }

  const data = candidate.data as Record<string, unknown>;

  if (!Array.isArray(data.tasks)) {
    return { ok: false, error: "Backup tasks list is malformed." };
  }

  if (!Array.isArray(data.notes)) {
    return { ok: false, error: "Backup notes list is malformed." };
  }

  for (let i = 0; i < data.tasks.length; i++) {
    if (!isValidTask(data.tasks[i])) {
      return {
        ok: false,
        error: `Task at position ${i + 1} is corrupted or missing required fields.`,
      };
    }
  }

  for (let i = 0; i < data.notes.length; i++) {
    if (!isValidNote(data.notes[i])) {
      return {
        ok: false,
        error: `Note at position ${i + 1} is corrupted or missing required fields.`,
      };
    }
  }

  return { ok: true, value: parsed as BackupPayload };
}

export async function exportDatabaseBackup(): Promise<{
  payload: BackupPayload;
  jsonString: string;
  filename: string;
}> {
  const db = await getDb();
  const tasks = await db.getAll("tasks");
  const notes = await db.getAll("notes");

  const payload = buildBackupPayload(tasks, notes);
  const jsonString = JSON.stringify(payload, null, 2);
  const filename = generateBackupFilename();

  return { payload, jsonString, filename };
}

export async function restoreDatabaseBackup(
  payload: BackupPayload,
  mode: RestoreMode,
): Promise<RestoreResult> {
  const db = await getDb();
  const tx = db.transaction(["tasks", "notes"], "readwrite");

  const taskStore = tx.objectStore("tasks");
  const noteStore = tx.objectStore("notes");

  if (mode === "replace") {
    await taskStore.clear();
    await noteStore.clear();
  }

  for (const task of payload.data.tasks) {
    await taskStore.put({
      ...task,
      description: sanitizeHtml(task.description),
    });
  }

  for (const note of payload.data.notes) {
    await noteStore.put({
      ...note,
      body: sanitizeHtml(note.body),
    });
  }

  await tx.done;

  return {
    tasksCount: payload.data.tasks.length,
    notesCount: payload.data.notes.length,
  };
}

export function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
