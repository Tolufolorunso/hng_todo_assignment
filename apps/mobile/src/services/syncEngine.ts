import type { SqliteDatabase } from "../db/driver.js";
import type {
  SyncEntityType,
  SyncMutation,
  SyncResponse,
  MobileSyncStatus,
  MobileSyncState,
  OutboxRecord,
  ConflictRecord,
} from "../types/sync.js";
import { SyncRepository } from "../storage/syncRepository.js";
import { TaskRepository } from "../storage/taskRepository.js";
import { NoteRepository } from "../storage/noteRepository.js";
import { FollowUpRepository } from "../storage/followUpRepository.js";
import { DailyPlanRepository } from "../storage/dailyPlanRepository.js";
import { InboxRepository } from "../storage/inboxRepository.js";
import type { AuthService } from "./auth.js";
import type { Task } from "../types/task.js";
import type { Note } from "../types/note.js";
import type { FollowUp, FollowUpOccurrence } from "../types/followup.js";
import type { DailyPlan } from "../types/plan.js";
import type { InboxCapture } from "../types/inbox.js";

export interface SyncEngineConfig {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class SyncEngine {
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private syncRepo: SyncRepository;
  private taskRepo: TaskRepository;
  private noteRepo: NoteRepository;
  private followUpRepo: FollowUpRepository;
  private dailyPlanRepo: DailyPlanRepository;
  private inboxRepo: InboxRepository;

  private listeners: Set<(state: MobileSyncState) => void> = new Set();
  private state: MobileSyncState = {
    status: "idle",
    lastSyncedAt: null,
    pendingMutationsCount: 0,
    unresolvedConflictsCount: 0,
    errorMessage: null,
  };
  private isRunning = false;

  constructor(
    private db: SqliteDatabase,
    private authService: AuthService,
    config: SyncEngineConfig = {}
  ) {
    this.baseUrl = config.baseUrl || "";
    this.fetchFn = config.fetchFn || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : (async () => { throw new Error("fetch unavailable"); }));
    this.syncRepo = new SyncRepository(db);
    this.taskRepo = new TaskRepository(db);
    this.noteRepo = new NoteRepository(db);
    this.followUpRepo = new FollowUpRepository(db);
    this.dailyPlanRepo = new DailyPlanRepository(db);
    this.inboxRepo = new InboxRepository(db);
  }

  getSyncState(): MobileSyncState {
    return { ...this.state };
  }

  subscribe(listener: (state: MobileSyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSyncState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(updates: Partial<MobileSyncState>): void {
    this.state = { ...this.state, ...updates };
    const current = this.getSyncState();
    for (const l of this.listeners) {
      l(current);
    }
  }

  async syncOnce(): Promise<{
    success: boolean;
    pushed: number;
    pulled: number;
    conflicts: number;
    error?: string;
  }> {
    if (this.isRunning) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: "Sync already in progress" };
    }

    const authState = this.authService.getAuthState();
    if (!authState.user || !authState.accessToken) {
      this.updateState({ status: "idle", errorMessage: null });
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: "Unauthenticated" };
    }

    this.isRunning = true;
    this.updateState({ status: "syncing", errorMessage: null });

    const workspaceId = authState.user.id;
    let totalPushed = 0;
    let totalPulled = 0;
    let totalConflicts = 0;

