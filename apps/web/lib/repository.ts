import { getDb } from "./db";
import { sanitizeHtml } from "./html";
import {
  validateTaskInput,
  validateTaskPatch,
  type TaskInput,
  type TaskPatch,
} from "./validation";
import type { Task, TaskCategory } from "@/types/task";
import type { Note } from "@/types/note";
import type {
  FollowUp,
  FollowUpOccurrence,
  CreateFollowUpInput,
  UpdateFollowUpPatch,
  OccurrenceOutcome,
} from "@/types/followup";
import type { DailyPlan, DailyPlanInput } from "@/types/plan";
import type {
  InboxCapture,
  CreateCaptureInput,
  InboxCaptureState,
} from "@/types/inbox";
import type {
  WorkspaceRecord,
  TaskOrderRecord,
  OutboxMutationRecord,
  SyncCursorRecord,
  LocalTombstoneRecord,
  LocalConflictRecord,
  OutboxEntityType,
  OutboxAction,
} from "@/types/storage";

export const DEFAULT_WORKSPACE_ID = "local";

let currentActiveWorkspaceId = DEFAULT_WORKSPACE_ID;

export function getActiveWorkspaceId(): string {
  return currentActiveWorkspaceId;
}

export function setActiveWorkspaceId(workspaceId: string): void {
  currentActiveWorkspaceId = workspaceId;
}

function resolveWorkspace(provided?: string): string {
  return provided ?? currentActiveWorkspaceId;
}

function now(): string {
  return new Date().toISOString();
}

function uuid(): string {
  return crypto.randomUUID();
}

// -------------------------------------------------------------
// Workspaces API
// -------------------------------------------------------------

export async function listWorkspaces(): Promise<WorkspaceRecord[]> {
  const db = await getDb();
  return db.getAll("workspaces");
}

export async function getWorkspace(id: string): Promise<WorkspaceRecord | null> {
  const db = await getDb();
  const found = await db.get("workspaces", id);
  return found ?? null;
}

export async function createWorkspace(input: {
  id?: string;
  name: string;
  type?: "local" | "account";
  accountId?: string | null;
}): Promise<WorkspaceRecord> {
  const db = await getDb();
  const timestamp = now();
  const record: WorkspaceRecord = {
    id: input.id ?? `ws_${uuid()}`,
    name: input.name.trim(),
    type: input.type ?? "local",
    accountId: input.accountId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.put("workspaces", record);
  return record;
}

// -------------------------------------------------------------
// Outbox & Tombstone Helper
// -------------------------------------------------------------

export interface RepositoryMutationOptions {
  workspaceId?: string;
  baseRevision?: number | null;
  enqueueOutbox?: boolean;
}

function createOutboxRecord(
  workspaceId: string,
  entityType: OutboxEntityType,
  entityId: string,
  action: OutboxAction,
  baseRevision: number | null | undefined,
  payload: unknown
): OutboxMutationRecord {
  return {
    mutationId: `mut_${uuid()}`,
    workspaceId,
    protocolVersion: 1,
    entityType,
    entityId,
    action,
    baseRevision: baseRevision ?? null,
    payload,
    createdAt: now(),
    retryCount: 0,
  };
}

function createTombstoneRecord(
  workspaceId: string,
  entityType: string,
  entityId: string
): LocalTombstoneRecord {
  return {
    id: `tomb_${uuid()}`,
    workspaceId,
    entityType,
    entityId,
    deletedAt: now(),
  };
}

// -------------------------------------------------------------
// Tasks Repository
// -------------------------------------------------------------

export async function createTask(
  input: TaskInput,
  options?: RepositoryMutationOptions
): Promise<Task> {
  const validation = validateTaskInput(input);
  if (!validation.ok) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  const workspaceId = resolveWorkspace(options?.workspaceId);
  const timestamp = now();
  const task: Task = {
    id: uuid(),
    title: validation.value.title,
    description: validation.value.description,
    completed: false,
    priority: validation.value.priority,
    dueDate: validation.value.dueDate,
    category: validation.value.category,
    estimatedMinutes: validation.value.estimatedMinutes ?? null,
    sourceNoteId: validation.value.sourceNoteId ?? null,
    sourceExcerpt: validation.value.sourceExcerpt ?? null,
    workspaceId,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    ...(validation.value.order !== undefined ? { order: validation.value.order } : {}),
  };

  const db = await getDb();
  const tx = db.transaction(["tasks", "outbox"], "readwrite");
  await tx.objectStore("tasks").put(task);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "task",
      task.id,
      "put",
      options?.baseRevision,
      task
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return task;
}

export async function getTask(
  id: string,
  options?: { workspaceId?: string }
): Promise<Task | null> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const task = await db.get("tasks", id);
  if (!task || (task.workspaceId && task.workspaceId !== workspaceId)) {
    return null;
  }
  return task;
}

