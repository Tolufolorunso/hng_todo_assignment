import crypto from "node:crypto";
import { executeQuery, isDatabaseConfigured } from "./db/client";
import { sanitizeHtml } from "@/lib/html";

// Entity Interfaces

export interface TaskRecord {
  id: string;
  accountId: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: string;
  dueDate: string | null;
  category: string | null;
  estimatedMinutes: number | null;
  sourceNoteId: string | null;
  sourceExcerpt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface NoteRecord {
  id: string;
  accountId: string;
  title: string;
  body: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpRecord {
  id: string;
  accountId: string;
  personName: string;
  commitment: string;
  details: string | null;
  dueAt: string;
  timeZone: string;
  emailAddress: string | null;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  preferredAction: string | null;
  recurrence: unknown | null;
  status: string;
  sourceNoteId: string | null;
  sourceExcerpt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface OccurrenceRecord {
  id: string;
  followupId: string;
  accountId: string;
  dueAt: string;
  completedAt: string;
  revision: number;
  createdAt: string;
}

export interface DailyPlanRecord {
  id: string;
  accountId: string;
  planDate: string;
  availableMinutes: number;
  items: unknown[];
  status: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface InboxCaptureRecord {
  id: string;
  accountId: string;
  text: string;
  sharedUrl: string | null;
  sourceAppLabel: string | null;
  state: string;
  targetType: string | null;
  targetId: string | null;
  capturedAt: string;
  processedAt: string | null;
  discardedAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskOrderRecord {
  accountId: string;
  taskIds: string[];
  revision: number;
  updatedAt: string;
}

// Validation & Helpers

export function validateRecurrenceRule(rule: unknown): string | null {
  if (rule === null || rule === undefined) {
    return null;
  }

  if (typeof rule !== "object" || Array.isArray(rule)) {
    return "Recurrence rule must be an object";
  }

  const rec = rule as Record<string, unknown>;
  const allowedFrequencies = ["daily", "weekly", "monthly", "customDays"];
  if (typeof rec.frequency !== "string" || !allowedFrequencies.includes(rec.frequency)) {
    return `Recurrence frequency must be one of: ${allowedFrequencies.join(", ")}`;
  }

  if (rec.interval !== undefined) {
    if (typeof rec.interval !== "number" || !Number.isInteger(rec.interval) || rec.interval < 1) {
      return "Recurrence interval must be a positive integer";
    }
  }

  if (rec.weekdays !== undefined && rec.weekdays !== null) {
    if (!Array.isArray(rec.weekdays) || !rec.weekdays.every((d) => typeof d === "number" && d >= 0 && d <= 6)) {
      return "Recurrence weekdays must be an array of integers between 0 and 6";
    }
  }

  return null;
}

export async function advanceAccountRevision(accountId: string): Promise<number> {
  const result = await executeQuery<{ current_cursor: string }>(
    `INSERT INTO sync_revisions (account_id, current_cursor, updated_at)
     VALUES ($1, 1, NOW())
     ON CONFLICT (account_id)
     DO UPDATE SET current_cursor = sync_revisions.current_cursor + 1, updated_at = NOW()
     RETURNING current_cursor`,
    [accountId]
  );

  return parseInt(result.rows[0]?.current_cursor ?? "1", 10);
}

export async function recordTombstone(
  accountId: string,
  entityId: string,
  entityType: string
): Promise<number> {
  const revision = await advanceAccountRevision(accountId);

  await executeQuery(
    `INSERT INTO tombstones (id, account_id, entity_type, deleted_at, revision)
     VALUES ($1, $2, $3, NOW(), $4)`,
    [entityId, accountId, entityType, revision]
  );

  return revision;
}

// Tasks Operations

export async function createTask(
  accountId: string,
  input: {
    id?: string;
    title: string;
    description?: string | null;
    completed?: boolean;
    priority?: string;
    dueDate?: string | null;
    category?: string | null;
    estimatedMinutes?: number | null;
    sourceNoteId?: string | null;
    sourceExcerpt?: string | null;
  }
): Promise<TaskRecord> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const id = input.id ?? `tsk_${crypto.randomUUID()}`;
  const sanitizedDescription = input.description ? sanitizeHtml(input.description) : null;
  const revision = await advanceAccountRevision(accountId);

  const result = await executeQuery<TaskRecord>(
    `INSERT INTO tasks (
       id, account_id, title, description, completed, priority, due_date,
       category, estimated_minutes, source_note_id, source_excerpt, revision, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     RETURNING
       id, account_id as "accountId", title, description, completed, priority,
       due_date as "dueDate", category, estimated_minutes as "estimatedMinutes",
       source_note_id as "sourceNoteId", source_excerpt as "sourceExcerpt",
       revision, created_at as "createdAt", updated_at as "updatedAt",
       completed_at as "completedAt"`,
    [
      id,
      accountId,
      input.title.trim(),
      sanitizedDescription,
      input.completed ?? false,
      input.priority ?? "medium",
      input.dueDate ?? null,
      input.category ?? null,
      input.estimatedMinutes ?? null,
      input.sourceNoteId ?? null,
      input.sourceExcerpt ?? null,
      revision,
    ]
  );

  return result.rows[0];
}

export async function getTask(
  accountId: string,
  taskId: string
): Promise<TaskRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<TaskRecord>(
    `SELECT
       id, account_id as "accountId", title, description, completed, priority,
       due_date as "dueDate", category, estimated_minutes as "estimatedMinutes",
       source_note_id as "sourceNoteId", source_excerpt as "sourceExcerpt",
       revision, created_at as "createdAt", updated_at as "updatedAt",
       completed_at as "completedAt"
     FROM tasks
     WHERE id = $1 AND account_id = $2
     LIMIT 1`,
    [taskId, accountId]
  );

  return result.rows[0] ?? null;
}

export async function listTasks(
  accountId: string,
  filters: { completed?: boolean; category?: string; priority?: string } = {}
): Promise<TaskRecord[]> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const conditions: string[] = ["account_id = $1"];
  const params: unknown[] = [accountId];

  if (filters.completed !== undefined) {
    params.push(filters.completed);
    conditions.push(`completed = $${params.length}`);
  }

  if (filters.category) {
    params.push(filters.category);
    conditions.push(`category = $${params.length}`);
  }

  if (filters.priority) {
    params.push(filters.priority);
    conditions.push(`priority = $${params.length}`);
  }

  const result = await executeQuery<TaskRecord>(
    `SELECT
       id, account_id as "accountId", title, description, completed, priority,
       due_date as "dueDate", category, estimated_minutes as "estimatedMinutes",
       source_note_id as "sourceNoteId", source_excerpt as "sourceExcerpt",
       revision, created_at as "createdAt", updated_at as "updatedAt",
       completed_at as "completedAt"
     FROM tasks
     WHERE ${conditions.join(" AND ")}
     ORDER BY updated_at DESC`,
    params
  );

  return result.rows;
}

export async function updateTask(
  accountId: string,
  taskId: string,
  patch: {
    title?: string;
    description?: string | null;
    completed?: boolean;
    priority?: string;
    dueDate?: string | null;
    category?: string | null;
    estimatedMinutes?: number | null;
  }
): Promise<TaskRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const existing = await getTask(accountId, taskId);
  if (!existing) {
    return null;
  }

  const revision = await advanceAccountRevision(accountId);
  const title = patch.title !== undefined ? patch.title.trim() : existing.title;
  const description =
    patch.description !== undefined
      ? patch.description
        ? sanitizeHtml(patch.description)
        : null
      : existing.description;
  const completed = patch.completed !== undefined ? patch.completed : existing.completed;
  const priority = patch.priority !== undefined ? patch.priority : existing.priority;
  const dueDate = patch.dueDate !== undefined ? patch.dueDate : existing.dueDate;
  const category = patch.category !== undefined ? patch.category : existing.category;
  const estimatedMinutes =
    patch.estimatedMinutes !== undefined ? patch.estimatedMinutes : existing.estimatedMinutes;
  const completedAt = completed
    ? existing.completedAt ?? new Date().toISOString()
    : null;

  const result = await executeQuery<TaskRecord>(
    `UPDATE tasks
     SET
       title = $1, description = $2, completed = $3, priority = $4,
       due_date = $5, category = $6, estimated_minutes = $7,
       completed_at = $8, revision = $9, updated_at = NOW()
     WHERE id = $10 AND account_id = $11
     RETURNING
       id, account_id as "accountId", title, description, completed, priority,
       due_date as "dueDate", category, estimated_minutes as "estimatedMinutes",
       source_note_id as "sourceNoteId", source_excerpt as "sourceExcerpt",
       revision, created_at as "createdAt", updated_at as "updatedAt",
       completed_at as "completedAt"`,
    [
      title,
      description,
      completed,
      priority,
      dueDate,
      category,
      estimatedMinutes,
      completedAt,
      revision,
      taskId,
      accountId,
    ]
  );

  return result.rows[0] ?? null;
}

export async function deleteTask(
  accountId: string,
  taskId: string
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery(
    `DELETE FROM tasks WHERE id = $1 AND account_id = $2`,
    [taskId, accountId]
  );

  if ((result.rowCount ?? 0) > 0) {
    await recordTombstone(accountId, taskId, "task");
    return true;
  }

  return false;
}

// Notes Operations

export async function createNote(
  accountId: string,
  input: { id?: string; title: string; body?: string }
): Promise<NoteRecord> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const id = input.id ?? `not_${crypto.randomUUID()}`;
  const sanitizedBody = input.body ? sanitizeHtml(input.body) : "";
  const revision = await advanceAccountRevision(accountId);

