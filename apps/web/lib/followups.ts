import { getDb } from "@/lib/db";
import {
  getActiveWorkspaceId,
  createFollowUp as repoCreateFollowUp,
  getFollowUp as repoGetFollowUp,
  listFollowUps as repoListFollowUps,
  updateFollowUp as repoUpdateFollowUp,
  deleteFollowUp as repoDeleteFollowUp,
  recordOccurrence as repoRecordOccurrence,
  listOccurrences as repoListOccurrences,
} from "@/lib/repository";
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
  const workspaceId = getActiveWorkspaceId();
  return repoCreateFollowUp(input, { workspaceId });
}

export async function getFollowUp(id: string): Promise<FollowUp | null> {
  const workspaceId = getActiveWorkspaceId();
  return repoGetFollowUp(id, { workspaceId });
}

export async function listFollowUps(filter?: { status?: FollowUpStatus }): Promise<FollowUp[]> {
  const workspaceId = getActiveWorkspaceId();
  const items = await repoListFollowUps({ workspaceId, status: filter?.status });
  return items.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

export async function updateFollowUp(
  id: string,
  patch: UpdateFollowUpInput
): Promise<FollowUp> {
  validateFollowUpFields(patch);
  const workspaceId = getActiveWorkspaceId();
  try {
    return await repoUpdateFollowUp(id, patch, { workspaceId });
  } catch (err) {
    if (err instanceof Error && err.message.includes("FollowUp not found")) {
      throw new FollowUpNotFoundError(id);
    }
    throw err;
  }
}

export async function deleteFollowUp(id: string): Promise<void> {
  const workspaceId = getActiveWorkspaceId();
  const existing = await repoGetFollowUp(id, { workspaceId });
  if (!existing) {
    throw new FollowUpNotFoundError(id);
  }

  await repoDeleteFollowUp(id, { workspaceId });

  // Also delete associated occurrences in this workspace
  const db = await getDb();
  const tx = db.transaction("followup_occurrences", "readwrite");
  const store = tx.objectStore("followup_occurrences");
  const index = store.index("followUpId");
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
  const workspaceId = getActiveWorkspaceId();
  return repoRecordOccurrence(
    occurrenceInput.followUpId,
    occurrenceInput.dueAt,
    occurrenceInput.outcome,
    {
      workspaceId,
      resolvedAt: occurrenceInput.resolvedAt,
      nextDueAt: occurrenceInput.nextDueAt,
      notes: occurrenceInput.notes,
    }
  );
}

export async function listOccurrencesByFollowUp(
  followUpId: string
): Promise<FollowUpOccurrence[]> {
  const workspaceId = getActiveWorkspaceId();
  const items = await repoListOccurrences({ workspaceId, followUpId });
  return items.sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
}

export async function listAllOccurrences(): Promise<FollowUpOccurrence[]> {
  const workspaceId = getActiveWorkspaceId();
  const items = await repoListOccurrences({ workspaceId });
  return items.sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
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

