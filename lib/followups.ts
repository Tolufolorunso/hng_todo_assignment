import { getDb } from "@/lib/db";
import type {
  FollowUp,
  FollowUpOccurrence,
  CreateFollowUpInput,
  UpdateFollowUpInput,
  FollowUpStatus,
} from "@/types/followup";

export class FollowUpValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FollowUpValidationError";
  }
}

export class FollowUpNotFoundError extends Error {
  constructor(id: string) {
    super(`FollowUp not found: ${id}`);
    this.name = "FollowUpNotFoundError";
  }
}

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "fu_" + Math.random().toString(36).slice(2, 11) + "_" + Date.now().toString(36);
}

export function validateFollowUpFields(input: Partial<CreateFollowUpInput>): void {
  if (input.personName !== undefined) {
    const trimmed = input.personName.trim();
    if (!trimmed) {
      throw new FollowUpValidationError("Person name is required");
    }
    if (trimmed.length > 200) {
      throw new FollowUpValidationError("Person name must be at most 200 characters");
    }
  }

  if (input.commitment !== undefined) {
    const trimmed = input.commitment.trim();
    if (!trimmed) {
      throw new FollowUpValidationError("Commitment is required");
    }
    if (trimmed.length > 500) {
      throw new FollowUpValidationError("Commitment must be at most 500 characters");
    }
  }

  if (input.details !== undefined && input.details !== null) {
    if (input.details.length > 5000) {
      throw new FollowUpValidationError("Details must be at most 5000 characters");
    }
  }

  if (input.dueAt !== undefined) {
    const parsed = new Date(input.dueAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new FollowUpValidationError("Invalid due date timestamp");
    }
  }

  if (input.emailAddress) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.emailAddress.trim())) {
      throw new FollowUpValidationError("Invalid email address format");
    }
  }
}

