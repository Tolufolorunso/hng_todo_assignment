import { executeQuery, isDatabaseConfigured } from "./db/client";
import {
  advanceAccountRevision,
  recordTombstone,
  validateRecurrenceRule,
  type TaskRecord,
  type NoteRecord,
  type FollowUpRecord,
  type OccurrenceRecord,
  type DailyPlanRecord,
  type InboxCaptureRecord,
  type TaskOrderRecord,
} from "./productivity";
import { sanitizeHtml } from "@/lib/html";

export const SYNC_PROTOCOL_VERSION = 1;
export const MAX_SYNC_MUTATIONS_PER_BATCH = 100;
export const DEFAULT_SYNC_PAGE_LIMIT = 100;
export const MAX_SYNC_PAGE_LIMIT = 200;

export type SyncEntityType =
  | "task"
  | "note"
  | "followup"
  | "occurrence"
  | "plan"
  | "inbox"
  | "task_order";

export type SyncMutationAction = "put" | "delete";
export type SyncReceiptStatus = "applied" | "duplicate" | "conflict" | "invalid";

export interface SyncMutation {
  mutationId: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncMutationAction;
  baseRevision?: number | null;
  payload?: unknown;
}

export interface ConflictDetails {
  message: string;
  serverRevision: number;
  currentServerEntity: unknown | null;
}

export interface SyncReceipt {
  mutationId: string;
  status: SyncReceiptStatus;
  entityType: SyncEntityType;
  entityId: string;
  appliedRevision?: number | null;
  conflictDetails?: ConflictDetails | null;
  error?: string | null;
}

export interface SyncTombstone {
  id: string;
  entityType: string;
  deletedAt: string;
  revision: number;
}

export interface SyncChanges {
  tasks: TaskRecord[];
  notes: NoteRecord[];
  followups: FollowUpRecord[];
  occurrences: OccurrenceRecord[];
  plans: DailyPlanRecord[];
  inbox: InboxCaptureRecord[];
  taskOrder: TaskOrderRecord | null;
  tombstones: SyncTombstone[];
}

export interface SyncResult {
  protocolVersion: number;
  receipts: SyncReceipt[];
  changes: SyncChanges;
  nextCursor: number;
  hasMore: boolean;
  serverTime: string;
}

interface StoredReceiptRow {
  mutation_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  action: SyncMutationAction;
  status: SyncReceiptStatus;
  applied_revision: string | null;
  conflict_details: ConflictDetails | null;
}