  const result = await executeQuery<NoteRecord>(
    `INSERT INTO notes (id, account_id, title, body, revision, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING
       id, account_id as "accountId", title, body, revision,
       created_at as "createdAt", updated_at as "updatedAt"`,
    [id, accountId, input.title.trim(), sanitizedBody, revision]
  );

  return result.rows[0];
}

export async function getNote(
  accountId: string,
  noteId: string
): Promise<NoteRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<NoteRecord>(
    `SELECT id, account_id as "accountId", title, body, revision,
            created_at as "createdAt", updated_at as "updatedAt"
     FROM notes
     WHERE id = $1 AND account_id = $2
     LIMIT 1`,
    [noteId, accountId]
  );

  return result.rows[0] ?? null;
}

export async function listNotes(accountId: string): Promise<NoteRecord[]> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<NoteRecord>(
    `SELECT id, account_id as "accountId", title, body, revision,
            created_at as "createdAt", updated_at as "updatedAt"
     FROM notes
     WHERE account_id = $1
     ORDER BY updated_at DESC`,
    [accountId]
  );

  return result.rows;
}

export async function updateNote(
  accountId: string,
  noteId: string,
  patch: { title?: string; body?: string }
): Promise<NoteRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const existing = await getNote(accountId, noteId);
  if (!existing) {
    return null;
  }

  const revision = await advanceAccountRevision(accountId);
  const title = patch.title !== undefined ? patch.title.trim() : existing.title;
  const body = patch.body !== undefined ? sanitizeHtml(patch.body) : existing.body;

  const result = await executeQuery<NoteRecord>(
    `UPDATE notes
     SET title = $1, body = $2, revision = $3, updated_at = NOW()
     WHERE id = $4 AND account_id = $5
     RETURNING
       id, account_id as "accountId", title, body, revision,
       created_at as "createdAt", updated_at as "updatedAt"`,
    [title, body, revision, noteId, accountId]
  );

  return result.rows[0] ?? null;
}

