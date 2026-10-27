export type RecurrenceMode = "calendarAnchored" | "completionRelative";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export interface RecurrenceRule {
  mode: RecurrenceMode;
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays?: number[];
  monthDay?: number;
  timeOfDay?: string;
  localTime?: string;
  timeZone: string;
  endDate?: string | null;
}

export type FollowUpStatus = "open" | "completed" | "archived";
export type PreferredAction = "email" | "whatsapp" | "phone" | null;
export type FollowUpOccurrenceOutcome = "completed" | "skipped" | "missed" | "unresolved";

export interface FollowUpOccurrence {
  id: string;
  followupId: string;
  scheduledDueAt: string;
  outcome: FollowUpOccurrenceOutcome;
  resolvedAt: string | null;
  nextDueAt: string | null;
}

export interface FollowUp {
  id: string;
  personName: string;
  commitment: string;
  details: string | null;
  dueAt: string;
  timeZone: string;
  emailAddress: string | null;
  phoneNumber: string | null;
  whatsAppNumber: string | null;
  preferredAction: PreferredAction;
  recurrence: RecurrenceRule | null;
  status: FollowUpStatus;
  sourceNoteId: string | null;
  sourceExcerpt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFollowUpInput {
  personName: string;
  commitment: string;
  details?: string | null;
  dueAt: string;
  timeZone?: string;
  emailAddress?: string | null;
  phoneNumber?: string | null;
  whatsAppNumber?: string | null;
  preferredAction?: PreferredAction;
  recurrence?: RecurrenceRule | null;
  sourceNoteId?: string | null;
  sourceExcerpt?: string | null;
}

export interface UpdateFollowUpInput {
  personName?: string;
  commitment?: string;
  details?: string | null;
  dueAt?: string;
  timeZone?: string;
  emailAddress?: string | null;
  phoneNumber?: string | null;
  whatsAppNumber?: string | null;
  preferredAction?: PreferredAction;
  recurrence?: RecurrenceRule | null;
  status?: FollowUpStatus;
  sourceNoteId?: string | null;
  sourceExcerpt?: string | null;
}
