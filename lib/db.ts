import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Note } from "@/types/note";
import type { Task } from "@/types/task";

export const DB_NAME = "taskflow";
export const DB_VERSION = 1;

export interface TaskFlowDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { updatedAt: string };
  };
  notes: {
    key: string;
    value: Note;
    indexes: { updatedAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<TaskFlowDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<TaskFlowDB>> {
  if (dbPromise === null) {
    dbPromise = openDB<TaskFlowDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const tasks = db.createObjectStore("tasks", { keyPath: "id" });
        tasks.createIndex("updatedAt", "updatedAt");

        const notes = db.createObjectStore("notes", { keyPath: "id" });
        notes.createIndex("updatedAt", "updatedAt");
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