export async function listTasks(options?: {
  workspaceId?: string;
  category?: TaskCategory | null;
  completed?: boolean;
}): Promise<Task[]> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const allTasks = await db.getAllFromIndex("tasks", "workspaceId", workspaceId);

  return allTasks.filter((task) => {
    if (options?.category !== undefined && task.category !== options.category) {
      return false;
    }
    if (options?.completed !== undefined && task.completed !== options.completed) {
      return false;
    }
    return true;
  });
}

export async function updateTask(
  id: string,
  patch: TaskPatch,
  options?: RepositoryMutationOptions
): Promise<Task> {
  const validation = validateTaskPatch(patch);
  if (!validation.ok) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const tx = db.transaction(["tasks", "outbox"], "readwrite");
  const existing = await tx.objectStore("tasks").get(id);

  if (!existing || (existing.workspaceId && existing.workspaceId !== workspaceId)) {
    await tx.done;
    throw new Error(`Task not found: ${id}`);
  }

  const timestamp = now();
  const updated: Task = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.description !== undefined ? { description: sanitizeHtml(patch.description) } : {}),
    ...(patch.completed !== undefined ? { completed: patch.completed } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.estimatedMinutes !== undefined ? { estimatedMinutes: patch.estimatedMinutes } : {}),
    ...(patch.order !== undefined ? { order: patch.order } : {}),
    ...(patch.completed !== undefined
      ? { completedAt: patch.completed ? existing.completedAt ?? timestamp : null }
      : {}),
    workspaceId,
    updatedAt: timestamp,
  };

  await tx.objectStore("tasks").put(updated);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "task",
      updated.id,
      "put",
      options?.baseRevision,
      updated
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return updated;
}

export async function deleteTask(
  id: string,
  options?: RepositoryMutationOptions
): Promise<boolean> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const tx = db.transaction(["tasks", "outbox", "tombstones"], "readwrite");
  const existing = await tx.objectStore("tasks").get(id);

  if (!existing || (existing.workspaceId && existing.workspaceId !== workspaceId)) {
    await tx.done;
    return false;
  }

  await tx.objectStore("tasks").delete(id);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "task",
      id,
      "delete",
      options?.baseRevision,
      null
    );
    await tx.objectStore("outbox").put(mutation);

    const tombstone = createTombstoneRecord(workspaceId, "task", id);
    await tx.objectStore("tombstones").put(tombstone);
  }

  await tx.done;
  return true;
}

// -------------------------------------------------------------
// Task Orders Repository
// -------------------------------------------------------------

export async function getTaskOrder(options?: {
  workspaceId?: string;
}): Promise<string[]> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const record = await db.get("task_orders", workspaceId);
  return record ? record.orderedIds : [];
}

export async function setTaskOrder(
  orderedIds: string[],
  options?: RepositoryMutationOptions
): Promise<TaskOrderRecord> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const timestamp = now();
  const record: TaskOrderRecord = {
    id: workspaceId,
    workspaceId,
    orderedIds,
    updatedAt: timestamp,
  };

  const db = await getDb();
  const tx = db.transaction(["task_orders", "outbox"], "readwrite");
  await tx.objectStore("task_orders").put(record);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "task_order",
      workspaceId,
      "put",
      options?.baseRevision,
      { orderedIds }
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return record;
}

// -------------------------------------------------------------
// Notes Repository
// -------------------------------------------------------------

export async function createNote(
  input: { id?: string; title: string; body: string },
  options?: RepositoryMutationOptions
): Promise<Note> {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Note title cannot be empty");
  }

  const workspaceId = resolveWorkspace(options?.workspaceId);
  const timestamp = now();
  const note: Note = {
    id: input.id ?? uuid(),
    title,
    body: sanitizeHtml(input.body),
    workspaceId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const db = await getDb();
  const tx = db.transaction(["notes", "outbox"], "readwrite");
  await tx.objectStore("notes").put(note);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "note",
      note.id,
      "put",
      options?.baseRevision,
      note
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return note;
}