export async function deleteNote(
  accountId: string,
  noteId: string
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery(
    `DELETE FROM notes WHERE id = $1 AND account_id = $2`,
    [noteId, accountId]
  );

  if ((result.rowCount ?? 0) > 0) {
    await recordTombstone(accountId, noteId, "note");
    return true;
  }

  return false;
}

// Follow-ups Operations

export async function createFollowUp(
  accountId: string,
  input: {
    id?: string;
    personName: string;
    commitment: string;
    details?: string | null;
    dueAt: string;
    timeZone?: string;
    emailAddress?: string | null;
    phoneNumber?: string | null;
    whatsappNumber?: string | null;
    preferredAction?: string | null;
    recurrence?: unknown | null;
    sourceNoteId?: string | null;
    sourceExcerpt?: string | null;
  }
): Promise<FollowUpRecord> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const recError = validateRecurrenceRule(input.recurrence);
  if (recError) {
    throw new Error(`BAD_REQUEST: ${recError}`);
  }

  const id = input.id ?? `fol_${crypto.randomUUID()}`;
  const revision = await advanceAccountRevision(accountId);

  const result = await executeQuery<FollowUpRecord>(
    `INSERT INTO followups (
       id, account_id, person_name, commitment, details, due_at, time_zone,
       email_address, phone_number, whatsapp_number, preferred_action,
       recurrence_json, status, source_note_id, source_excerpt, revision, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'open', $13, $14, $15, NOW(), NOW())
     RETURNING
       id, account_id as "accountId", person_name as "personName", commitment, details,
       due_at as "dueAt", time_zone as "timeZone", email_address as "emailAddress",
       phone_number as "phoneNumber", whatsapp_number as "whatsappNumber",
       preferred_action as "preferredAction", recurrence_json as "recurrence",
       status, source_note_id as "sourceNoteId", source_excerpt as "sourceExcerpt",
       revision, created_at as "createdAt", updated_at as "updatedAt"`,
    [
      id,
      accountId,
      input.personName.trim(),
      input.commitment.trim(),
      input.details ?? null,
      input.dueAt,
      input.timeZone ?? "UTC",
      input.emailAddress ?? null,
      input.phoneNumber ?? null,
      input.whatsappNumber ?? null,
      input.preferredAction ?? null,
      input.recurrence ? JSON.stringify(input.recurrence) : null,
      input.sourceNoteId ?? null,
      input.sourceExcerpt ?? null,
      revision,
    ]
  );

  return result.rows[0];
}

