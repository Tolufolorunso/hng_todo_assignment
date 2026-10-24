import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Note } from "@/types/note";
import type { Task } from "@/types/task";
import type { FollowUp, FollowUpOccurrence } from "@/types/followup";

export const DB_NAME = "taskflow";
export const DB_VERSION = 5;

export interface TaskFlowDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: {
      dueDate: string;
      updatedAt: string;
      category: string;
    };
  };
  notes: {
    key: string;
    value: Note;
    indexes: { updatedAt: string };
  };
  followups: {
    key: string;
    value: FollowUp;
    indexes: {
      dueAt: string;
      status: string;
      updatedAt: string;
    };
  };
  followup_occurrences: {
    key: string;
    value: FollowUpOccurrence;
    indexes: {
      followUpId: string;
      dueAt: string;
      outcome: string;
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
          // v1 tasks predate priority and dueDate, so backfill before the
          // non-null priority contract applies.
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
          // v1 and v2 tasks predate category, so backfill category: null
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
      },
    });
  }
  return dbPromise;
}

export async function deleteDb(): Promise<void> {
  const db = await getDb();
  db.close();
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
