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

export interface OutboxRecord {
  id: string;
  mutationId: string;
  protocolVersion: number;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncMutationAction;
  baseRevision: number | null;
  payload: string | null;
  createdAt: string;
}

export interface SyncCursor {
  workspaceId: string;
  cursor: number;
  updatedAt: string;
}

export interface ConflictRecord {
  id: string;
  workspaceId: string;
  entityType: SyncEntityType;
  entityId: string;
  localValue: string | null;
  serverValue: string | null;
  serverRevision: number;
  createdAt: string;
}

export interface TombstoneRecord {
  id: string;
  workspaceId: string;
  entityType: SyncEntityType;
  entityId: string;
  deletedAt: string;
}

export interface ServerRevisionRecord {
  entityType: SyncEntityType;
  entityId: string;
  serverRevision: number;
}

export interface SyncMutation {
  mutationId: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncMutationAction;
  baseRevision?: number | null;
  payload?: unknown;
}

export interface SyncReceipt {
  mutationId: string;
  status: SyncReceiptStatus;
  entityType: SyncEntityType;
  entityId: string;
  appliedRevision?: number | null;
  conflictDetails?: {
    message: string;
    serverRevision: number;
    currentServerEntity: unknown | null;
  } | null;
  error?: string | null;
}

export interface SyncChange {
  entityType: SyncEntityType;
  entityId: string;
  action: SyncMutationAction;
  revision: number;
  data?: Record<string, unknown>;
}

export interface SyncResponse {
  receipts: SyncReceipt[];
  changes: SyncChange[];
  nextCursor: number;
  hasMore: boolean;
}

export type MobileSyncStatus = "idle" | "syncing" | "offline" | "error" | "conflict";

export interface MobileSyncState {
  status: MobileSyncStatus;
  lastSyncedAt: string | null;
  pendingMutationsCount: number;
  unresolvedConflictsCount: number;
  errorMessage?: string | null;
}