export async function getFollowUp(
  accountId: string,
  followUpId: string
): Promise<FollowUpRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<FollowUpRecord>(
    `SELECT
       id, account_id as "accountId", person_name as "personName", commitment, details,
       due_at as "dueAt", time_zone as "timeZone", email_address as "emailAddress",
       phone_number as "phoneNumber", whatsapp_number as "whatsappNumber",
       preferred_action as "preferredAction", recurrence_json as "recurrence",
       status, source_note_id as "sourceNoteId", source_excerpt as "sourceExcerpt",
       revision, created_at as "createdAt", updated_at as "updatedAt"
     FROM followups
     WHERE id = $1 AND account_id = $2
     LIMIT 1`,
    [followUpId, accountId]
  );

  return result.rows[0] ?? null;
}

export async function listFollowUps(
  accountId: string,
  status?: string
): Promise<FollowUpRecord[]> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const conditions: string[] = ["account_id = $1"];
  const params: unknown[] = [accountId];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const result = await executeQuery<FollowUpRecord>(
    `SELECT
       id, account_id as "accountId", person_name as "personName", commitment, details,
       due_at as "dueAt", time_zone as "timeZone", email_address as "emailAddress",
       phone_number as "phoneNumber", whatsapp_number as "whatsappNumber",
       preferred_action as "preferredAction", recurrence_json as "recurrence",
       status, source_note_id as "sourceNoteId", source_excerpt as "sourceExcerpt",
       revision, created_at as "createdAt", updated_at as "updatedAt"
     FROM followups
     WHERE ${conditions.join(" AND ")}
     ORDER BY due_at ASC`,
    params
  );

  return result.rows;
}

