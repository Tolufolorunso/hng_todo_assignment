export type InboxCaptureState = "pending" | "processed" | "discarded";
export type InboxResultEntityType = "task" | "note" | "followup";

export interface InboxCapture {
  id: string;
  text: string;
  sharedUrl: string | null;
  sourceAppLabel: string | null;
  capturedAt: string;
  state: InboxCaptureState;
  resultEntityType: InboxResultEntityType | null;
  resultEntityId: string | null;
  processedAt: string | null;
}

export interface CreateInboxCaptureInput {
  text: string;
  sharedUrl?: string | null;
  sourceAppLabel?: string | null;
}
