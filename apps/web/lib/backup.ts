import { getDb } from "@/lib/db";
import { sanitizeHtml } from "@/lib/html";
import type { Note } from "@/types/note";
import type { Task, TaskCategory, TaskPriority } from "@/types/task";
import type { FollowUp, FollowUpOccurrence } from "@/types/followup";
import type { DailyPlan, DailyPlanItem } from "@/types/plan";
import type { InboxCapture } from "@/types/inbox";

export interface BackupPayloadV1 {
  version: 1;
  app: "TaskFlow";
  exportedAt: string;
  data: {
    tasks: Task[];
    notes: Note[];
    followups?: FollowUp[];
    followupOccurrences?: FollowUpOccurrence[];
    dailyPlans?: DailyPlan[];
    inboxCaptures?: InboxCapture[];
  };
}

export interface BackupPayloadV2 {
  version: 2;
  app: "TaskFlow";
  exportedAt: string;
  workspaceId?: string;
  metadata: {
    format: "taskflow-backup-v2";
    exportedFrom: "web";
    schemaVersion: number;
  };
  data: {
    tasks: Task[];
    notes: Note[];
    followups?: FollowUp[];
    followupOccurrences?: FollowUpOccurrence[];
    dailyPlans?: DailyPlan[];
    inboxCaptures?: InboxCapture[];
    taskOrders?: Array<{ id: string; orderedIds: string[] }>;
  };
}