export async function updateFollowUp(
  accountId: string,
  followUpId: string,
  patch: {
    personName?: string;
    commitment?: string;
    details?: string | null;
    dueAt?: string;
    timeZone?: string;
    emailAddress?: string | null;
    phoneNumber?: string | null;
    whatsappNumber?: string | null;
    preferredAction?: string | null;
    recurrence?: unknown | null;
    status?: string;
  }
): Promise<FollowUpRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const existing = await getFollowUp(accountId, followUpId);
  if (!existing) {
    return null;
  }

  if (patch.recurrence !== undefined) {
    const recError = validateRecurrenceRule(patch.recurrence);
    if (recError) {
      throw new Error(`BAD_REQUEST: ${recError}`);
    }
  }

  const revision = await advanceAccountRevision(accountId);
  const personName = patch.personName !== undefined ? patch.personName.trim() : existing.personName;
  const commitment = patch.commitment !== undefined ? patch.commitment.trim() : existing.commitment;
  const details = patch.details !== undefined ? patch.details : existing.details;
  const dueAt = patch.dueAt !== undefined ? patch.dueAt : existing.dueAt;
  const timeZone = patch.timeZone !== undefined ? patch.timeZone : existing.timeZone;
  const emailAddress = patch.emailAddress !== undefined ? patch.emailAddress : existing.emailAddress;
  const phoneNumber = patch.phoneNumber !== undefined ? patch.phoneNumber : existing.phoneNumber;
  const whatsappNumber = patch.whatsappNumber !== undefined ? patch.whatsappNumber : existing.whatsappNumber;
  const preferredAction = patch.preferredAction !== undefined ? patch.preferredAction : existing.preferredAction;
  const recurrence =
    patch.recurrence !== undefined
      ? patch.recurrence
        ? JSON.stringify(patch.recurrence)
        : null
      : existing.recurrence
      ? JSON.stringify(existing.recurrence)
      : null;
  const status = patch.status !== undefined ? patch.status : existing.status;

  const result = await executeQuery<FollowUpRecord>(
    `UPDATE followups
     SET
       person_name = $1, commitment = $2, details = $3, due_at = $4,
       time_zone = $5, email_address = $6, phone_number = $7,
       whatsapp_number = $8, preferred_action = $9, recurrence_json = $10,
       status = $11, revision = $12, updated_at = NOW()
     WHERE id = $13 AND account_id = $14
     RETURNING
       id, account_id as "accountId", person_name as "personName", commitment, details,
       due_at as "dueAt", time_zone as "timeZone", email_address as "emailAddress",
       phone_number as "phoneNumber", whatsapp_number as "whatsappNumber",
       preferred_action as "preferredAction", recurrence_json as "recurrence",
       status, source_note_id as "sourceNoteId", source_excerpt as "sourceExcerpt",
       revision, created_at as "createdAt", updated_at as "updatedAt"`,
    [
      personName,
      commitment,
      details,
      dueAt,
      timeZone,
      emailAddress,
      phoneNumber,
      whatsappNumber,
      preferredAction,
      recurrence,
      status,
      revision,
      followUpId,
      accountId,
    ]
  );

  return result.rows[0] ?? null;
}

export async function deleteFollowUp(
  accountId: string,
  followUpId: string
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery(
    `DELETE FROM followups WHERE id = $1 AND account_id = $2`,
    [followUpId, accountId]
  );

  if ((result.rowCount ?? 0) > 0) {
    await recordTombstone(accountId, followUpId, "followup");
    return true;
  }

  return false;
}

export async function recordOccurrence(
  accountId: string,
  followUpId: string,
  dueAt: string,
  completedAt?: string
): Promise<OccurrenceRecord> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  // Ensure follow-up belongs to account
  const followUp = await getFollowUp(accountId, followUpId);
  if (!followUp) {
    throw new Error("NOT_FOUND: FollowUp not found or does not belong to account");
  }

  const id = `occ_${crypto.randomUUID()}`;
  const actualCompletedAt = completedAt ?? new Date().toISOString();
  const revision = await advanceAccountRevision(accountId);

  const result = await executeQuery<OccurrenceRecord>(
    `INSERT INTO occurrence_history (id, followup_id, account_id, due_at, completed_at, revision, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id, followup_id as "followupId", account_id as "accountId", due_at as "dueAt",
               completed_at as "completedAt", revision, created_at as "createdAt"`,
    [id, followUpId, accountId, dueAt, actualCompletedAt, revision]
  );

  return result.rows[0];
}

export async function listOccurrences(
  accountId: string,
  followUpId?: string
): Promise<OccurrenceRecord[]> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  let query = `SELECT id, followup_id as "followupId", account_id as "accountId", due_at as "dueAt",
                      completed_at as "completedAt", revision, created_at as "createdAt"
               FROM occurrence_history
               WHERE account_id = $1`;
  const params: unknown[] = [accountId];

  if (followUpId) {
    params.push(followUpId);
    query += ` AND followup_id = $2`;
  }

  query += ` ORDER BY completed_at DESC`;

  const result = await executeQuery<OccurrenceRecord>(query, params);
  return result.rows;
}

