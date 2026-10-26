export type MobileTab =
  | "tasks"
  | "followups"
  | "plan"
  | "notes"
  | "inbox"
  | "calendar"
  | "analytics"
  | "search"
  | "backup"
  | "account";

export type MobileScreen =
  | { name: "tasks" }
  | { name: "task-detail"; taskId: string }
  | { name: "task-edit"; taskId?: string }
  | { name: "followups" }
  | { name: "followup-edit"; followUpId?: string }
  | { name: "plan" }
  | { name: "notes" }
  | { name: "note-detail"; noteId: string }
  | { name: "note-edit"; noteId?: string }
  | { name: "inbox" }
  | { name: "calendar" }
  | { name: "analytics" }
  | { name: "search" }
  | { name: "backup" }
  | { name: "account" };