export type BackupPayload = BackupPayloadV1 | BackupPayloadV2;

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
  followupsCount?: number;
  occurrencesCount?: number;
  plansCount?: number;
  capturesCount?: number;
  taskOrdersCount?: number;
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

  if (
    candidate.dueDate !== undefined &&
    candidate.dueDate !== null &&
    typeof candidate.dueDate !== "string"
  ) {
    return false;
  }

  if (
    candidate.category !== undefined &&
    candidate.category !== null &&
    (typeof candidate.category !== "string" ||
      !VALID_CATEGORIES.has(candidate.category as TaskCategory))
  ) {
    return false;
  }

  if (typeof candidate.createdAt !== "string") return false;
  if (typeof candidate.updatedAt !== "string") return false;
  if (
    candidate.completedAt !== undefined &&
    candidate.completedAt !== null &&
    typeof candidate.completedAt !== "string"
  ) {
    return false;
  }

  if (candidate.order !== undefined && typeof candidate.order !== "number") {
    return false;
  }

  if (
    candidate.sourceNoteId !== undefined &&
    candidate.sourceNoteId !== null &&
    typeof candidate.sourceNoteId !== "string"
  ) {
    return false;
  }

  if (
    candidate.sourceExcerpt !== undefined &&
    candidate.sourceExcerpt !== null &&
    typeof candidate.sourceExcerpt !== "string"
  ) {
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

export function isValidFollowUp(item: unknown): item is FollowUp {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;

  if (typeof candidate.id !== "string" || !candidate.id) return false;
  if (typeof candidate.personName !== "string" || !candidate.personName.trim()) return false;
  if (typeof candidate.commitment !== "string" || !candidate.commitment.trim()) return false;
  if (candidate.details !== null && typeof candidate.details !== "string") return false;
  if (typeof candidate.dueAt !== "string") return false;
  if (typeof candidate.timeZone !== "string") return false;
  if (candidate.emailAddress !== null && typeof candidate.emailAddress !== "string") return false;
  if (candidate.phoneNumber !== null && typeof candidate.phoneNumber !== "string") return false;
  if (candidate.whatsAppNumber !== null && typeof candidate.whatsAppNumber !== "string") return false;
  if (
    candidate.preferredAction !== null &&
    candidate.preferredAction !== "email" &&
    candidate.preferredAction !== "whatsapp" &&
    candidate.preferredAction !== "phone"
  ) {
    return false;
  }
  if (
    candidate.status !== "open" &&
    candidate.status !== "completed" &&
    candidate.status !== "archived"
  ) {
    return false;
  }
  if (typeof candidate.createdAt !== "string") return false;
  if (typeof candidate.updatedAt !== "string") return false;

  return true;
}

export function isValidFollowUpOccurrence(item: unknown): item is FollowUpOccurrence {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;

  if (typeof candidate.id !== "string" || !candidate.id) return false;
  if (typeof candidate.followUpId !== "string" || !candidate.followUpId) return false;
  if (typeof candidate.dueAt !== "string") return false;
  if (
    candidate.outcome !== "completed" &&
    candidate.outcome !== "skipped" &&
    candidate.outcome !== "missed" &&
    candidate.outcome !== "unresolved"
  ) {
    return false;
  }
  if (candidate.resolvedAt !== null && typeof candidate.resolvedAt !== "string") return false;
  if (candidate.nextDueAt !== null && typeof candidate.nextDueAt !== "string") return false;
  if (
    candidate.notes !== undefined &&
    candidate.notes !== null &&
    typeof candidate.notes !== "string"
  ) {
    return false;
  }

  return true;
}

export function isValidDailyPlanItem(item: unknown): item is DailyPlanItem {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;

  if (typeof candidate.id !== "string" || !candidate.id) return false;
  const itemType = candidate.type ?? candidate.entityType;
  if (itemType !== "task" && itemType !== "followup") return false;
  const targetId = candidate.targetId ?? candidate.entityId;
  if (typeof targetId !== "string" || !targetId) return false;
  if (typeof candidate.title !== "string") return false;
  const minutes = candidate.estimatedMinutes ?? candidate.allocatedMinutes;
  if (typeof minutes !== "number") return false;
  if (typeof candidate.completed !== "boolean") return false;
  if (candidate.order !== undefined && typeof candidate.order !== "number") return false;

  return true;
}

export function isValidDailyPlan(item: unknown): item is DailyPlan {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;

  if (typeof candidate.id !== "string" || !candidate.id) return false;
  const dateField = candidate.date ?? candidate.localDate;
  if (typeof dateField !== "string") return false;
  if (typeof candidate.timeZone !== "string") return false;
  if (typeof candidate.availableMinutes !== "number") return false;
  if (!Array.isArray(candidate.items)) return false;
  for (const planItem of candidate.items) {
    if (!isValidDailyPlanItem(planItem)) return false;
  }
  if (candidate.acceptedAt !== null && typeof candidate.acceptedAt !== "string") return false;
  if (typeof candidate.createdAt !== "string") return false;
  if (typeof candidate.updatedAt !== "string") return false;

  return true;
}

export function isValidInboxCapture(item: unknown): item is InboxCapture {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;

  if (typeof candidate.id !== "string" || !candidate.id) return false;
  if (typeof candidate.text !== "string" || !candidate.text.trim()) return false;
  if (candidate.sharedUrl !== null && typeof candidate.sharedUrl !== "string") return false;
  if (candidate.sourceAppLabel !== null && typeof candidate.sourceAppLabel !== "string") return false;
  if (typeof candidate.capturedAt !== "string") return false;
  if (
    candidate.state !== "pending" &&
    candidate.state !== "processed" &&
    candidate.state !== "discarded"
  ) {
    return false;
  }
  if (candidate.createdAt !== undefined && typeof candidate.createdAt !== "string") return false;
  if (candidate.updatedAt !== undefined && typeof candidate.updatedAt !== "string") return false;

  return true;
}

export function isValidTaskOrder(item: unknown): item is { id: string; orderedIds: string[] } {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;

  if (typeof candidate.id !== "string" || !candidate.id) return false;
  if (!Array.isArray(candidate.orderedIds)) return false;
  return candidate.orderedIds.every((id) => typeof id === "string");
}

export function buildBackupPayload(
  tasks: Task[],
  notes: Note[],
  followups?: FollowUp[],
  followupOccurrences?: FollowUpOccurrence[],
  dailyPlans?: DailyPlan[],
  inboxCaptures?: InboxCapture[],
  taskOrders?: Array<{ id: string; orderedIds: string[] }>,
  options?: { workspaceId?: string; version?: 1 | 2 }
): BackupPayload {
  const version = options?.version ?? 2;
  const exportedAt = new Date().toISOString();

  if (version === 1) {
    return {
      version: 1,
      app: "TaskFlow",
      exportedAt,
      data: {
        tasks,
        notes,
        followups: followups || [],
        followupOccurrences: followupOccurrences || [],
        dailyPlans: dailyPlans || [],
        inboxCaptures: inboxCaptures || [],
      },
    };
  }

  return {
    version: 2,
    app: "TaskFlow",
    exportedAt,
    workspaceId: options?.workspaceId ?? "local",
    metadata: {
      format: "taskflow-backup-v2",
      exportedFrom: "web",
      schemaVersion: 9,
    },
    data: {
      tasks,
      notes,
      followups: followups || [],
      followupOccurrences: followupOccurrences || [],
      dailyPlans: dailyPlans || [],
      inboxCaptures: inboxCaptures || [],
      taskOrders: taskOrders || [],
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

  if (candidate.version !== 1 && candidate.version !== 2) {
    return { ok: false, error: "Unsupported backup version." };
  }

  if (typeof candidate.exportedAt !== "string") {
    return { ok: false, error: "Missing export timestamp in backup." };
  }

  if (candidate.version === 2) {
    if (typeof candidate.metadata !== "object" || candidate.metadata === null) {
      return { ok: false, error: "Missing metadata in version 2 backup." };
    }
    const meta = candidate.metadata as Record<string, unknown>;
    if (meta.format !== "taskflow-backup-v2") {
      return { ok: false, error: "Invalid backup format in metadata." };
    }
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

  if (data.followups !== undefined) {
    if (!Array.isArray(data.followups)) {
      return { ok: false, error: "Backup followups list is malformed." };
    }
    for (let i = 0; i < data.followups.length; i++) {
      if (!isValidFollowUp(data.followups[i])) {
        return {
          ok: false,
          error: `FollowUp at position ${i + 1} is corrupted or missing required fields.`,
        };
      }
    }
  }

  if (data.followupOccurrences !== undefined) {
    if (!Array.isArray(data.followupOccurrences)) {
      return { ok: false, error: "Backup followup occurrences list is malformed." };
    }
    for (let i = 0; i < data.followupOccurrences.length; i++) {
      if (!isValidFollowUpOccurrence(data.followupOccurrences[i])) {
        return {
          ok: false,
          error: `FollowUp occurrence at position ${i + 1} is corrupted or missing required fields.`,
        };
      }
    }
  }

  if (data.dailyPlans !== undefined) {
    if (!Array.isArray(data.dailyPlans)) {
      return { ok: false, error: "Backup daily plans list is malformed." };
    }
    for (let i = 0; i < data.dailyPlans.length; i++) {
      if (!isValidDailyPlan(data.dailyPlans[i])) {
        return {
          ok: false,
          error: `Daily plan at position ${i + 1} is corrupted or missing required fields.`,
        };
      }
    }
  }

  if (data.inboxCaptures !== undefined) {
    if (!Array.isArray(data.inboxCaptures)) {
      return { ok: false, error: "Backup inbox captures list is malformed." };
    }
    for (let i = 0; i < data.inboxCaptures.length; i++) {
      if (!isValidInboxCapture(data.inboxCaptures[i])) {
        return {
          ok: false,
          error: `Inbox capture at position ${i + 1} is corrupted or missing required fields.`,
        };
      }
    }
  }

  if (data.taskOrders !== undefined) {
    if (!Array.isArray(data.taskOrders)) {
      return { ok: false, error: "Backup task orders list is malformed." };
    }
    for (let i = 0; i < data.taskOrders.length; i++) {
      if (!isValidTaskOrder(data.taskOrders[i])) {
        return {
          ok: false,
          error: `Task order at position ${i + 1} is corrupted or missing required fields.`,
        };
      }
    }
  }

  return { ok: true, value: parsed as BackupPayload };
}

export async function exportDatabaseBackup(
  workspaceId: string = "local"
): Promise<{
  payload: BackupPayload;
  jsonString: string;
  filename: string;
}> {
  const db = await getDb();
  const allTasks = await db.getAll("tasks");
  const sanitizeEntityForBackup = <T extends { revision?: number }>(item: T): T => {
    const copy = { ...item };
    delete copy.revision;
    return copy;
  };
  const tasks = allTasks
    .filter((t) => (t.workspaceId ?? "local") === workspaceId)
    .map(sanitizeEntityForBackup);
  const allNotes = await db.getAll("notes");
  const notes = allNotes
    .filter((n) => (n.workspaceId ?? "local") === workspaceId)
    .map(sanitizeEntityForBackup);
  const allFollowups = await db.getAll("followups");
  const followups = allFollowups
    .filter((f) => (f.workspaceId ?? "local") === workspaceId)
    .map(sanitizeEntityForBackup);
  const allOccurrences = await db.getAll("followup_occurrences");
  const followupOccurrences = allOccurrences
    .filter((o) => (o.workspaceId ?? "local") === workspaceId)
    .map(sanitizeEntityForBackup);
  const allPlans = await db.getAll("daily_plans");
  const dailyPlans = allPlans
    .filter((p) => (p.workspaceId ?? "local") === workspaceId)
    .map(sanitizeEntityForBackup);
  const allCaptures = await db.getAll("inbox_captures");
  const inboxCaptures = allCaptures
    .filter((c) => (c.workspaceId ?? "local") === workspaceId)
    .map(sanitizeEntityForBackup);
  const taskOrderRecord = await db.get("task_orders", workspaceId);
  const taskOrders = taskOrderRecord
    ? [{ id: taskOrderRecord.id, orderedIds: taskOrderRecord.orderedIds }]
    : [];

  const payload = buildBackupPayload(
    tasks,
    notes,
    followups,
    followupOccurrences,
    dailyPlans,
    inboxCaptures,
    taskOrders,
    { workspaceId, version: 2 }
  );
  const jsonString = JSON.stringify(payload, null, 2);
  const filename = generateBackupFilename();

  return { payload, jsonString, filename };
}

export async function restoreDatabaseBackup(
  payload: BackupPayload,
  mode: RestoreMode,
  targetWorkspaceId?: string
): Promise<RestoreResult> {
  const db = await getDb();
  const workspaceId =
    targetWorkspaceId ??
    (payload.version === 2 && payload.workspaceId ? payload.workspaceId : "local");

  const tx = db.transaction(
    [
      "tasks",
      "notes",
      "followups",
      "followup_occurrences",
      "daily_plans",
      "inbox_captures",
      "task_orders",
    ],
    "readwrite"
  );

  const taskStore = tx.objectStore("tasks");
  const noteStore = tx.objectStore("notes");
  const followupStore = tx.objectStore("followups");
  const occurrenceStore = tx.objectStore("followup_occurrences");
  const dailyPlanStore = tx.objectStore("daily_plans");
  const captureStore = tx.objectStore("inbox_captures");
  const orderStore = tx.objectStore("task_orders");

  if (mode === "replace") {
    const stores = [
      taskStore,
      noteStore,
      followupStore,
      occurrenceStore,
      dailyPlanStore,
      captureStore,
    ];
    for (const store of stores) {
      let cursor = await store.openCursor();
      while (cursor) {
        const val = cursor.value as unknown as { workspaceId?: string };
        if (!val.workspaceId || val.workspaceId === workspaceId) {
          await cursor.delete();
        }
        cursor = await cursor.continue();
      }
    }
    await orderStore.delete(workspaceId);
  }

  for (const task of payload.data.tasks) {
    await taskStore.put({
      ...task,
      description: sanitizeHtml(task.description),
      workspaceId,
    });
  }

  for (const note of payload.data.notes) {
    await noteStore.put({
      ...note,
      body: sanitizeHtml(note.body),
      workspaceId,
    });
  }

  if (payload.data.followups) {
    for (const followup of payload.data.followups) {
      await followupStore.put({
        ...followup,
        workspaceId,
      });
    }
  }

  if (payload.data.followupOccurrences) {
    for (const occurrence of payload.data.followupOccurrences) {
      await occurrenceStore.put({
        ...occurrence,
        workspaceId,
      });
    }
  }

  if (payload.data.dailyPlans) {
    for (const plan of payload.data.dailyPlans) {
      await dailyPlanStore.put({
        ...plan,
        workspaceId,
      });
    }
  }

  if (payload.data.inboxCaptures) {
    for (const capture of payload.data.inboxCaptures) {
      const rawCapture = capture as unknown as Record<string, unknown>;
      await captureStore.put({
        ...capture,
        createdAt:
          typeof rawCapture.createdAt === "string"
            ? rawCapture.createdAt
            : capture.capturedAt ?? new Date().toISOString(),
        updatedAt:
          typeof rawCapture.updatedAt === "string"
            ? rawCapture.updatedAt
            : capture.capturedAt ?? new Date().toISOString(),
        workspaceId,
      });
    }
  }

  if (payload.version === 2 && payload.data.taskOrders) {
    for (const order of payload.data.taskOrders) {
      await orderStore.put({
        id: workspaceId,
        workspaceId,
        orderedIds: order.orderedIds,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  await tx.done;

  return {
    tasksCount: payload.data.tasks.length,
    notesCount: payload.data.notes.length,
    followupsCount: payload.data.followups?.length ?? 0,
    occurrencesCount: payload.data.followupOccurrences?.length ?? 0,
    plansCount: payload.data.dailyPlans?.length ?? 0,
    capturesCount: payload.data.inboxCaptures?.length ?? 0,
    taskOrdersCount: payload.version === 2 ? payload.data.taskOrders?.length ?? 0 : 0,
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