    try {
      let hasMore = true;
      let token = authState.accessToken;

      while (hasMore) {
        const outboxRecords = await this.syncRepo.listOutbox(100);
        const mutations: SyncMutation[] = outboxRecords.map((r) => {
          let payload: unknown = undefined;
          if (r.payload) {
            try {
              payload = JSON.parse(r.payload);
            } catch {
              payload = r.payload;
            }
          }
          return {
            mutationId: r.mutationId,
            entityType: r.entityType,
            entityId: r.entityId,
            action: r.action,
            baseRevision: r.baseRevision,
            payload,
          };
        });

        const cursor = await this.syncRepo.getCursor(workspaceId);

        let res = await this.fetchFn(`${this.baseUrl}/api/v1/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            protocolVersion: 1,
            mutations,
            cursor,
            limit: 100,
          }),
        });

        // 401 Token Refresh handling
        if (res.status === 401) {
          const refreshRes = await this.authService.refreshSession();
          if (refreshRes.ok && refreshRes.data?.accessToken) {
            token = refreshRes.data.accessToken;
            res = await this.fetchFn(`${this.baseUrl}/api/v1/sync`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                protocolVersion: 1,
                mutations,
                cursor,
                limit: 100,
              }),
            });
          } else {
            this.updateState({ status: "error", errorMessage: "Session expired. Please sign in again." });
            this.isRunning = false;
            return { success: false, pushed: totalPushed, pulled: totalPulled, conflicts: totalConflicts, error: "Session expired" };
          }
        }

        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          const msg = (errBody.message as string) || (errBody.error as string) || `Sync server error: ${res.status}`;
          this.updateState({ status: "error", errorMessage: msg });
          this.isRunning = false;
          return { success: false, pushed: totalPushed, pulled: totalPulled, conflicts: totalConflicts, error: msg };
        }

        const data = (await res.json()) as SyncResponse;

        // Process Receipts
        const outboxMap = new Map<string, OutboxRecord>(outboxRecords.map((r) => [r.mutationId, r]));
        const dequeueIds: string[] = [];

        if (Array.isArray(data.receipts)) {
          for (const receipt of data.receipts) {
            const outboxRec = outboxMap.get(receipt.mutationId);

            if (receipt.status === "applied") {
              dequeueIds.push(receipt.mutationId);
              totalPushed++;
              if (typeof receipt.appliedRevision === "number") {
                await this.syncRepo.setServerRevision(receipt.entityType, receipt.entityId, receipt.appliedRevision);
              }
            } else if (receipt.status === "duplicate") {
              dequeueIds.push(receipt.mutationId);
            } else if (receipt.status === "conflict") {
              dequeueIds.push(receipt.mutationId);
              totalConflicts++;
              await this.syncRepo.recordConflict({
                workspaceId,
                entityType: receipt.entityType,
                entityId: receipt.entityId,
                localValue: outboxRec?.payload || null,
                serverValue: receipt.conflictDetails?.currentServerEntity
                  ? JSON.stringify(receipt.conflictDetails.currentServerEntity)
                  : null,
                serverRevision: receipt.conflictDetails?.serverRevision || 0,
              });
            } else if (receipt.status === "invalid") {
              dequeueIds.push(receipt.mutationId);
            }
          }
        }

        await this.syncRepo.dequeueOutbox(dequeueIds);

        // Process Pulled Changes
        if (Array.isArray(data.changes)) {
          for (const change of data.changes) {
            totalPulled++;
            await this.applyServerChange(change.entityType, change.entityId, change.action, change.data);
            await this.syncRepo.setServerRevision(change.entityType, change.entityId, change.revision);
          }
        }

        // Advance cursor
        if (typeof data.nextCursor === "number") {
          await this.syncRepo.setCursor(workspaceId, data.nextCursor);
        }

        hasMore = data.hasMore === true;
      }

      const pendingCount = await this.syncRepo.countOutbox();
      const conflictCount = await this.syncRepo.countConflicts(workspaceId);
      const nextStatus: MobileSyncStatus = conflictCount > 0 ? "conflict" : "idle";

      this.updateState({
        status: nextStatus,
        lastSyncedAt: new Date().toISOString(),
        pendingMutationsCount: pendingCount,
        unresolvedConflictsCount: conflictCount,
        errorMessage: null,
      });

      this.isRunning = false;
      return {
        success: true,
        pushed: totalPushed,
        pulled: totalPulled,
        conflicts: totalConflicts,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const pendingCount = await this.syncRepo.countOutbox().catch(() => 0);
      const conflictCount = await this.syncRepo.countConflicts(workspaceId).catch(() => 0);

      this.updateState({
        status: "offline",
        pendingMutationsCount: pendingCount,
        unresolvedConflictsCount: conflictCount,
        errorMessage: msg,
      });

      this.isRunning = false;
      return { success: false, pushed: totalPushed, pulled: totalPulled, conflicts: totalConflicts, error: msg };
    }
  }

  private async applyServerChange(
    entityType: SyncEntityType,
    entityId: string,
    action: "put" | "delete",
    data?: Record<string, unknown>
  ): Promise<void> {
    if (action === "delete") {
      switch (entityType) {
        case "task":
          await this.taskRepo.delete(entityId);
          break;
        case "note":
          await this.noteRepo.delete(entityId);
          break;
        case "followup":
          await this.followUpRepo.delete(entityId);
          break;
        case "plan":
          await this.dailyPlanRepo.delete(entityId);
          break;
        case "inbox":
          await this.inboxRepo.delete(entityId);
          break;
        default:
          break;
      }
      await this.syncRepo.recordTombstone("local", entityType, entityId);
      return;
    }

    if (!data) return;

    switch (entityType) {
      case "task":
        await this.taskRepo.putRaw(data as unknown as Task);
        break;
      case "note":
        await this.noteRepo.putRaw(data as unknown as Note);
        break;
      case "followup":
        await this.followUpRepo.putRaw(data as unknown as FollowUp);
        break;
      case "occurrence":
        await this.followUpRepo.putOccurrenceRaw(data as unknown as FollowUpOccurrence);
        break;
      case "plan":
        await this.dailyPlanRepo.putRaw(data as unknown as DailyPlan);
        break;
      case "inbox":
        await this.inboxRepo.putRaw(data as unknown as InboxCapture);
        break;
      default:
        break;
    }
  }

  async resolveConflict(
    conflictId: string,
    choice: "keepServer" | "keepLocal"
  ): Promise<void> {
    const authState = this.authService.getAuthState();
    if (!authState.user) return;
    const workspaceId = authState.user.id;

    const conflicts = await this.syncRepo.listConflicts(workspaceId);
    const conflict = conflicts.find((c) => c.id === conflictId);
    if (!conflict) return;

    if (choice === "keepServer") {
      if (conflict.serverValue) {
        try {
          const parsed = JSON.parse(conflict.serverValue);
          await this.applyServerChange(conflict.entityType, conflict.entityId, "put", parsed);
        } catch {
          // Ignore parse errors
        }
      } else {
        await this.applyServerChange(conflict.entityType, conflict.entityId, "delete");
      }
      await this.syncRepo.setServerRevision(conflict.entityType, conflict.entityId, conflict.serverRevision);
      await this.syncRepo.resolveConflict(conflictId);
    } else {
      // Keep local version: enqueue new outbox mutation with serverRevision as baseRevision
      let localPayload: unknown = undefined;
      if (conflict.localValue) {
        try {
          localPayload = JSON.parse(conflict.localValue);
        } catch {
          localPayload = conflict.localValue;
        }
      }

      await this.syncRepo.enqueueOutbox({
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        action: "put",
        baseRevision: conflict.serverRevision,
        payload: conflict.localValue,
      });

      await this.syncRepo.resolveConflict(conflictId);
    }

    const remainingConflicts = await this.syncRepo.countConflicts(workspaceId);
    const pendingOutbox = await this.syncRepo.countOutbox();
    this.updateState({
      status: remainingConflicts > 0 ? "conflict" : "idle",
      pendingMutationsCount: pendingOutbox,
      unresolvedConflictsCount: remainingConflicts,
    });
  }
}
