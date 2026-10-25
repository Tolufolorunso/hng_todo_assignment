import type { TaskPriority, TaskCategory } from "@/types/task";

export type InboxCaptureState = "pending" | "processed" | "discarded";

export type InboxTargetType = "task" | "note" | "followup";

export interface InboxCapture {
  id: string;
  text: string;
  sharedUrl: string | null;
  sourceAppLabel: string | null;
  capturedAt: string;
  state: InboxCaptureState;
  targetType?: InboxTargetType | null;
  targetId?: string | null;
  processedAt?: string | null;
  discardedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaptureInput {
  text: string;
  sharedUrl?: string | null;
  sourceAppLabel?: string | null;
}

export interface ProcessCaptureAction {
  targetType: InboxTargetType;
  title?: string;
  category?: TaskCategory | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  personName?: string;
  commitment?: string;
}

export interface ProcessCaptureResult {
  capture: InboxCapture;
  targetType: InboxTargetType;
  targetId: string;
  isExisting: boolean;
}