export async function getNote(
  id: string,
  options?: { workspaceId?: string }
): Promise<Note | null> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const note = await db.get("notes", id);
  if (!note || (note.workspaceId && note.workspaceId !== workspaceId)) {
    return null;
  }
  return note;
}

export async function listNotes(options?: { workspaceId?: string }): Promise<Note[]> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  return db.getAllFromIndex("notes", "workspaceId", workspaceId);
}

export async function updateNote(
  id: string,
  patch: { title?: string; body?: string },
  options?: RepositoryMutationOptions
): Promise<Note> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const tx = db.transaction(["notes", "outbox"], "readwrite");
  const existing = await tx.objectStore("notes").get(id);

  if (!existing || (existing.workspaceId && existing.workspaceId !== workspaceId)) {
    await tx.done;
    throw new Error(`Note not found: ${id}`);
  }

  const timestamp = now();
  const updated: Note = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.body !== undefined ? { body: sanitizeHtml(patch.body) } : {}),
    workspaceId,
    updatedAt: timestamp,
  };

  await tx.objectStore("notes").put(updated);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "note",
      updated.id,
      "put",
      options?.baseRevision,
      updated
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return updated;
}

export async function deleteNote(
  id: string,
  options?: RepositoryMutationOptions
): Promise<boolean> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const tx = db.transaction(["notes", "outbox", "tombstones"], "readwrite");
  const existing = await tx.objectStore("notes").get(id);

  if (!existing || (existing.workspaceId && existing.workspaceId !== workspaceId)) {
    await tx.done;
    return false;
  }

  await tx.objectStore("notes").delete(id);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "note",
      id,
      "delete",
      options?.baseRevision,
      null
    );
    await tx.objectStore("outbox").put(mutation);

    const tombstone = createTombstoneRecord(workspaceId, "note", id);
    await tx.objectStore("tombstones").put(tombstone);
  }

  await tx.done;
  return true;
}

// -------------------------------------------------------------
// FollowUps & Occurrences Repository
// -------------------------------------------------------------

export async function createFollowUp(
  input: CreateFollowUpInput,
  options?: RepositoryMutationOptions
): Promise<FollowUp> {
  const personName = input.personName.trim();
  const commitment = input.commitment.trim();
  if (!personName || !commitment) {
    throw new Error("Person name and commitment are required");
  }

  const workspaceId = resolveWorkspace(options?.workspaceId);
  const timestamp = now();
  const followUp: FollowUp = {
    id: uuid(),
    personName,
    commitment,
    details: input.details ? input.details.trim() : null,
    dueAt: input.dueAt,
    timeZone: input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    emailAddress: input.emailAddress ?? null,
    phoneNumber: input.phoneNumber ?? null,
    whatsAppNumber: input.whatsAppNumber ?? null,
    preferredAction: input.preferredAction ?? null,
    recurrence: input.recurrence ?? null,
    status: input.status ?? "open",
    sourceNoteId: input.sourceNoteId ?? null,
    sourceExcerpt: input.sourceExcerpt ?? null,
    workspaceId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const db = await getDb();
  const tx = db.transaction(["followups", "outbox"], "readwrite");
  await tx.objectStore("followups").put(followUp);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "followup",
      followUp.id,
      "put",
      options?.baseRevision,
      followUp
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return followUp;
}

export async function getFollowUp(
  id: string,
  options?: { workspaceId?: string }
): Promise<FollowUp | null> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const followUp = await db.get("followups", id);
  if (!followUp || (followUp.workspaceId && followUp.workspaceId !== workspaceId)) {
    return null;
  }
  return followUp;
}

export async function listFollowUps(options?: {
  workspaceId?: string;
  status?: string;
}): Promise<FollowUp[]> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const items = await db.getAllFromIndex("followups", "workspaceId", workspaceId);
  if (options?.status) {
    return items.filter((item) => item.status === options.status);
  }
  return items;
}

