import type { SqliteDatabase } from "../db/driver.js";
import type {
  FollowUp,
  CreateFollowUpInput,
  UpdateFollowUpInput,
  FollowUpOccurrence,
  FollowUpStatus,
} from "../types/followup.js";
import { computeNextDueAt, snoozeFollowUp, rescheduleFollowUp } from "../services/recurrence.js";

interface FollowUpRow {
  id: string;
  person_name: string;
  commitment: string;
  details: string | null;
  due_at: string;
  time_zone: string;
  email_address: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  preferred_action: string | null;
  recurrence: string | null;
  status: string;
  source_note_id: string | null;
  source_excerpt: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    personName: row.person_name,
    commitment: row.commitment,
    details: row.details,
    dueAt: row.due_at,
    timeZone: row.time_zone || "UTC",
    emailAddress: row.email_address,
    phoneNumber: row.phone_number,
    whatsAppNumber: row.whatsapp_number,
    preferredAction: (row.preferred_action as FollowUp["preferredAction"]) || null,
    recurrence: row.recurrence ? JSON.parse(row.recurrence) : null,
    status: (row.status as FollowUpStatus) || "open",
    sourceNoteId: row.source_note_id,
    sourceExcerpt: row.source_excerpt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class FollowUpRepository {
  constructor(private db: SqliteDatabase) {}

  async create(input: CreateFollowUpInput): Promise<FollowUp> {
    const personName = input.personName?.trim();
    if (!personName) {
      throw new Error("Person name is required");
    }
    const commitment = input.commitment?.trim();
    if (!commitment) {
      throw new Error("Commitment is required");
    }
    if (!input.dueAt) {
      throw new Error("Due timestamp is required");
    }

    const id = "fu_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();
    const timeZone = input.timeZone || "UTC";
    const recurrenceJson = input.recurrence ? JSON.stringify(input.recurrence) : null;

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO followups (
          id, person_name, commitment, details, due_at, time_zone,
          email_address, phone_number, whatsapp_number, preferred_action,
          recurrence, status, source_note_id, source_excerpt, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          personName,
          commitment,
          input.details || null,
          input.dueAt,
          timeZone,
          input.emailAddress || null,
          input.phoneNumber || null,
          input.whatsAppNumber || null,
          input.preferredAction || null,
          recurrenceJson,
          "open",
          input.sourceNoteId || null,
          input.sourceExcerpt || null,
          now,
          now,
        ]
      );

      // Create initial occurrence
      const occId = "occ_" + Math.random().toString(36).substring(2, 10);
      await tx.execute(
        `INSERT INTO followup_occurrences (id, followup_id, scheduled_due_at, outcome, resolved_at, next_due_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [occId, id, input.dueAt, "unresolved", null, null]
      );
    });

    return {
      id,
      personName,
      commitment,
      details: input.details || null,
      dueAt: input.dueAt,
      timeZone,
      emailAddress: input.emailAddress || null,
      phoneNumber: input.phoneNumber || null,
      whatsAppNumber: input.whatsAppNumber || null,
      preferredAction: input.preferredAction || null,
      recurrence: input.recurrence || null,
      status: "open",
      sourceNoteId: input.sourceNoteId || null,
      sourceExcerpt: input.sourceExcerpt || null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getById(id: string): Promise<FollowUp | null> {
    const row = await this.db.queryFirst<FollowUpRow>(
      "SELECT * FROM followups WHERE id = ?",
      [id]
    );
    return row ? mapRowToFollowUp(row) : null;
  }

  async list(filter?: { status?: FollowUpStatus; dueBefore?: string }): Promise<FollowUp[]> {
    const rows = await this.db.query<FollowUpRow>(
      "SELECT * FROM followups ORDER BY due_at ASC"
    );
    let list = rows.map(mapRowToFollowUp);

    if (filter?.status) {
      list = list.filter((f) => f.status === filter.status);
    }
    if (filter?.dueBefore) {
      list = list.filter((f) => f.dueAt <= filter.dueBefore!);
    }

    return list;
  }

  async update(id: string, input: UpdateFollowUpInput): Promise<FollowUp> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`FollowUp ${id} not found`);
    }

    const now = new Date().toISOString();
    const personName = input.personName !== undefined ? input.personName.trim() : existing.personName;
    const commitment = input.commitment !== undefined ? input.commitment.trim() : existing.commitment;
    const details = input.details !== undefined ? input.details : existing.details;
    const dueAt = input.dueAt !== undefined ? input.dueAt : existing.dueAt;
    const timeZone = input.timeZone !== undefined ? input.timeZone : existing.timeZone;
    const emailAddress = input.emailAddress !== undefined ? input.emailAddress : existing.emailAddress;
    const phoneNumber = input.phoneNumber !== undefined ? input.phoneNumber : existing.phoneNumber;
    const whatsAppNumber = input.whatsAppNumber !== undefined ? input.whatsAppNumber : existing.whatsAppNumber;
    const preferredAction = input.preferredAction !== undefined ? input.preferredAction : existing.preferredAction;
    const recurrence = input.recurrence !== undefined ? input.recurrence : existing.recurrence;
    const status = input.status !== undefined ? input.status : existing.status;
    const sourceNoteId = input.sourceNoteId !== undefined ? input.sourceNoteId : existing.sourceNoteId;
    const sourceExcerpt = input.sourceExcerpt !== undefined ? input.sourceExcerpt : existing.sourceExcerpt;

    await this.db.execute(
      `UPDATE followups
       SET person_name = ?, commitment = ?, details = ?, due_at = ?, time_zone = ?,
           email_address = ?, phone_number = ?, whatsapp_number = ?, preferred_action = ?,
           recurrence = ?, status = ?, source_note_id = ?, source_excerpt = ?, updated_at = ?
       WHERE id = ?`,
      [
        personName,
        commitment,
        details,
        dueAt,
        timeZone,
        emailAddress,
        phoneNumber,
        whatsAppNumber,
        preferredAction,
        recurrence ? JSON.stringify(recurrence) : null,
        status,
        sourceNoteId,
        sourceExcerpt,
        now,
        id,
      ]
    );

    return {
      id,
      personName,
      commitment,
      details,
      dueAt,
      timeZone,
      emailAddress,
      phoneNumber,
      whatsAppNumber,
      preferredAction,
      recurrence,
      status,
      sourceNoteId,
      sourceExcerpt,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  }

  async completeOccurrence(id: string, outcome: "completed" | "skipped" = "completed"): Promise<FollowUp> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`FollowUp ${id} not found`);
    }

    const now = new Date().toISOString();

    if (existing.recurrence) {
      // Calculate next due date
      const nextDueAt = computeNextDueAt(existing.recurrence, new Date());
      await this.db.transaction(async (tx) => {
        // Record current occurrence outcome
        const occId = "occ_" + Math.random().toString(36).substring(2, 10);
        await tx.execute(
          `INSERT INTO followup_occurrences (id, followup_id, scheduled_due_at, outcome, resolved_at, next_due_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [occId, id, existing.dueAt, outcome, now, nextDueAt]
        );
        // Advance follow-up dueAt
        await tx.execute(
          "UPDATE followups SET due_at = ?, updated_at = ? WHERE id = ?",
          [nextDueAt, now, id]
        );
      });
      return {
        ...existing,
        dueAt: nextDueAt,
        updatedAt: now,
      };
    } else {
      // One-time commitment: mark completed
      await this.db.execute(
        "UPDATE followups SET status = 'completed', updated_at = ? WHERE id = ?",
        [now, id]
      );
      return {
        ...existing,
        status: "completed",
        updatedAt: now,
      };
    }
  }

  async snooze(id: string, hours = 24): Promise<FollowUp> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`FollowUp ${id} not found`);
    }

    const snoozedDueAt = snoozeFollowUp(existing.dueAt, hours);
    return this.update(id, { dueAt: snoozedDueAt });
  }

  async reschedule(id: string, newDueAt: string): Promise<FollowUp> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`FollowUp ${id} not found`);
    }

    const validDueAt = rescheduleFollowUp(newDueAt);
    return this.update(id, { dueAt: validDueAt });
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    await this.db.execute("DELETE FROM followups WHERE id = ?", [id]);
    await this.db.execute("DELETE FROM followup_occurrences WHERE followup_id = ?", [id]);
    return true;
  }
}
