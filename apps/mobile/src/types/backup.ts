import type { Task } from "./task.js";
import type { Note } from "./note.js";

export interface MobileBackupSnapshot {
  version: 1 | 2;
  exportedAt: string;
  origin: "taskflow-mobile";
  tasks: Task[];
  notes: Note[];
}

export type BackupImportMode = "merge" | "replace";

export interface BackupImportResult {
  mode: BackupImportMode;
  tasksImported: number;
  notesImported: number;
  skippedCount?: number;
  replacedCount?: number;
}
