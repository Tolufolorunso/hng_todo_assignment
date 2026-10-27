import type { Task } from "./task";
import type { Note } from "./note";

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
