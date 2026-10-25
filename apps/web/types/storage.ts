export type WorkspaceType = "local" | "account";

export interface WorkspaceRecord {
  id: string;
  name: string;
  type: WorkspaceType;
  accountId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskOrderRecord {
  id: string;
  workspaceId: string;
  orderedIds: string[];
  updatedAt: string;
}

export type OutboxEntityType =
  | "task"
  | "note"
  | "followup"
  | "occurrence"
  | "plan"
  | "inbox"
  | "task_order";

export type OutboxAction = "put" | "delete";

export interface OutboxMutationRecord {
  mutationId: string;
  workspaceId: string;
  protocolVersion: 1;
  entityType: OutboxEntityType;
  entityId: string;
  action: OutboxAction;
  baseRevision: number | null;
  payload: unknown;
  createdAt: string;
  retryCount?: number;
}

export interface SyncCursorRecord {
  workspaceId: string;
  cursor: number;
  lastSyncedAt: string | null;
  updatedAt: string;
}

export interface LocalTombstoneRecord {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  deletedAt: string;
  revision?: number | null;
}

export type ConflictStatus = "open" | "resolved";

export interface LocalConflictRecord {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  baseRevision: number | null;
  serverRevision: number;
  currentServerEntity: unknown;
  attemptedMutation: OutboxMutationRecord;
  status: ConflictStatus;
  detectedAt: string;
  resolvedAt?: string | null;
}
