import { getDb } from "@/lib/db";
import {
  dequeueOutbox,
  getSyncCursor,
  listOutbox,
  listLocalConflicts,
  recordLocalConflict,
  setSyncCursor,
  getActiveWorkspaceId,
} from "@/lib/repository";
import { broadcastSyncEvent, onSyncEvent } from "@/lib/broadcast";
import { getStoredAccessToken } from "@/lib/auth";
import type {
  LocalConflictRecord,
  OutboxMutationRecord,
} from "@/types/storage";

export type SyncStatus = "idle" | "syncing" | "offline" | "error" | "conflict";

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingMutationsCount: number;
  unresolvedConflictsCount: number;
  pendingOutboxCount: number;
  openConflictsCount: number;
  errorMessage?: string | null;
}

export interface SyncCycleResult {
  ok: boolean;
  appliedCount?: number;
  conflictsCount?: number;
  changesCount?: number;
  hasMore?: boolean;
  error?: string;
}

let syncState: SyncState = {
  status: "idle",
  lastSyncedAt: null,
  pendingMutationsCount: 0,
  unresolvedConflictsCount: 0,
  pendingOutboxCount: 0,
  openConflictsCount: 0,
  errorMessage: null,
};

const stateListeners = new Set<(state: SyncState) => void>();

function notifyStateChange(updates: Partial<SyncState>) {
  syncState = { ...syncState, ...updates };
  for (const listener of stateListeners) {
    listener(syncState);
  }
}

export function getSyncState(): SyncState {
  return syncState;
}

export function subscribeSyncState(listener: (state: SyncState) => void): () => void {
  stateListeners.add(listener);
  listener(syncState);
  return () => {
    stateListeners.delete(listener);
  };
}

export async function refreshSyncCounts(workspaceId: string = getActiveWorkspaceId()): Promise<void> {
  try {
    const outbox = await listOutbox(workspaceId);
    const conflicts = await listLocalConflicts(workspaceId);
    const openConflicts = conflicts.filter((c) => c.status === "open");

    const newStatus: SyncStatus =
      openConflicts.length > 0
        ? "conflict"
        : syncState.status === "syncing"
        ? "syncing"
        : "idle";

    notifyStateChange({
      pendingMutationsCount: outbox.length,
      unresolvedConflictsCount: openConflicts.length,
      pendingOutboxCount: outbox.length,
      openConflictsCount: openConflicts.length,
      status: newStatus,
    });
  } catch {
    // Ignore errors during count refresh
  }
}