export async function processSyncBatch(
  accountId: string,
  options: {
    protocolVersion?: number;
    mutations?: SyncMutation[];
    cursor?: number;
    limit?: number;
  }
): Promise<SyncResult> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const protocolVersion = options.protocolVersion ?? SYNC_PROTOCOL_VERSION;
  if (protocolVersion !== SYNC_PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${protocolVersion}. Expected: ${SYNC_PROTOCOL_VERSION}`);
  }

  const mutations = options.mutations ?? [];
  if (mutations.length > MAX_SYNC_MUTATIONS_PER_BATCH) {
    throw new Error(`Batch size exceeds maximum limit of ${MAX_SYNC_MUTATIONS_PER_BATCH} mutations`);
  }

  const cursor = Math.max(0, options.cursor ?? 0);
  const limit = Math.min(MAX_SYNC_PAGE_LIMIT, Math.max(1, options.limit ?? DEFAULT_SYNC_PAGE_LIMIT));

  const receipts: SyncReceipt[] = [];

  // 1. Process mutations sequentially
  for (const mutation of mutations) {
    const receipt = await processSingleMutation(accountId, mutation);
    receipts.push(receipt);
  }

  // 2. Fetch paginated changes with revision > cursor
  const { changes, nextCursor, hasMore } = await fetchPaginatedChanges(accountId, cursor, limit);

  return {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    receipts,
    changes,
    nextCursor,
    hasMore,
    serverTime: new Date().toISOString(),
  };
}

async function processSingleMutation(
  accountId: string,
  mutation: SyncMutation
): Promise<SyncReceipt> {
  const { mutationId, entityType, entityId, action, baseRevision, payload } = mutation;

  // 1. Check idempotency: see if this mutation was already processed
  const existingReceipt = await executeQuery<StoredReceiptRow>(
    `SELECT mutation_id, entity_type, entity_id, action, status, applied_revision, conflict_details
     FROM sync_mutation_receipts
     WHERE account_id = $1 AND mutation_id = $2`,
    [accountId, mutationId]
  );

  if (existingReceipt.rows.length > 0) {
    const row = existingReceipt.rows[0];
    return {
      mutationId: row.mutation_id,
      status: "duplicate",
      entityType: row.entity_type,
      entityId: row.entity_id,
      appliedRevision: row.applied_revision ? parseInt(row.applied_revision, 10) : null,
      conflictDetails: row.conflict_details,
    };
  }

  // 2. Look up current server entity to check revision concurrency
  const currentEntity = await fetchCurrentServerEntity(accountId, entityType, entityId);

  // 3. Check for conflict on existing entity if baseRevision is provided
  if (currentEntity && baseRevision !== undefined && baseRevision !== null) {
    const serverRev = currentEntity.revision;
    if (serverRev > baseRevision) {
      const conflictDetails: ConflictDetails = {
        message: "Server entity was updated after client base revision",
        serverRevision: serverRev,
        currentServerEntity: currentEntity.data,
      };

      await recordMutationReceipt(accountId, mutationId, entityType, entityId, action, "conflict", null, conflictDetails);

      return {
        mutationId,
        status: "conflict",
        entityType,
        entityId,
        conflictDetails,
      };
    }
  }

  // 4. Handle Delete Action
  if (action === "delete") {
    let tombstoneRev: number | null = null;
    const deleted = await deleteEntityFromDatabase(accountId, entityType, entityId);
    if (deleted) {
      tombstoneRev = await recordTombstone(accountId, entityId, entityType);
    }

    await recordMutationReceipt(accountId, mutationId, entityType, entityId, "delete", "applied", tombstoneRev, null);

    return {
      mutationId,
      status: "applied",
      entityType,
      entityId,
      appliedRevision: tombstoneRev,
    };
  }

  // 5. Handle Put Action
  if (action === "put") {
    const validationError = validateMutationPayload(entityType, payload);
    if (validationError) {
      await recordMutationReceipt(accountId, mutationId, entityType, entityId, "put", "invalid", null, null);
      return {
        mutationId,
        status: "invalid",
        entityType,
        entityId,
        error: validationError,
      };
    }

    try {
      const appliedRevision = await applyPutMutation(accountId, entityType, entityId, payload as Record<string, unknown>);
      await recordMutationReceipt(accountId, mutationId, entityType, entityId, "put", "applied", appliedRevision, null);

      return {
        mutationId,
        status: "applied",
        entityType,
        entityId,
        appliedRevision,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await recordMutationReceipt(accountId, mutationId, entityType, entityId, "put", "invalid", null, null);
      return {
        mutationId,
        status: "invalid",
        entityType,
        entityId,
        error: msg,
      };
    }
  }

  return {
    mutationId,
    status: "invalid",
    entityType,
    entityId,
    error: `Unknown mutation action: ${String(action)}`,
  };
}

async function recordMutationReceipt(
  accountId: string,
  mutationId: string,
  entityType: string,
  entityId: string,
  action: string,
  status: SyncReceiptStatus,
  appliedRevision: number | null,
  conflictDetails: ConflictDetails | null
): Promise<void> {
  await executeQuery(
    `INSERT INTO sync_mutation_receipts (
       account_id, mutation_id, entity_type, entity_id, action, status, applied_revision, conflict_details, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (account_id, mutation_id) DO NOTHING`,
    [
      accountId,
      mutationId,
      entityType,
      entityId,
      action,
      status,
      appliedRevision,
      conflictDetails ? JSON.stringify(conflictDetails) : null,
    ]
  );
}

async function fetchCurrentServerEntity(
  accountId: string,
  entityType: SyncEntityType,
  entityId: string
): Promise<{ revision: number; data: unknown } | null> {
  switch (entityType) {
    case "task": {
      const res = await executeQuery<{ revision: string }>(
        `SELECT id, title, description, completed, priority, due_date as "dueDate",
                category, estimated_minutes as "estimatedMinutes", source_note_id as "sourceNoteId",
                source_excerpt as "sourceExcerpt", revision, created_at as "createdAt",
                updated_at as "updatedAt", completed_at as "completedAt"
         FROM tasks WHERE id = $1 AND account_id = $2`,
        [entityId, accountId]
      );
      if (res.rows.length === 0) return null;
      return { revision: parseInt(res.rows[0].revision, 10), data: res.rows[0] };
    }
    case "note": {
      const res = await executeQuery<{ revision: string }>(
        `SELECT id, title, body, revision, created_at as "createdAt", updated_at as "updatedAt"
         FROM notes WHERE id = $1 AND account_id = $2`,
        [entityId, accountId]
      );
      if (res.rows.length === 0) return null;
      return { revision: parseInt(res.rows[0].revision, 10), data: res.rows[0] };
    }
    case "followup": {
      const res = await executeQuery<{ revision: string }>(
        `SELECT id, person_name as "personName", commitment, details, due_at as "dueAt",
                time_zone as "timeZone", email_address as "emailAddress", phone_number as "phoneNumber",
                whatsapp_number as "whatsappNumber", preferred_action as "preferredAction",
                recurrence_json as "recurrence", status, source_note_id as "sourceNoteId",
                source_excerpt as "sourceExcerpt", revision, created_at as "createdAt",
                updated_at as "updatedAt"
         FROM followups WHERE id = $1 AND account_id = $2`,
        [entityId, accountId]
      );
      if (res.rows.length === 0) return null;
      return { revision: parseInt(res.rows[0].revision, 10), data: res.rows[0] };
    }
    case "occurrence": {
      const res = await executeQuery<{ revision: string }>(
        `SELECT id, followup_id as "followupId", due_at as "dueAt", completed_at as "completedAt",
                revision, created_at as "createdAt"
         FROM occurrence_history WHERE id = $1 AND account_id = $2`,
        [entityId, accountId]
      );
      if (res.rows.length === 0) return null;
      return { revision: parseInt(res.rows[0].revision, 10), data: res.rows[0] };
    }
    case "plan": {
      const res = await executeQuery<{ revision: string }>(
        `SELECT id, plan_date as "planDate", available_minutes as "availableMinutes",
                items_json as "items", status, revision, created_at as "createdAt",
                updated_at as "updatedAt"
         FROM daily_plans WHERE id = $1 AND account_id = $2`,
        [entityId, accountId]
      );
      if (res.rows.length === 0) return null;
      return { revision: parseInt(res.rows[0].revision, 10), data: res.rows[0] };
    }
    case "inbox": {
      const res = await executeQuery<{ revision: string }>(
        `SELECT id, text, shared_url as "sharedUrl", source_app_label as "sourceAppLabel",
                state, target_type as "targetType", target_id as "targetId",
                captured_at as "capturedAt", processed_at as "processedAt",
                discarded_at as "discardedAt", revision, created_at as "createdAt",
                updated_at as "updatedAt"
         FROM inbox_captures WHERE id = $1 AND account_id = $2`,
        [entityId, accountId]
      );
      if (res.rows.length === 0) return null;
      return { revision: parseInt(res.rows[0].revision, 10), data: res.rows[0] };
    }
    case "task_order": {
      const res = await executeQuery<{ revision: string }>(
        `SELECT task_ids_json as "taskIds", revision, updated_at as "updatedAt"
         FROM task_orders WHERE account_id = $1`,
        [accountId]
      );
      if (res.rows.length === 0) return null;
      return { revision: parseInt(res.rows[0].revision, 10), data: res.rows[0] };
    }
    default:
      return null;
  }
}

async function deleteEntityFromDatabase(
  accountId: string,
  entityType: SyncEntityType,
  entityId: string
): Promise<boolean> {
  let table = "";
  switch (entityType) {
    case "task":
      table = "tasks";
      break;
    case "note":
      table = "notes";
      break;
    case "followup":
      table = "followups";
      break;
    case "occurrence":
      table = "occurrence_history";
      break;
    case "plan":
      table = "daily_plans";
      break;
    case "inbox":
      table = "inbox_captures";
      break;
    case "task_order":
      table = "task_orders";
      break;
    default:
      return false;
  }

  const result = await executeQuery(
    `DELETE FROM ${table} WHERE id = $1 AND account_id = $2`,
    [entityId, accountId]
  );

  return (result.rowCount ?? 0) > 0;
}

function validateMutationPayload(entityType: SyncEntityType, payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Payload must be an object";
  }

  const p = payload as Record<string, unknown>;

  switch (entityType) {
    case "task":
      if (!p.title || typeof p.title !== "string" || p.title.trim().length === 0) {
        return "Task title is required and cannot be empty";
      }
      if (p.title.length > 200) {
        return "Task title cannot exceed 200 characters";
      }
      return null;
    case "note":
      if (!p.title || typeof p.title !== "string" || p.title.trim().length === 0) {
        return "Note title is required and cannot be empty";
      }
      if (p.title.length > 200) {
        return "Note title cannot exceed 200 characters";
      }
      return null;
    case "followup":
      if (!p.personName || typeof p.personName !== "string" || p.personName.trim().length === 0) {
        return "FollowUp personName is required";
      }
      if (!p.commitment || typeof p.commitment !== "string" || p.commitment.trim().length === 0) {
        return "FollowUp commitment is required";
      }
      if (!p.dueAt || typeof p.dueAt !== "string") {
        return "FollowUp dueAt is required";
      }
      if (p.recurrence !== undefined && p.recurrence !== null) {
        const recErr = validateRecurrenceRule(p.recurrence);
        if (recErr) return recErr;
      }
      return null;
    case "occurrence":
      if (!p.followupId || typeof p.followupId !== "string") {
        return "Occurrence followupId is required";
      }
      if (!p.dueAt || typeof p.dueAt !== "string") {
        return "Occurrence dueAt is required";
      }
      return null;
    case "plan":
      if (!p.planDate || typeof p.planDate !== "string") {
        return "Daily plan planDate is required";
      }
      if (typeof p.availableMinutes !== "number" || p.availableMinutes < 0) {
        return "Daily plan availableMinutes must be a non-negative number";
      }
      if (!Array.isArray(p.items)) {
        return "Daily plan items must be an array";
      }
      return null;
    case "inbox":
      if (!p.text || typeof p.text !== "string" || p.text.trim().length === 0) {
        return "Inbox capture text is required";
      }
      return null;
    case "task_order":
      if (!Array.isArray(p.taskIds) || !p.taskIds.every((id) => typeof id === "string")) {
        return "taskIds must be an array of strings";
      }
      return null;
    default:
      return `Unknown entity type: ${String(entityType)}`;
  }
}

async function applyPutMutation(
  accountId: string,
  entityType: SyncEntityType,
  entityId: string,
  payload: Record<string, unknown>
): Promise<number> {
  const revision = await advanceAccountRevision(accountId);

  switch (entityType) {
    case "task": {
      const title = String(payload.title).trim();
      const description = typeof payload.description === "string" ? sanitizeHtml(payload.description) : null;
      const completed = Boolean(payload.completed);
      const priority = typeof payload.priority === "string" ? payload.priority : "medium";
      const dueDate = typeof payload.dueDate === "string" ? payload.dueDate : null;
      const category = typeof payload.category === "string" ? payload.category : null;
      const estimatedMinutes = typeof payload.estimatedMinutes === "number" ? payload.estimatedMinutes : null;
      const sourceNoteId = typeof payload.sourceNoteId === "string" ? payload.sourceNoteId : null;
      const sourceExcerpt = typeof payload.sourceExcerpt === "string" ? payload.sourceExcerpt : null;
      const completedAt = completed ? (typeof payload.completedAt === "string" ? payload.completedAt : new Date().toISOString()) : null;

      await executeQuery(
        `INSERT INTO tasks (
           id, account_id, title, description, completed, priority, due_date, category,
           estimated_minutes, source_note_id, source_excerpt, revision, created_at, updated_at, completed_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), $13)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           completed = EXCLUDED.completed,
           priority = EXCLUDED.priority,
           due_date = EXCLUDED.due_date,
           category = EXCLUDED.category,
           estimated_minutes = EXCLUDED.estimated_minutes,
           source_note_id = EXCLUDED.source_note_id,
           source_excerpt = EXCLUDED.source_excerpt,
           revision = EXCLUDED.revision,
           updated_at = NOW(),
           completed_at = EXCLUDED.completed_at
         WHERE tasks.account_id = $2`,
        [
          entityId,
          accountId,
          title,
          description,
          completed,
          priority,
          dueDate,
          category,
          estimatedMinutes,
          sourceNoteId,
          sourceExcerpt,
          revision,
          completedAt,
        ]
      );
      return revision;
    }

    case "note": {
      const title = String(payload.title).trim();
      const body = typeof payload.body === "string" ? sanitizeHtml(payload.body) : "";

      await executeQuery(
        `INSERT INTO notes (id, account_id, title, body, revision, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           body = EXCLUDED.body,
           revision = EXCLUDED.revision,
           updated_at = NOW()
         WHERE notes.account_id = $2`,
        [entityId, accountId, title, body, revision]
      );
      return revision;
    }

    case "followup": {
      const personName = String(payload.personName).trim();
      const commitment = String(payload.commitment).trim();
      const details = typeof payload.details === "string" ? payload.details : null;
      const dueAt = String(payload.dueAt);
      const timeZone = typeof payload.timeZone === "string" ? payload.timeZone : "UTC";
      const emailAddress = typeof payload.emailAddress === "string" ? payload.emailAddress : null;
      const phoneNumber = typeof payload.phoneNumber === "string" ? payload.phoneNumber : null;
      const whatsappNumber = typeof payload.whatsappNumber === "string" ? payload.whatsappNumber : null;
      const preferredAction = typeof payload.preferredAction === "string" ? payload.preferredAction : null;
      const recurrenceJson = payload.recurrence ? JSON.stringify(payload.recurrence) : null;
      const status = typeof payload.status === "string" ? payload.status : "open";
      const sourceNoteId = typeof payload.sourceNoteId === "string" ? payload.sourceNoteId : null;
      const sourceExcerpt = typeof payload.sourceExcerpt === "string" ? payload.sourceExcerpt : null;

      await executeQuery(
        `INSERT INTO followups (
           id, account_id, person_name, commitment, details, due_at, time_zone,
           email_address, phone_number, whatsapp_number, preferred_action, recurrence_json,
           status, source_note_id, source_excerpt, revision, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           person_name = EXCLUDED.person_name,
           commitment = EXCLUDED.commitment,
           details = EXCLUDED.details,
           due_at = EXCLUDED.due_at,
           time_zone = EXCLUDED.time_zone,
           email_address = EXCLUDED.email_address,
           phone_number = EXCLUDED.phone_number,
           whatsapp_number = EXCLUDED.whatsapp_number,
           preferred_action = EXCLUDED.preferred_action,
           recurrence_json = EXCLUDED.recurrence_json,
           status = EXCLUDED.status,
           source_note_id = EXCLUDED.source_note_id,
           source_excerpt = EXCLUDED.source_excerpt,
           revision = EXCLUDED.revision,
           updated_at = NOW()
         WHERE followups.account_id = $2`,
        [
          entityId,
          accountId,
          personName,
          commitment,
          details,
          dueAt,
          timeZone,
          emailAddress,
          phoneNumber,
          whatsappNumber,
          preferredAction,
          recurrenceJson,
          status,
          sourceNoteId,
          sourceExcerpt,
          revision,
        ]
      );
      return revision;
    }

    case "occurrence": {
      const followupId = String(payload.followupId);
      const dueAt = String(payload.dueAt);
      const completedAt = typeof payload.completedAt === "string" ? payload.completedAt : new Date().toISOString();

      await executeQuery(
        `INSERT INTO occurrence_history (id, followup_id, account_id, due_at, completed_at, revision, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE SET
           completed_at = EXCLUDED.completed_at,
           revision = EXCLUDED.revision
         WHERE occurrence_history.account_id = $3`,
        [entityId, followupId, accountId, dueAt, completedAt, revision]
      );
      return revision;
    }

    case "plan": {
      const planDate = String(payload.planDate);
      const availableMinutes = Number(payload.availableMinutes);
      const itemsJson = JSON.stringify(payload.items ?? []);
      const status = typeof payload.status === "string" ? payload.status : "active";

      await executeQuery(
        `INSERT INTO daily_plans (id, account_id, plan_date, available_minutes, items_json, status, revision, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (account_id, plan_date) DO UPDATE SET
           available_minutes = EXCLUDED.available_minutes,
           items_json = EXCLUDED.items_json,
           status = EXCLUDED.status,
           revision = EXCLUDED.revision,
           updated_at = NOW()`,
        [entityId, accountId, planDate, availableMinutes, itemsJson, status, revision]
      );
      return revision;
    }

    case "inbox": {
      const text = String(payload.text).trim();
      const sharedUrl = typeof payload.sharedUrl === "string" ? payload.sharedUrl : null;
      const sourceAppLabel = typeof payload.sourceAppLabel === "string" ? payload.sourceAppLabel : null;
      const state = typeof payload.state === "string" ? payload.state : "pending";
      const targetType = typeof payload.targetType === "string" ? payload.targetType : null;
      const targetId = typeof payload.targetId === "string" ? payload.targetId : null;

      await executeQuery(
        `INSERT INTO inbox_captures (
           id, account_id, text, shared_url, source_app_label, state, target_type, target_id,
           captured_at, revision, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           text = EXCLUDED.text,
           shared_url = EXCLUDED.shared_url,
           source_app_label = EXCLUDED.source_app_label,
           state = EXCLUDED.state,
           target_type = EXCLUDED.target_type,
           target_id = EXCLUDED.target_id,
           revision = EXCLUDED.revision,
           updated_at = NOW()
         WHERE inbox_captures.account_id = $2`,
        [entityId, accountId, text, sharedUrl, sourceAppLabel, state, targetType, targetId, revision]
      );
      return revision;
    }

    case "task_order": {
      const taskIdsJson = JSON.stringify(payload.taskIds ?? []);

      await executeQuery(
        `INSERT INTO task_orders (account_id, task_ids_json, revision, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (account_id) DO UPDATE SET
           task_ids_json = EXCLUDED.task_ids_json,
           revision = EXCLUDED.revision,
           updated_at = NOW()`,
        [accountId, taskIdsJson, revision]
      );
      return revision;
    }
  }
}

async function fetchPaginatedChanges(
  accountId: string,
  cursor: number,
  limit: number
): Promise<{ changes: SyncChanges; nextCursor: number; hasMore: boolean }> {
  // 1. Tasks
  const tasksRes = await executeQuery<TaskRecord>(
    `SELECT id, account_id as "accountId", title, description, completed, priority,
            due_date as "dueDate", category, estimated_minutes as "estimatedMinutes",
            source_note_id as "sourceNoteId", source_excerpt as "sourceExcerpt",
            revision, created_at as "createdAt", updated_at as "updatedAt",
            completed_at as "completedAt"
     FROM tasks
     WHERE account_id = $1 AND revision > $2
     ORDER BY revision ASC
     LIMIT $3`,
    [accountId, cursor, limit + 1]
  );

  // 2. Notes
  const notesRes = await executeQuery<NoteRecord>(
    `SELECT id, account_id as "accountId", title, body, revision,
            created_at as "createdAt", updated_at as "updatedAt"
     FROM notes
     WHERE account_id = $1 AND revision > $2
     ORDER BY revision ASC
     LIMIT $3`,
    [accountId, cursor, limit + 1]
  );

  // 3. Followups
  const followupsRes = await executeQuery<FollowUpRecord>(
    `SELECT id, account_id as "accountId", person_name as "personName", commitment, details,
            due_at as "dueAt", time_zone as "timeZone", email_address as "emailAddress",
            phone_number as "phoneNumber", whatsapp_number as "whatsappNumber",
            preferred_action as "preferredAction", recurrence_json as "recurrence",
            status, source_note_id as "sourceNoteId", source_excerpt as "sourceExcerpt",
            revision, created_at as "createdAt", updated_at as "updatedAt"
     FROM followups
     WHERE account_id = $1 AND revision > $2
     ORDER BY revision ASC
     LIMIT $3`,
    [accountId, cursor, limit + 1]
  );

  // 4. Occurrences
  const occurrencesRes = await executeQuery<OccurrenceRecord>(
    `SELECT id, followup_id as "followupId", account_id as "accountId", due_at as "dueAt",
            completed_at as "completedAt", revision, created_at as "createdAt"
     FROM occurrence_history
     WHERE account_id = $1 AND revision > $2
     ORDER BY revision ASC
     LIMIT $3`,
    [accountId, cursor, limit + 1]
  );

  // 5. Daily Plans
  const plansRes = await executeQuery<DailyPlanRecord>(
    `SELECT id, account_id as "accountId", plan_date as "planDate", available_minutes as "availableMinutes",
            items_json as "items", status, revision, created_at as "createdAt", updated_at as "updatedAt"
     FROM daily_plans
     WHERE account_id = $1 AND revision > $2
     ORDER BY revision ASC
     LIMIT $3`,
    [accountId, cursor, limit + 1]
  );

  // 6. Inbox Captures
  const inboxRes = await executeQuery<InboxCaptureRecord>(
    `SELECT id, account_id as "accountId", text, shared_url as "sharedUrl", source_app_label as "sourceAppLabel",
            state, target_type as "targetType", target_id as "targetId",
            captured_at as "capturedAt", processed_at as "processedAt", discarded_at as "discardedAt",
            revision, created_at as "createdAt", updated_at as "updatedAt"
     FROM inbox_captures
     WHERE account_id = $1 AND revision > $2
     ORDER BY revision ASC
     LIMIT $3`,
    [accountId, cursor, limit + 1]
  );

  // 7. Task Orders
  const orderRes = await executeQuery<TaskOrderRecord>(
    `SELECT account_id as "accountId", task_ids_json as "taskIds", revision, updated_at as "updatedAt"
     FROM task_orders
     WHERE account_id = $1 AND revision > $2`,
    [accountId, cursor]
  );

  // 8. Tombstones
  const tombstonesRes = await executeQuery<SyncTombstone>(
    `SELECT id, entity_type as "entityType", deleted_at as "deletedAt", revision
     FROM tombstones
     WHERE account_id = $1 AND revision > $2
     ORDER BY revision ASC
     LIMIT $3`,
    [accountId, cursor, limit + 1]
  );

  // Collect all revisions to determine max revision and pagination
  const allRevisions: number[] = [];
  tasksRes.rows.forEach((r) => allRevisions.push(Number(r.revision)));
  notesRes.rows.forEach((r) => allRevisions.push(Number(r.revision)));
  followupsRes.rows.forEach((r) => allRevisions.push(Number(r.revision)));
  occurrencesRes.rows.forEach((r) => allRevisions.push(Number(r.revision)));
  plansRes.rows.forEach((r) => allRevisions.push(Number(r.revision)));
  inboxRes.rows.forEach((r) => allRevisions.push(Number(r.revision)));
  if (orderRes.rows.length > 0) allRevisions.push(Number(orderRes.rows[0].revision));
  tombstonesRes.rows.forEach((r) => allRevisions.push(Number(r.revision)));

  const hasMore =
    tasksRes.rows.length > limit ||
    notesRes.rows.length > limit ||
    followupsRes.rows.length > limit ||
    occurrencesRes.rows.length > limit ||
    plansRes.rows.length > limit ||
    inboxRes.rows.length > limit ||
    tombstonesRes.rows.length > limit;

  // Trim to limit
  const tasks = tasksRes.rows.slice(0, limit);
  const notes = notesRes.rows.slice(0, limit);
  const followups = followupsRes.rows.slice(0, limit);
  const occurrences = occurrencesRes.rows.slice(0, limit);
  const plans = plansRes.rows.slice(0, limit);
  const inbox = inboxRes.rows.slice(0, limit);
  const taskOrder = orderRes.rows.length > 0 ? orderRes.rows[0] : null;
  const tombstones = tombstonesRes.rows.slice(0, limit);

  // Find max revision in trimmed items
  let maxRevision = cursor;
  for (const t of tasks) maxRevision = Math.max(maxRevision, Number(t.revision));
  for (const n of notes) maxRevision = Math.max(maxRevision, Number(n.revision));
  for (const f of followups) maxRevision = Math.max(maxRevision, Number(f.revision));
  for (const o of occurrences) maxRevision = Math.max(maxRevision, Number(o.revision));
  for (const p of plans) maxRevision = Math.max(maxRevision, Number(p.revision));
  for (const i of inbox) maxRevision = Math.max(maxRevision, Number(i.revision));
  if (taskOrder) maxRevision = Math.max(maxRevision, Number(taskOrder.revision));
  for (const s of tombstones) maxRevision = Math.max(maxRevision, Number(s.revision));

  return {
    changes: {
      tasks,
      notes,
      followups,
      occurrences,
      plans,
      inbox,
      taskOrder,
      tombstones,
    },
    nextCursor: maxRevision,
    hasMore,
  };
}