export async function updateFollowUp(
  id: string,
  patch: UpdateFollowUpPatch,
  options?: RepositoryMutationOptions
): Promise<FollowUp> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const tx = db.transaction(["followups", "outbox"], "readwrite");
  const existing = await tx.objectStore("followups").get(id);

  if (!existing || (existing.workspaceId && existing.workspaceId !== workspaceId)) {
    await tx.done;
    throw new Error(`FollowUp not found: ${id}`);
  }

  const timestamp = now();
  const updated: FollowUp = {
    ...existing,
    ...(patch.personName !== undefined ? { personName: patch.personName.trim() } : {}),
    ...(patch.commitment !== undefined ? { commitment: patch.commitment.trim() } : {}),
    ...(patch.details !== undefined ? { details: patch.details ? patch.details.trim() : null } : {}),
    ...(patch.dueAt !== undefined ? { dueAt: patch.dueAt } : {}),
    ...(patch.timeZone !== undefined ? { timeZone: patch.timeZone } : {}),
    ...(patch.emailAddress !== undefined ? { emailAddress: patch.emailAddress } : {}),
    ...(patch.phoneNumber !== undefined ? { phoneNumber: patch.phoneNumber } : {}),
    ...(patch.whatsAppNumber !== undefined ? { whatsAppNumber: patch.whatsAppNumber } : {}),
    ...(patch.preferredAction !== undefined ? { preferredAction: patch.preferredAction } : {}),
    ...(patch.recurrence !== undefined ? { recurrence: patch.recurrence } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    workspaceId,
    updatedAt: timestamp,
  };

  await tx.objectStore("followups").put(updated);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "followup",
      updated.id,
      "put",
      options?.baseRevision,
      updated
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return updated;
}

export async function deleteFollowUp(
  id: string,
  options?: RepositoryMutationOptions
): Promise<boolean> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const tx = db.transaction(["followups", "outbox", "tombstones"], "readwrite");
  const existing = await tx.objectStore("followups").get(id);

  if (!existing || (existing.workspaceId && existing.workspaceId !== workspaceId)) {
    await tx.done;
    return false;
  }

  await tx.objectStore("followups").delete(id);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "followup",
      id,
      "delete",
      options?.baseRevision,
      null
    );
    await tx.objectStore("outbox").put(mutation);

    const tombstone = createTombstoneRecord(workspaceId, "followup", id);
    await tx.objectStore("tombstones").put(tombstone);
  }

  await tx.done;
  return true;
}

export async function recordOccurrence(
  followUpId: string,
  dueAt: string,
  outcome: OccurrenceOutcome,
  options?: RepositoryMutationOptions & {
    resolvedAt?: string | null;
    nextDueAt?: string | null;
    notes?: string | null;
  }
): Promise<FollowUpOccurrence> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const occurrence: FollowUpOccurrence = {
    id: uuid(),
    followUpId,
    dueAt,
    outcome,
    resolvedAt: options?.resolvedAt ?? now(),
    nextDueAt: options?.nextDueAt ?? null,
    notes: options?.notes ?? null,
    workspaceId,
  };

  const db = await getDb();
  const tx = db.transaction(["followup_occurrences", "outbox"], "readwrite");
  await tx.objectStore("followup_occurrences").put(occurrence);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "occurrence",
      occurrence.id,
      "put",
      options?.baseRevision,
      occurrence
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return occurrence;
}

export async function listOccurrences(options?: {
  workspaceId?: string;
  followUpId?: string;
}): Promise<FollowUpOccurrence[]> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const items = await db.getAllFromIndex("followup_occurrences", "workspaceId", workspaceId);
  if (options?.followUpId) {
    return items.filter((item) => item.followUpId === options.followUpId);
  }
  return items;
}

// -------------------------------------------------------------
// Daily Plans Repository
// -------------------------------------------------------------

export async function getDailyPlanByDate(
  date: string,
  options?: { workspaceId?: string }
): Promise<DailyPlan | null> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const plans = await db.getAllFromIndex("daily_plans", "workspaceId", workspaceId);
  const found = plans.find((p) => p.date === date);
  return found ?? null;
}

export async function upsertDailyPlan(
  input: DailyPlanInput,
  options?: RepositoryMutationOptions
): Promise<DailyPlan> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const timestamp = now();

  const existing = await getDailyPlanByDate(input.date, { workspaceId });
  const plan: DailyPlan = {
    id: existing ? existing.id : uuid(),
    date: input.date,
    timeZone: input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    availableMinutes: input.availableMinutes,
    items: input.items,
    acceptedAt: input.acceptedAt !== undefined ? input.acceptedAt : existing?.acceptedAt ?? null,
    workspaceId,
    createdAt: existing ? existing.createdAt : timestamp,
    updatedAt: timestamp,
  };

  const tx = db.transaction(["daily_plans", "outbox"], "readwrite");
  await tx.objectStore("daily_plans").put(plan);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "plan",
      plan.id,
      "put",
      options?.baseRevision,
      plan
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return plan;
}