export async function performSyncCycle(
  workspaceId: string,
  token?: string | null
): Promise<SyncCycleResult> {
  const activeToken = token ?? getStoredAccessToken();
  if (!activeToken) {
    return { ok: false, error: "Not authenticated" };
  }

  notifyStateChange({ status: "syncing", errorMessage: null });

  try {
    const outboxMutations = await listOutbox(workspaceId);
    const currentCursor = await getSyncCursor(workspaceId);
    const cursor = currentCursor ?? 0;

    // Slice up to batch limit (100)
    const batch = outboxMutations.slice(0, 100);

    const syncPayload = {
      protocolVersion: 1,
      mutations: batch.map((m) => ({
        mutationId: m.mutationId,
        entityType: m.entityType,
        entityId: m.entityId,
        action: m.action,
        baseRevision: m.baseRevision,
        payload: m.payload,
      })),
      cursor,
      limit: 100,
    };

    const res = await fetch("/api/v1/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeToken}`,
      },
      body: JSON.stringify(syncPayload),
    });

    if (res.status === 401) {
      notifyStateChange({ status: "error", errorMessage: "Session expired" });
      return { ok: false, error: "Unauthorized" };
    }

    if (!res.ok) {
      const errorBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const errorMsg =
        (typeof errorBody.detail === "string" && errorBody.detail) ||
        (typeof errorBody.message === "string" && errorBody.message) ||
        `Sync failed (${res.status})`;
      notifyStateChange({ status: "error", errorMessage: errorMsg });
      return { ok: false, error: errorMsg };
    }

    const data = (await res.json()) as {
      protocolVersion: number;
      receipts?: Array<{
        mutationId: string;
        entityType: string;
        entityId: string;
        action: string;
        status: "applied" | "duplicate" | "conflict" | "invalid";
        appliedRevision?: number;
        conflictDetails?: {
          message: string;
          serverRevision: number;
          currentServerEntity: unknown;
        };
      }>;
      changes?: {
        items?: Array<Record<string, unknown>>;
        tasks?: Array<Record<string, unknown>>;
        notes?: Array<Record<string, unknown>>;
        followups?: Array<Record<string, unknown>>;
        occurrences?: Array<Record<string, unknown>>;
        plans?: Array<Record<string, unknown>>;
        inbox?: Array<Record<string, unknown>>;
        taskOrder?: Record<string, unknown> | null;
        tombstones?: Array<Record<string, unknown>>;
        nextCursor?: number;
        hasMore?: boolean;
      };
      nextCursor?: number;
      hasMore?: boolean;
    };

    const db = await getDb();
    let appliedCount = 0;
    let conflictsCount = 0;

    // 1. Process receipts
    if (data.receipts && Array.isArray(data.receipts)) {
      const successfulMutationIds: string[] = [];
      const mutationMap = new Map<string, OutboxMutationRecord>(
        batch.map((m) => [m.mutationId, m])
      );

      for (const receipt of data.receipts) {
        if (receipt.status === "applied" || receipt.status === "duplicate") {
          successfulMutationIds.push(receipt.mutationId);
          appliedCount++;
        } else if (receipt.status === "conflict") {
          // Dequeue from outbox to prevent infinite loop
          successfulMutationIds.push(receipt.mutationId);
          conflictsCount++;

          const originalMutation = mutationMap.get(receipt.mutationId);
          if (originalMutation) {
            const conflictRecord: LocalConflictRecord = {
              id: `conf_${receipt.mutationId}`,
              workspaceId,
              entityType: originalMutation.entityType,
              entityId: originalMutation.entityId,
              baseRevision: originalMutation.baseRevision,
              serverRevision: receipt.conflictDetails?.serverRevision ?? 0,
              currentServerEntity: receipt.conflictDetails?.currentServerEntity,
              attemptedMutation: originalMutation,
              status: "open",
              detectedAt: new Date().toISOString(),
              resolvedAt: null,
            };
            await recordLocalConflict(conflictRecord);
          }
        } else if (receipt.status === "invalid") {
          // Dequeue invalid mutation
          successfulMutationIds.push(receipt.mutationId);
        }
      }

      if (successfulMutationIds.length > 0) {
        await dequeueOutbox(workspaceId, successfulMutationIds);
      }
    }

    // 2. Process changes (incoming pull stream)
    let changesCount = 0;
    type ChangeItem = Record<string, unknown>;
    let itemsToProcess: ChangeItem[] = [];

    if (data.changes) {
      if (Array.isArray(data.changes.items)) {
        itemsToProcess = data.changes.items as ChangeItem[];
      } else {
        const c = data.changes as Record<string, unknown>;
        if (Array.isArray(c.tasks)) itemsToProcess.push(...c.tasks.map((t) => ({ ...(t as object), entityType: "task" })));
        if (Array.isArray(c.notes)) itemsToProcess.push(...c.notes.map((n) => ({ ...(n as object), entityType: "note" })));
        if (Array.isArray(c.followups)) itemsToProcess.push(...c.followups.map((f) => ({ ...(f as object), entityType: "followup" })));
        if (Array.isArray(c.occurrences)) itemsToProcess.push(...c.occurrences.map((o) => ({ ...(o as object), entityType: "occurrence" })));
        if (Array.isArray(c.plans)) itemsToProcess.push(...c.plans.map((p) => ({ ...(p as object), entityType: "plan" })));
        if (Array.isArray(c.inbox)) itemsToProcess.push(...c.inbox.map((i) => ({ ...(i as object), entityType: "inbox" })));
        if (c.taskOrder) itemsToProcess.push({ ...(c.taskOrder as object), entityType: "task_order" });
        if (Array.isArray(c.tombstones)) itemsToProcess.push(...c.tombstones.map((s) => ({ ...(s as object), isTombstone: true })));
      }
    }

    if (itemsToProcess.length > 0) {
      for (const item of itemsToProcess) {
        changesCount++;
        const entityType = String(item.entityType || "");
        const isTombstone = Boolean(item.deletedAt) || Boolean(item.isTombstone) || entityType === "tombstone";

        if (isTombstone) {
          const entityId = String(item.entityId || item.id || "");
          const targetType = (item.targetType || item.entity || (entityType !== "tombstone" ? entityType : "")) as string;
          if (targetType === "task") {
            await db.delete("tasks", entityId);
          } else if (targetType === "note") {
            await db.delete("notes", entityId);
          } else if (targetType === "followup") {
            await db.delete("followups", entityId);
          } else if (targetType === "occurrence") {
            await db.delete("followup_occurrences", entityId);
          } else if (targetType === "plan") {
            await db.delete("daily_plans", entityId);
          } else if (targetType === "inbox") {
            await db.delete("inbox_captures", entityId);
          } else if (targetType === "task_order") {
            await db.delete("task_orders", workspaceId);
          } else {
            await Promise.all([
              db.delete("tasks", entityId),
              db.delete("notes", entityId),
              db.delete("followups", entityId),
              db.delete("followup_occurrences", entityId),
              db.delete("daily_plans", entityId),
              db.delete("inbox_captures", entityId),
            ]);
          }
        } else {
          // Put updated entity into local store
          if (entityType === "task" || (item.title !== undefined && item.completed !== undefined)) {
            await db.put("tasks", { ...item, workspaceId } as never);
          } else if (entityType === "note" || item.body !== undefined) {
            await db.put("notes", { ...item, workspaceId } as never);
          } else if (entityType === "followup" || item.personName !== undefined) {
            await db.put("followups", { ...item, workspaceId } as never);
          } else if (entityType === "occurrence" || item.followUpId !== undefined) {
            await db.put("followup_occurrences", { ...item, workspaceId } as never);
          } else if (entityType === "plan" || (item.date !== undefined && item.availableMinutes !== undefined)) {
            await db.put("daily_plans", { ...item, workspaceId } as never);
          } else if (entityType === "inbox" || item.capturedAt !== undefined) {
            await db.put("inbox_captures", { ...item, workspaceId } as never);
          } else if (entityType === "task_order" || item.orderedIds !== undefined) {
            const ids = Array.isArray(item.orderedIds) ? (item.orderedIds as string[]) : [];
            await db.put("task_orders", { id: workspaceId, workspaceId, orderedIds: ids, updatedAt: new Date().toISOString() });
          }
        }
      }
    }

    const nextCursor = data.changes?.nextCursor ?? data.nextCursor;
    if (typeof nextCursor === "number") {
      await setSyncCursor(workspaceId, nextCursor, new Date().toISOString());
    }

    const now = new Date().toISOString();
    notifyStateChange({
      lastSyncedAt: now,
      status: conflictsCount > 0 ? "conflict" : "idle",
      errorMessage: null,
    });

    await refreshSyncCounts(workspaceId);

    broadcastSyncEvent({ type: "SYNC_COMPLETED", workspaceId });

    // If more pages remain, loop immediately
    if (data.changes?.hasMore) {
      const nextPage = await performSyncCycle(workspaceId, activeToken);
      return {
        ok: true,
        appliedCount: appliedCount + (nextPage.appliedCount ?? 0),
        conflictsCount: conflictsCount + (nextPage.conflictsCount ?? 0),
        changesCount: changesCount + (nextPage.changesCount ?? 0),
        hasMore: false,
      };
    }

    return {
      ok: true,
      appliedCount,
      conflictsCount,
      changesCount,
      hasMore: false,
    };
  } catch {
    notifyStateChange({
      status: "error",
      errorMessage: "Network error during sync",
    });
    return { ok: false, error: "Network error" };
  }
}