export async function createFollowUp(input: CreateFollowUpInput): Promise<FollowUp> {
  validateFollowUpFields(input);

  const timestamp = now();
  const followUp: FollowUp = {
    id: newId(),
    personName: input.personName.trim(),
    commitment: input.commitment.trim(),
    details: input.details ? input.details.trim() : null,
    dueAt: new Date(input.dueAt).toISOString(),
    timeZone: input.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    emailAddress: input.emailAddress ? input.emailAddress.trim() : null,
    phoneNumber: input.phoneNumber ? input.phoneNumber.trim() : null,
    whatsAppNumber: input.whatsAppNumber ? input.whatsAppNumber.trim() : null,
    preferredAction: input.preferredAction || null,
    recurrence: input.recurrence || null,
    status: input.status || "open",
    sourceNoteId: input.sourceNoteId || null,
    sourceExcerpt: input.sourceExcerpt || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const db = await getDb();
  await db.put("followups", followUp);
  return followUp;
}

export async function getFollowUp(id: string): Promise<FollowUp | null> {
  const db = await getDb();
  const followUp = await db.get("followups", id);
  return followUp || null;
}

export async function listFollowUps(filter?: { status?: FollowUpStatus }): Promise<FollowUp[]> {
  const db = await getDb();
  const all = await db.getAll("followups");

  let result = all;
  if (filter?.status) {
    result = all.filter((item) => item.status === filter.status);
  }

  // Sort by dueAt ascending
  return result.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

export async function updateFollowUp(
  id: string,
  patch: UpdateFollowUpInput
): Promise<FollowUp> {
  validateFollowUpFields(patch);

  const db = await getDb();
  const tx = db.transaction("followups", "readwrite");
  const store = tx.objectStore("followups");

  const existing = await store.get(id);
  if (!existing) {
    await tx.done;
    throw new FollowUpNotFoundError(id);
  }

  const updated: FollowUp = {
    ...existing,
    personName: patch.personName !== undefined ? patch.personName.trim() : existing.personName,
    commitment: patch.commitment !== undefined ? patch.commitment.trim() : existing.commitment,
    details: patch.details !== undefined ? (patch.details ? patch.details.trim() : null) : existing.details,
    dueAt: patch.dueAt !== undefined ? new Date(patch.dueAt).toISOString() : existing.dueAt,
    timeZone: patch.timeZone !== undefined ? patch.timeZone : existing.timeZone,
    emailAddress: patch.emailAddress !== undefined ? (patch.emailAddress ? patch.emailAddress.trim() : null) : existing.emailAddress,
    phoneNumber: patch.phoneNumber !== undefined ? (patch.phoneNumber ? patch.phoneNumber.trim() : null) : existing.phoneNumber,
    whatsAppNumber: patch.whatsAppNumber !== undefined ? (patch.whatsAppNumber ? patch.whatsAppNumber.trim() : null) : existing.whatsAppNumber,
    preferredAction: patch.preferredAction !== undefined ? patch.preferredAction : existing.preferredAction,
    recurrence: patch.recurrence !== undefined ? patch.recurrence : existing.recurrence,
    status: patch.status !== undefined ? patch.status : existing.status,
    sourceNoteId: patch.sourceNoteId !== undefined ? patch.sourceNoteId : existing.sourceNoteId,
    sourceExcerpt: patch.sourceExcerpt !== undefined ? patch.sourceExcerpt : existing.sourceExcerpt,
    updatedAt: now(),
  };

  await store.put(updated);
  await tx.done;
  return updated;
}

export async function deleteFollowUp(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["followups", "followup_occurrences"], "readwrite");
  const followupsStore = tx.objectStore("followups");
  const occurrencesStore = tx.objectStore("followup_occurrences");

  const existing = await followupsStore.get(id);
  if (!existing) {
    await tx.done;
    throw new FollowUpNotFoundError(id);
  }

  await followupsStore.delete(id);

  // Also delete associated occurrences
  const index = occurrencesStore.index("followUpId");
  let cursor = await index.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

export async function recordOccurrence(
  occurrenceInput: Omit<FollowUpOccurrence, "id">
): Promise<FollowUpOccurrence> {
  const occurrence: FollowUpOccurrence = {
    id: newId(),
    ...occurrenceInput,
  };

  const db = await getDb();
  await db.put("followup_occurrences", occurrence);
  return occurrence;
}

export async function listOccurrencesByFollowUp(
  followUpId: string
): Promise<FollowUpOccurrence[]> {
  const db = await getDb();
  const occurrences = await db.getAllFromIndex(
    "followup_occurrences",
    "followUpId",
    IDBKeyRange.only(followUpId)
  );

  return occurrences.sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
}

export async function listAllOccurrences(): Promise<FollowUpOccurrence[]> {
  const db = await getDb();
  const occurrences = await db.getAll("followup_occurrences");
  return occurrences.sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
}

export async function completeFollowUp(
  id: string,
  completionTime?: string
): Promise<FollowUp> {
  const followUp = await getFollowUp(id);
  if (!followUp) {
    throw new FollowUpNotFoundError(id);
  }

  const completedAt = completionTime || now();

  if (followUp.recurrence) {
    const { calculateNextOccurrence } = await import("@/lib/recurrence");
    const nextDueAt = calculateNextOccurrence(followUp.recurrence, followUp.dueAt, completedAt);

    await recordOccurrence({
      followUpId: followUp.id,
      dueAt: followUp.dueAt,
      outcome: "completed",
      resolvedAt: completedAt,
      nextDueAt,
      notes: null,
    });

    if (nextDueAt) {
      return updateFollowUp(id, { dueAt: nextDueAt, status: "open" });
    }
    return updateFollowUp(id, { status: "completed" });
  }

  await recordOccurrence({
    followUpId: followUp.id,
    dueAt: followUp.dueAt,
    outcome: "completed",
    resolvedAt: completedAt,
    nextDueAt: null,
    notes: null,
  });

  return updateFollowUp(id, { status: "completed" });
}

export async function skipFollowUpOccurrence(
  id: string,
  notes?: string
): Promise<FollowUp> {
  const followUp = await getFollowUp(id);
  if (!followUp) {
    throw new FollowUpNotFoundError(id);
  }

  const resolvedAt = now();

  if (followUp.recurrence) {
    const { calculateNextOccurrence } = await import("@/lib/recurrence");
    const nextDueAt = calculateNextOccurrence(followUp.recurrence, followUp.dueAt);

    await recordOccurrence({
      followUpId: followUp.id,
      dueAt: followUp.dueAt,
      outcome: "skipped",
      resolvedAt,
      nextDueAt,
      notes: notes || null,
    });

    if (nextDueAt) {
      return updateFollowUp(id, { dueAt: nextDueAt, status: "open" });
    }
    return updateFollowUp(id, { status: "completed" });
  }

  await recordOccurrence({
    followUpId: followUp.id,
    dueAt: followUp.dueAt,
    outcome: "skipped",
    resolvedAt,
    nextDueAt: null,
    notes: notes || null,
  });

  return updateFollowUp(id, { status: "completed" });
}

export async function snoozeFollowUp(
  id: string,
  option: "1hour" | "tomorrow" | "nextWeek" | string
): Promise<FollowUp> {
  const followUp = await getFollowUp(id);
  if (!followUp) {
    throw new FollowUpNotFoundError(id);
  }

  const { calculateSnoozeDueAt } = await import("@/lib/recurrence");
  const newDueAt = calculateSnoozeDueAt(followUp.dueAt, option);
  return updateFollowUp(id, { dueAt: newDueAt });
}

export async function rescheduleFollowUp(
  id: string,
  newDueAt: string,
  scope: "single" | "series"
): Promise<FollowUp> {
  const followUp = await getFollowUp(id);
  if (!followUp) {
    throw new FollowUpNotFoundError(id);
  }

  const parsed = new Date(newDueAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new FollowUpValidationError("Invalid new due date");
  }

  if (scope === "series" && followUp.recurrence) {
    let updatedRecurrence = { ...followUp.recurrence };
    if (updatedRecurrence.frequency === "monthly") {
      updatedRecurrence = {
        ...updatedRecurrence,
        monthDay: parsed.getUTCDate(),
      };
    }
    return updateFollowUp(id, {
      dueAt: parsed.toISOString(),
      recurrence: updatedRecurrence,
    });
  }

  return updateFollowUp(id, { dueAt: parsed.toISOString() });
}

export async function getDueFollowUpsCount(): Promise<number> {
  const openFollowUps = await listFollowUps({ status: "open" });
  const nowMs = Date.now();
  return openFollowUps.filter((f) => new Date(f.dueAt).getTime() <= nowMs).length;
}