// Daily Plans Operations

export async function upsertDailyPlan(
  accountId: string,
  input: {
    id?: string;
    planDate: string;
    availableMinutes: number;
    items: unknown[];
    status?: string;
  }
): Promise<DailyPlanRecord> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const id = input.id ?? `pln_${crypto.randomUUID()}`;
  const revision = await advanceAccountRevision(accountId);
  const status = input.status ?? "active";

  const result = await executeQuery<DailyPlanRecord>(
    `INSERT INTO daily_plans (
       id, account_id, plan_date, available_minutes, items_json, status, revision, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (account_id, plan_date)
     DO UPDATE SET
       available_minutes = EXCLUDED.available_minutes,
       items_json = EXCLUDED.items_json,
       status = EXCLUDED.status,
       revision = EXCLUDED.revision,
       updated_at = NOW()
     RETURNING
       id, account_id as "accountId", plan_date as "planDate",
       available_minutes as "availableMinutes", items_json as "items",
       status, revision, created_at as "createdAt", updated_at as "updatedAt"`,
    [
      id,
      accountId,
      input.planDate,
      input.availableMinutes,
      JSON.stringify(input.items),
      status,
      revision,
    ]
  );

  return result.rows[0];
}

export async function getDailyPlanByDate(
  accountId: string,
  planDate: string
): Promise<DailyPlanRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<DailyPlanRecord>(
    `SELECT
       id, account_id as "accountId", plan_date as "planDate",
       available_minutes as "availableMinutes", items_json as "items",
       status, revision, created_at as "createdAt", updated_at as "updatedAt"
     FROM daily_plans
     WHERE account_id = $1 AND plan_date = $2
     LIMIT 1`,
    [accountId, planDate]
  );

  return result.rows[0] ?? null;
}

export async function listDailyPlans(
  accountId: string,
  limit = 30
): Promise<DailyPlanRecord[]> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<DailyPlanRecord>(
    `SELECT
       id, account_id as "accountId", plan_date as "planDate",
       available_minutes as "availableMinutes", items_json as "items",
       status, revision, created_at as "createdAt", updated_at as "updatedAt"
     FROM daily_plans
     WHERE account_id = $1
     ORDER BY plan_date DESC
     LIMIT $2`,
    [accountId, limit]
  );

  return result.rows;
}

// Inbox Captures Operations

export async function createInboxCapture(
  accountId: string,
  input: {
    id?: string;
    text: string;
    sharedUrl?: string | null;
    sourceAppLabel?: string | null;
  }
): Promise<InboxCaptureRecord> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const id = input.id ?? `inb_${crypto.randomUUID()}`;
  const revision = await advanceAccountRevision(accountId);

  const result = await executeQuery<InboxCaptureRecord>(
    `INSERT INTO inbox_captures (
       id, account_id, text, shared_url, source_app_label, state, revision,
       captured_at, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW(), NOW(), NOW())
     RETURNING
       id, account_id as "accountId", text, shared_url as "sharedUrl",
       source_app_label as "sourceAppLabel", state, target_type as "targetType",
       target_id as "targetId", captured_at as "capturedAt",
       processed_at as "processedAt", discarded_at as "discardedAt",
       revision, created_at as "createdAt", updated_at as "updatedAt"`,
    [
      id,
      accountId,
      input.text.trim(),
      input.sharedUrl ?? null,
      input.sourceAppLabel ?? null,
      revision,
    ]
  );

  return result.rows[0];
}

export async function getInboxCapture(
  accountId: string,
  captureId: string
): Promise<InboxCaptureRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<InboxCaptureRecord>(
    `SELECT
       id, account_id as "accountId", text, shared_url as "sharedUrl",
       source_app_label as "sourceAppLabel", state, target_type as "targetType",
       target_id as "targetId", captured_at as "capturedAt",
       processed_at as "processedAt", discarded_at as "discardedAt",
       revision, created_at as "createdAt", updated_at as "updatedAt"
     FROM inbox_captures
     WHERE id = $1 AND account_id = $2
     LIMIT 1`,
    [captureId, accountId]
  );

  return result.rows[0] ?? null;
}

