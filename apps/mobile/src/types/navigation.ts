export type MobileTab = "tasks" | "notes" | "search" | "backup";

export type MobileScreen =
  | { name: "tasks" }
  | { name: "task-detail"; taskId: string }
  | { name: "task-edit"; taskId?: string }
  | { name: "notes" }
  | { name: "note-detail"; noteId: string }
  | { name: "note-edit"; noteId?: string }
  | { name: "search" }
  | { name: "backup" };
