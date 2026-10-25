export type PreferredAction = "email" | "whatsapp" | "phone";

export type FollowUpStatus = "open" | "completed" | "archived";

export type RecurrenceMode = "calendarAnchored" | "completionRelative";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "customDays";

export interface RecurrenceRule {
  mode: RecurrenceMode;
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays?: number[];
  monthDay?: number;
  localTime?: string;
  timeZone?: string;
  endDate?: string | null;
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
  preferredAction: PreferredAction | null;
  recurrence: RecurrenceRule | null;
  status: FollowUpStatus;
  sourceNoteId: string | null;
  sourceExcerpt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OccurrenceOutcome = "completed" | "skipped" | "missed" | "unresolved";

export interface FollowUpOccurrence {
  id: string;
  followUpId: string;
  dueAt: string;
  outcome: OccurrenceOutcome;
  resolvedAt: string | null;
  nextDueAt: string | null;
  notes?: string | null;
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
  preferredAction?: PreferredAction | null;
  recurrence?: RecurrenceRule | null;
  status?: FollowUpStatus;
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
  preferredAction?: PreferredAction | null;
  recurrence?: RecurrenceRule | null;
  status?: FollowUpStatus;
  sourceNoteId?: string | null;
  sourceExcerpt?: string | null;
}