export async function listInboxCaptures(
  accountId: string,
  state?: string
): Promise<InboxCaptureRecord[]> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const conditions: string[] = ["account_id = $1"];
  const params: unknown[] = [accountId];

  if (state) {
    params.push(state);
    conditions.push(`state = $${params.length}`);
  }

  const result = await executeQuery<InboxCaptureRecord>(
    `SELECT
       id, account_id as "accountId", text, shared_url as "sharedUrl",
       source_app_label as "sourceAppLabel", state, target_type as "targetType",
       target_id as "targetId", captured_at as "capturedAt",
       processed_at as "processedAt", discarded_at as "discardedAt",
       revision, created_at as "createdAt", updated_at as "updatedAt"
     FROM inbox_captures
     WHERE ${conditions.join(" AND ")}
     ORDER BY captured_at DESC`,
    params
  );

  return result.rows;
}

export async function updateInboxCapture(
  accountId: string,
  captureId: string,
  patch: {
    state?: string;
    targetType?: string | null;
    targetId?: string | null;
  }
): Promise<InboxCaptureRecord | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const existing = await getInboxCapture(accountId, captureId);
  if (!existing) {
    return null;
  }

  const revision = await advanceAccountRevision(accountId);
  const state = patch.state !== undefined ? patch.state : existing.state;
  const targetType = patch.targetType !== undefined ? patch.targetType : existing.targetType;
  const targetId = patch.targetId !== undefined ? patch.targetId : existing.targetId;

  let processedAt = existing.processedAt;
  let discardedAt = existing.discardedAt;

  if (state === "processed" && !processedAt) {
    processedAt = new Date().toISOString();
  }
  if (state === "discarded" && !discardedAt) {
    discardedAt = new Date().toISOString();
  }

  const result = await executeQuery<InboxCaptureRecord>(
    `UPDATE inbox_captures
     SET
       state = $1, target_type = $2, target_id = $3,
       processed_at = $4, discarded_at = $5, revision = $6, updated_at = NOW()
     WHERE id = $7 AND account_id = $8
     RETURNING
       id, account_id as "accountId", text, shared_url as "sharedUrl",
       source_app_label as "sourceAppLabel", state, target_type as "targetType",
       target_id as "targetId", captured_at as "capturedAt",
       processed_at as "processedAt", discarded_at as "discardedAt",
       revision, created_at as "createdAt", updated_at as "updatedAt"`,
    [state, targetType, targetId, processedAt, discardedAt, revision, captureId, accountId]
  );

  return result.rows[0] ?? null;
}

export async function deleteInboxCapture(
  accountId: string,
  captureId: string
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery(
    `DELETE FROM inbox_captures WHERE id = $1 AND account_id = $2`,
    [captureId, accountId]
  );

  if ((result.rowCount ?? 0) > 0) {
    await recordTombstone(accountId, captureId, "inbox_capture");
    return true;
  }

  return false;
}

// Task Orders Operations

export async function getTaskOrder(accountId: string): Promise<string[]> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<{ task_ids_json: string[] }>(
    `SELECT task_ids_json FROM task_orders WHERE account_id = $1 LIMIT 1`,
    [accountId]
  );

  return result.rows[0]?.task_ids_json ?? [];
}

export async function setTaskOrder(
  accountId: string,
  taskIds: string[]
): Promise<TaskOrderRecord> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const revision = await advanceAccountRevision(accountId);

  const result = await executeQuery<{
    account_id: string;
    task_ids_json: string[];
    revision: number;
    updated_at: string;
  }>(
    `INSERT INTO task_orders (account_id, task_ids_json, revision, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (account_id)
     DO UPDATE SET task_ids_json = EXCLUDED.task_ids_json, revision = EXCLUDED.revision, updated_at = NOW()
     RETURNING account_id, task_ids_json, revision, updated_at`,
    [accountId, JSON.stringify(taskIds), revision]
  );

  return {
    accountId: result.rows[0].account_id,
    taskIds: result.rows[0].task_ids_json,
    revision: result.rows[0].revision,
    updatedAt: result.rows[0].updated_at,
  };
}