export async function listDailyPlans(options?: {
  workspaceId?: string;
}): Promise<DailyPlan[]> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  return db.getAllFromIndex("daily_plans", "workspaceId", workspaceId);
}

// -------------------------------------------------------------
// Inbox Captures Repository
// -------------------------------------------------------------

export async function createInboxCapture(
  input: CreateCaptureInput,
  options?: RepositoryMutationOptions
): Promise<InboxCapture> {
  const text = input.text.trim();
  if (!text) {
    throw new Error("Capture text cannot be empty");
  }

  const workspaceId = resolveWorkspace(options?.workspaceId);
  const timestamp = now();
  const capture: InboxCapture = {
    id: uuid(),
    text,
    sharedUrl: input.sharedUrl ? input.sharedUrl.trim() : null,
    sourceAppLabel: input.sourceAppLabel ? input.sourceAppLabel.trim() : null,
    capturedAt: timestamp,
    state: "pending",
    targetType: null,
    targetId: null,
    processedAt: null,
    discardedAt: null,
    workspaceId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const db = await getDb();
  const tx = db.transaction(["inbox_captures", "outbox"], "readwrite");
  await tx.objectStore("inbox_captures").put(capture);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "inbox",
      capture.id,
      "put",
      options?.baseRevision,
      capture
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return capture;
}

export async function getInboxCapture(
  id: string,
  options?: { workspaceId?: string }
): Promise<InboxCapture | null> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const capture = await db.get("inbox_captures", id);
  if (!capture || (capture.workspaceId && capture.workspaceId !== workspaceId)) {
    return null;
  }
  return capture;
}

export async function listInboxCaptures(options?: {
  workspaceId?: string;
  state?: InboxCaptureState;
}): Promise<InboxCapture[]> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const items = await db.getAllFromIndex("inbox_captures", "workspaceId", workspaceId);
  if (options?.state) {
    return items.filter((item) => item.state === options.state);
  }
  return items;
}

export async function updateInboxCapture(
  id: string,
  patch: {
    state?: InboxCaptureState;
    targetType?: "task" | "note" | "followup" | null;
    targetId?: string | null;
  },
  options?: RepositoryMutationOptions
): Promise<InboxCapture> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const tx = db.transaction(["inbox_captures", "outbox"], "readwrite");
  const existing = await tx.objectStore("inbox_captures").get(id);

  if (!existing || (existing.workspaceId && existing.workspaceId !== workspaceId)) {
    await tx.done;
    throw new Error(`Inbox capture not found: ${id}`);
  }

  const timestamp = now();
  const updated: InboxCapture = {
    ...existing,
    ...(patch.state !== undefined ? { state: patch.state } : {}),
    ...(patch.targetType !== undefined ? { targetType: patch.targetType } : {}),
    ...(patch.targetId !== undefined ? { targetId: patch.targetId } : {}),
    ...(patch.state === "processed" && !existing.processedAt ? { processedAt: timestamp } : {}),
    ...(patch.state === "discarded" && !existing.discardedAt ? { discardedAt: timestamp } : {}),
    workspaceId,
    updatedAt: timestamp,
  };

  await tx.objectStore("inbox_captures").put(updated);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "inbox",
      updated.id,
      "put",
      options?.baseRevision,
      updated
    );
    await tx.objectStore("outbox").put(mutation);
  }

  await tx.done;
  return updated;
}

export async function deleteInboxCapture(
  id: string,
  options?: RepositoryMutationOptions
): Promise<boolean> {
  const workspaceId = resolveWorkspace(options?.workspaceId);
  const db = await getDb();
  const tx = db.transaction(["inbox_captures", "outbox", "tombstones"], "readwrite");
  const existing = await tx.objectStore("inbox_captures").get(id);

  if (!existing || (existing.workspaceId && existing.workspaceId !== workspaceId)) {
    await tx.done;
    return false;
  }

  await tx.objectStore("inbox_captures").delete(id);

  if (options?.enqueueOutbox !== false) {
    const mutation = createOutboxRecord(
      workspaceId,
      "inbox",
      id,
      "delete",
      options?.baseRevision,
      null
    );
    await tx.objectStore("outbox").put(mutation);

    const tombstone = createTombstoneRecord(workspaceId, "inbox", id);
    await tx.objectStore("tombstones").put(tombstone);
  }

  await tx.done;
  return true;
}

