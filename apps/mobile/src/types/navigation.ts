export type MobileTab = "tasks" | "followups" | "notes" | "more";

export type MobileScreen =
  | { name: "tasks" }
  | { name: "task-detail"; taskId: string }
  | { name: "task-edit"; taskId?: string }
  | { name: "followups" }
  | { name: "followup-edit"; followUpId?: string }
  | { name: "notes" }
  | { name: "note-detail"; noteId: string }
  | { name: "note-edit"; noteId?: string }
  | { name: "more" }
  | { name: "plan" }
  | { name: "inbox" }
  | { name: "calendar" }
  | { name: "analytics" }
  | { name: "search" }
  | { name: "backup" }
  | { name: "account" };