export async function resolveConflict(
  conflictId: string,
  choice: "keep-server" | "keep-local",
  workspaceId: string = getActiveWorkspaceId()
): Promise<boolean> {
  const db = await getDb();
  const conflict = await db.get("conflicts", conflictId);
  if (!conflict) return false;

  const tx = db.transaction(
    ["conflicts", "tasks", "notes", "followups", "followup_occurrences", "daily_plans", "inbox_captures", "task_orders", "outbox"],
    "readwrite"
  );

  const conflictStore = tx.objectStore("conflicts");
  const outboxStore = tx.objectStore("outbox");

  if (choice === "keep-server") {
    // Keep server version: write server entity to local store
    if (conflict.currentServerEntity && typeof conflict.currentServerEntity === "object") {
      const serverObj = conflict.currentServerEntity as Record<string, unknown>;
      const targetStoreName =
        conflict.entityType === "task"
          ? "tasks"
          : conflict.entityType === "note"
          ? "notes"
          : conflict.entityType === "followup"
          ? "followups"
          : conflict.entityType === "occurrence"
          ? "followup_occurrences"
          : conflict.entityType === "plan"
          ? "daily_plans"
          : conflict.entityType === "inbox"
          ? "inbox_captures"
          : conflict.entityType === "task_order"
          ? "task_orders"
          : null;

      if (targetStoreName) {
        const store = tx.objectStore(targetStoreName);
        await store.put({ ...serverObj, workspaceId } as never);
      }
    }
  } else if (choice === "keep-local") {
    // Keep local version: enqueue a fresh outbox mutation using serverRevision as baseRevision
    const originalMutation = conflict.attemptedMutation;
    if (originalMutation) {
      const freshMutation: OutboxMutationRecord = {
        mutationId: `mut_res_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        workspaceId,
        protocolVersion: 1,
        entityType: originalMutation.entityType,
        entityId: originalMutation.entityId,
        action: originalMutation.action,
        baseRevision: conflict.serverRevision,
        payload: originalMutation.payload,
        createdAt: new Date().toISOString(),
      };
      await outboxStore.put(freshMutation);
    }
  }

  // Mark conflict resolved
  await conflictStore.put({
    ...conflict,
    status: "resolved",
    resolvedAt: new Date().toISOString(),
  });

  await tx.done;

  await refreshSyncCounts(workspaceId);
  return true;
}

// Background sync loop & triggers
let syncTimer: ReturnType<typeof setInterval> | null = null;
let backoffSeconds = 1;
let isSyncRunning = false;

export async function triggerSync(options?: { force?: boolean }): Promise<void> {
  if (isSyncRunning && !options?.force) return;

  const workspaceId = getActiveWorkspaceId();
  if (workspaceId === "local") {
    // Local workspace does not sync to cloud
    await refreshSyncCounts(workspaceId);
    return;
  }

  const token = getStoredAccessToken();
  if (!token) {
    notifyStateChange({ status: "idle" });
    return;
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    notifyStateChange({ status: "offline" });
    return;
  }

  isSyncRunning = true;
  const result = await performSyncCycle(workspaceId, token);
  isSyncRunning = false;

  if (result.ok) {
    backoffSeconds = 1;
  } else {
    // Exponential backoff up to 30 seconds
    backoffSeconds = Math.min(backoffSeconds * 2, 30);
  }
}

export const triggerSyncNow = triggerSync;

export function startSyncLoop(): () => void {
  if (syncTimer) return () => stopSyncLoop();

  // Listen to cross-tab events
  const unsubBroadcast = onSyncEvent((event) => {
    if (event.type === "DATA_MUTATED" && event.workspaceId === getActiveWorkspaceId()) {
      triggerSync();
    } else if (event.type === "AUTH_CHANGED" || event.type === "WORKSPACE_CHANGED") {
      refreshSyncCounts();
      triggerSync();
    }
  });

  // Listen to browser online/offline
  const handleOnline = () => {
    notifyStateChange({ status: "idle" });
    triggerSync();
  };
  const handleOffline = () => {
    notifyStateChange({ status: "offline" });
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  // Regular 30s sync interval
  syncTimer = setInterval(() => {
    triggerSync();
  }, 30000);

  // Initial trigger
  triggerSync();

  return () => {
    stopSyncLoop();
    unsubBroadcast();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
  };
}

export function stopSyncLoop(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  isSyncRunning = false;
}