// -------------------------------------------------------------
// Outbox, Cursors, Tombstones, Conflicts
// -------------------------------------------------------------

export async function listOutbox(workspaceId?: string): Promise<OutboxMutationRecord[]> {
  const ws = resolveWorkspace(workspaceId);
  const db = await getDb();
  return db.getAllFromIndex("outbox", "workspaceId", ws);
}

export async function dequeueOutbox(
  mutationIdOrWorkspaceId: string,
  maybeMutationIds?: string | string[]
): Promise<void> {
  const db = await getDb();
  if (maybeMutationIds !== undefined) {
    const ids = Array.isArray(maybeMutationIds) ? maybeMutationIds : [maybeMutationIds];
    const tx = db.transaction("outbox", "readwrite");
    for (const id of ids) {
      await tx.objectStore("outbox").delete(id);
    }
    await tx.done;
  } else {
    await db.delete("outbox", mutationIdOrWorkspaceId);
  }
}

export async function clearOutbox(workspaceId?: string): Promise<void> {
  const ws = resolveWorkspace(workspaceId);
  const db = await getDb();
  const tx = db.transaction("outbox", "readwrite");
  const items = await tx.objectStore("outbox").index("workspaceId").getAll(ws);
  for (const item of items) {
    await tx.objectStore("outbox").delete(item.mutationId);
  }
  await tx.done;
}

export async function getSyncCursor(workspaceId?: string): Promise<number> {
  const ws = resolveWorkspace(workspaceId);
  const db = await getDb();
  const record = await db.get("sync_cursors", ws);
  return record ? record.cursor : 0;
}

export async function setSyncCursor(
  workspaceIdOrRecord: string | SyncCursorRecord,
  cursor?: number,
  lastSyncedAt?: string
): Promise<void> {
  const db = await getDb();
  const timestamp = now();
  let record: SyncCursorRecord;
  if (typeof workspaceIdOrRecord === "string") {
    record = {
      workspaceId: workspaceIdOrRecord,
      cursor: cursor ?? 0,
      lastSyncedAt: lastSyncedAt ?? timestamp,
      updatedAt: timestamp,
    };
  } else {
    record = {
      ...workspaceIdOrRecord,
      updatedAt: workspaceIdOrRecord.updatedAt || timestamp,
    };
  }
  await db.put("sync_cursors", record);
}

export async function listTombstones(workspaceId?: string): Promise<LocalTombstoneRecord[]> {
  const ws = resolveWorkspace(workspaceId);
  const db = await getDb();
  return db.getAllFromIndex("tombstones", "workspaceId", ws);
}

export async function recordLocalConflict(
  input: Omit<LocalConflictRecord, "id" | "detectedAt"> & { id?: string; detectedAt?: string }
): Promise<LocalConflictRecord> {
  const db = await getDb();
  const record: LocalConflictRecord = {
    ...input,
    id: input.id || `cnf_${uuid()}`,
    detectedAt: input.detectedAt || now(),
  };
  await db.put("conflicts", record);
  return record;
}

export async function listLocalConflicts(
  workspaceId?: string,
  status?: "open" | "resolved"
): Promise<LocalConflictRecord[]> {
  const ws = resolveWorkspace(workspaceId);
  const db = await getDb();
  const items = await db.getAllFromIndex("conflicts", "workspaceId", ws);
  if (status) {
    return items.filter((item) => item.status === status);
  }
  return items;
}

export async function resolveLocalConflict(conflictId: string): Promise<boolean> {
  const db = await getDb();
  const tx = db.transaction("conflicts", "readwrite");
  const conflict = await tx.objectStore("conflicts").get(conflictId);
  if (!conflict) {
    await tx.done;
    return false;
  }
  conflict.status = "resolved";
  conflict.resolvedAt = now();
  await tx.objectStore("conflicts").put(conflict);
  await tx.done;
  return true;
}
