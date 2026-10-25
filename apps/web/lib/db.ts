import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Note } from "@/types/note";
import type { Task } from "@/types/task";
import type { FollowUp, FollowUpOccurrence } from "@/types/followup";
import type { DailyPlan } from "@/types/plan";
import type { InboxCapture } from "@/types/inbox";
import type {
  WorkspaceRecord,
  TaskOrderRecord,
  OutboxMutationRecord,
  SyncCursorRecord,
  LocalTombstoneRecord,
  LocalConflictRecord,
} from "@/types/storage";

export const DB_NAME = "taskflow";
export const DB_VERSION = 9;

export interface TaskFlowDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: {
      dueDate: string;
      updatedAt: string;
      category: string;
      sourceNoteId: string;
      workspaceId: string;
    };
  };
  notes: {
    key: string;
    value: Note;
    indexes: {
      updatedAt: string;
      workspaceId: string;
    };
  };
  followups: {
    key: string;
    value: FollowUp;
    indexes: {
      dueAt: string;
      status: string;
      updatedAt: string;
      sourceNoteId: string;
      workspaceId: string;
    };
  };
  followup_occurrences: {
    key: string;
    value: FollowUpOccurrence;
    indexes: {
      followUpId: string;
      dueAt: string;
      outcome: string;
      workspaceId: string;
    };
  };
  daily_plans: {
    key: string;
    value: DailyPlan;
    indexes: {
      date: string;
      updatedAt: string;
      workspaceId: string;
    };
  };
  inbox_captures: {
    key: string;
    value: InboxCapture;
    indexes: {
      state: string;
      capturedAt: string;
      updatedAt: string;
      workspaceId: string;
    };
  };
  workspaces: {
    key: string;
    value: WorkspaceRecord;
  };
  task_orders: {
    key: string;
    value: TaskOrderRecord;
    indexes: {
      workspaceId: string;
    };
  };
  outbox: {
    key: string;
    value: OutboxMutationRecord;
    indexes: {
      workspaceId: string;
      createdAt: string;
    };
  };
  sync_cursors: {
    key: string;
    value: SyncCursorRecord;
  };
  tombstones: {
    key: string;
    value: LocalTombstoneRecord;
    indexes: {
      workspaceId: string;
    };
  };
  conflicts: {
    key: string;
    value: LocalConflictRecord;
    indexes: {
      workspaceId: string;
      entityId: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<TaskFlowDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<TaskFlowDB>> {
  if (dbPromise === null) {
    dbPromise = openDB<TaskFlowDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const tasks = db.createObjectStore("tasks", { keyPath: "id" });
          tasks.createIndex("updatedAt", "updatedAt");

          const notes = db.createObjectStore("notes", { keyPath: "id" });
          notes.createIndex("updatedAt", "updatedAt");
        }

        if (oldVersion >= 1 && oldVersion < 2) {
          const tasks = transaction.objectStore("tasks");
          let cursor = await tasks.openCursor();
          while (cursor) {
            if (cursor.value.priority === undefined) {
              await cursor.update({ ...cursor.value, priority: "medium", dueDate: null });
            }
            cursor = await cursor.continue();
          }
        }

        if (oldVersion < 2) {
          const tasks = transaction.objectStore("tasks");
          tasks.createIndex("dueDate", "dueDate");
        }

        if (oldVersion >= 1 && oldVersion < 3) {
          const tasks = transaction.objectStore("tasks");
          let cursor = await tasks.openCursor();
          while (cursor) {
            if (cursor.value.category === undefined) {
              await cursor.update({ ...cursor.value, category: null });
            }
            cursor = await cursor.continue();
          }
        }

        if (oldVersion < 3) {
          const tasks = transaction.objectStore("tasks");
          if (!tasks.indexNames.contains("category")) {
            tasks.createIndex("category", "category");
          }
        }

        if (oldVersion < 4) {
          const tasks = transaction.objectStore("tasks");
          if ((tasks.indexNames as unknown as DOMStringList).contains("completed")) {
            (tasks as unknown as IDBObjectStore).deleteIndex("completed");
          }
        }

        if (oldVersion < 5) {
          if (!db.objectStoreNames.contains("followups")) {
            const followups = db.createObjectStore("followups", { keyPath: "id" });
            followups.createIndex("dueAt", "dueAt");
            followups.createIndex("status", "status");
            followups.createIndex("updatedAt", "updatedAt");
          }
          if (!db.objectStoreNames.contains("followup_occurrences")) {
            const occurrences = db.createObjectStore("followup_occurrences", { keyPath: "id" });
            occurrences.createIndex("followUpId", "followUpId");
            occurrences.createIndex("dueAt", "dueAt");
            occurrences.createIndex("outcome", "outcome");
          }
        }

        if (oldVersion < 6) {
          if (!db.objectStoreNames.contains("daily_plans")) {
            const dailyPlans = db.createObjectStore("daily_plans", { keyPath: "id" });
            dailyPlans.createIndex("date", "date");
            dailyPlans.createIndex("updatedAt", "updatedAt");
          }
        }

        if (oldVersion < 7) {
          const tasks = transaction.objectStore("tasks");
          if (!tasks.indexNames.contains("sourceNoteId")) {
            tasks.createIndex("sourceNoteId", "sourceNoteId");
          }
          if (db.objectStoreNames.contains("followups")) {
            const followups = transaction.objectStore("followups");
            if (!followups.indexNames.contains("sourceNoteId")) {
              followups.createIndex("sourceNoteId", "sourceNoteId");
            }
          }
        }

        if (oldVersion < 8) {
          if (!db.objectStoreNames.contains("inbox_captures")) {
            const captures = db.createObjectStore("inbox_captures", { keyPath: "id" });
            captures.createIndex("state", "state");
            captures.createIndex("capturedAt", "capturedAt");
            captures.createIndex("updatedAt", "updatedAt");
          }
        }

        if (oldVersion < 9) {
          // 1. Create workspace-aware stores
          if (!db.objectStoreNames.contains("workspaces")) {
            db.createObjectStore("workspaces", { keyPath: "id" });
          }

          if (!db.objectStoreNames.contains("task_orders")) {
            const taskOrders = db.createObjectStore("task_orders", { keyPath: "id" });
            taskOrders.createIndex("workspaceId", "workspaceId");
          }

          if (!db.objectStoreNames.contains("outbox")) {
            const outbox = db.createObjectStore("outbox", { keyPath: "mutationId" });
            outbox.createIndex("workspaceId", "workspaceId");
            outbox.createIndex("createdAt", "createdAt");
          }

          if (!db.objectStoreNames.contains("sync_cursors")) {
            db.createObjectStore("sync_cursors", { keyPath: "workspaceId" });
          }

          if (!db.objectStoreNames.contains("tombstones")) {
            const tombstones = db.createObjectStore("tombstones", { keyPath: "id" });
            tombstones.createIndex("workspaceId", "workspaceId");
          }

          if (!db.objectStoreNames.contains("conflicts")) {
            const conflicts = db.createObjectStore("conflicts", { keyPath: "id" });
            conflicts.createIndex("workspaceId", "workspaceId");
            conflicts.createIndex("entityId", "entityId");
          }

          // 2. Add workspaceId indexes and backfill existing entity stores
          const entityStoreNames = [
            "tasks",
            "notes",
            "followups",
            "followup_occurrences",
            "daily_plans",
            "inbox_captures",
          ] as const;

          for (const storeName of entityStoreNames) {
            if (db.objectStoreNames.contains(storeName)) {
              const store = transaction.objectStore(storeName);
              if (!store.indexNames.contains("workspaceId")) {
                store.createIndex("workspaceId", "workspaceId");
              }

              let cursor = await store.openCursor();
              while (cursor) {
                const val = cursor.value as unknown as { workspaceId?: string };
                if (val.workspaceId === undefined || val.workspaceId === null) {
                  await (
                    cursor as unknown as { update: (record: unknown) => Promise<unknown> }
                  ).update({
                    ...cursor.value,
                    workspaceId: "local",
                  });
                }
                cursor = await cursor.continue();
              }
            }
          }

          // 3. Seed default "local" workspace
          const workspaces = transaction.objectStore("workspaces");
          const existingLocal = await workspaces.get("local");
          if (!existingLocal) {
            const now = new Date().toISOString();
            await workspaces.put({
              id: "local",
              name: "Personal Workspace",
              type: "local",
              accountId: null,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function deleteDb(): Promise<void> {
  if (dbPromise !== null) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
