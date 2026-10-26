import type { SqliteDatabase } from "../db/driver.js";
import type {
  FollowUp,
  CreateFollowUpInput,
  UpdateFollowUpInput,
  FollowUpOccurrence,
  FollowUpStatus,
} from "../types/followup.js";
import { computeNextDueAt, snoozeFollowUp, rescheduleFollowUp } from "../services/recurrence.js";
import { SyncRepository, type RepositoryOptions } from "./syncRepository.js";

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

interface OccurrenceRow {
  id: string;
  followup_id: string;
  scheduled_due_at: string;
  outcome: string;
  resolved_at: string | null;
  next_due_at: string | null;
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

function mapRowToOccurrence(row: OccurrenceRow): FollowUpOccurrence {
  return {
    id: row.id,
    followupId: row.followup_id,
    scheduledDueAt: row.scheduled_due_at,
    outcome: row.outcome as FollowUpOccurrence["outcome"],
    resolvedAt: row.resolved_at,
    nextDueAt: row.next_due_at,
  };
}

export class FollowUpRepository {
  constructor(private db: SqliteDatabase) {}

  private getExecutor(options?: RepositoryOptions): SqliteDatabase {
    return options?.tx || this.db;
  }

  async create(input: CreateFollowUpInput, options?: RepositoryOptions): Promise<FollowUp> {
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

    const executor = this.getExecutor(options);
    const id = "fu_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();
    const timeZone = input.timeZone || "UTC";
    const recurrenceJson = input.recurrence ? JSON.stringify(input.recurrence) : null;
    const occId = "occ_" + Math.random().toString(36).substring(2, 10);

    const executeWork = async (tx: SqliteDatabase) => {
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
      await tx.execute(
        `INSERT INTO followup_occurrences (id, followup_id, scheduled_due_at, outcome, resolved_at, next_due_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [occId, id, input.dueAt, "unresolved", null, null]
      );

      if (options?.enqueueOutbox) {
        const syncRepo = new SyncRepository(tx);
        const fuPayload: FollowUp = {
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
        await syncRepo.enqueueOutbox({
          entityType: "followup",
          entityId: id,
          action: "put",
          payload: JSON.stringify(fuPayload),
        }, tx);
        await syncRepo.enqueueOutbox({
          entityType: "occurrence",
          entityId: occId,
          action: "put",
          payload: JSON.stringify({
            id: occId,
            followUpId: id,
            scheduledDueAt: input.dueAt,
            outcome: "unresolved",
            resolvedAt: null,
            nextDueAt: null,
          }),
        }, tx);
      }
    };

    if (options?.tx) {
      await executeWork(options.tx);
    } else {
      await this.db.transaction(executeWork);
    }

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

  async update(id: string, input: UpdateFollowUpInput, options?: RepositoryOptions): Promise<FollowUp> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`FollowUp ${id} not found`);
    }

    const executor = this.getExecutor(options);
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

    await executor.execute(
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

    const updatedFollowUp: FollowUp = {
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

    if (options?.enqueueOutbox) {
      const syncRepo = new SyncRepository(executor);
      const baseRev = await syncRepo.getServerRevision("followup", id);
      await syncRepo.enqueueOutbox({
        entityType: "followup",
        entityId: id,
        action: "put",
        baseRevision: baseRev,
        payload: JSON.stringify(updatedFollowUp),
      }, executor);
    }

    return updatedFollowUp;
  }

  async recordOccurrence(
    followUpId: string,
    scheduledDueAt: string,
    outcome: FollowUpOccurrence["outcome"],
    nextDueAt?: string | null
  ): Promise<FollowUpOccurrence> {
    const id = "occ_" + Math.random().toString(36).substring(2, 10);
    const resolvedAt = new Date().toISOString();

    await this.db.execute(
      `INSERT INTO followup_occurrences (id, followup_id, scheduled_due_at, outcome, resolved_at, next_due_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, followUpId, scheduledDueAt, outcome, resolvedAt, nextDueAt || null]
    );

    return {
      id,
      followupId: followUpId,
      scheduledDueAt,
      outcome,
      resolvedAt,
      nextDueAt: nextDueAt || null,
    };
  }

  async getOccurrences(followUpId: string): Promise<FollowUpOccurrence[]> {
    const rows = await this.db.query<OccurrenceRow>(
      "SELECT * FROM followup_occurrences WHERE followup_id = ? ORDER BY scheduled_due_at ASC",
      [followUpId]
    );
    return rows.map(mapRowToOccurrence);
  }

  async completeOccurrence(
    id: string,
    outcome: FollowUpOccurrence["outcome"] = "completed",
    options?: RepositoryOptions
  ): Promise<FollowUp> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`FollowUp ${id} not found`);
    }

    const now = new Date().toISOString();

    if (existing.recurrence) {
      const baseDate = existing.recurrence.mode === "completionRelative" ? new Date(now) : new Date(existing.dueAt);
      const nextDueAt = computeNextDueAt(existing.recurrence, baseDate);
      await this.db.transaction(async (tx) => {
        const occId = "occ_" + Math.random().toString(36).substring(2, 10);
        await tx.execute(
          `INSERT INTO followup_occurrences (id, followup_id, scheduled_due_at, outcome, resolved_at, next_due_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [occId, id, existing.dueAt, outcome, now, nextDueAt]
        );
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

  async snooze(id: string, hours = 24, options?: RepositoryOptions): Promise<FollowUp> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`FollowUp ${id} not found`);
    }

    const snoozedDueAt = snoozeFollowUp(existing.dueAt, hours);
    return this.update(id, { dueAt: snoozedDueAt }, options);
  }

  async reschedule(id: string, newDueAt: string, options?: RepositoryOptions): Promise<FollowUp> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`FollowUp ${id} not found`);
    }

    const validDueAt = rescheduleFollowUp(newDueAt);
    return this.update(id, { dueAt: validDueAt }, options);
  }

  async delete(id: string, options?: RepositoryOptions): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    const executor = this.getExecutor(options);
    await executor.execute("DELETE FROM followups WHERE id = ?", [id]);
    await executor.execute("DELETE FROM followup_occurrences WHERE followup_id = ?", [id]);

    if (options?.enqueueOutbox) {
      const syncRepo = new SyncRepository(executor);
      const baseRev = await syncRepo.getServerRevision("followup", id);
      await syncRepo.enqueueOutbox({
        entityType: "followup",
        entityId: id,
        action: "delete",
        baseRevision: baseRev,
      }, executor);
      await syncRepo.recordTombstone("local", "followup", id, executor);
    }

    return true;
  }

  async putRaw(followUp: FollowUp, tx?: SqliteDatabase): Promise<void> {
    const executor = tx || this.db;
    const existing = await executor.queryFirst<{ id: string }>("SELECT id FROM followups WHERE id = ?", [followUp.id]);
    const recurrenceJson = followUp.recurrence ? JSON.stringify(followUp.recurrence) : null;

    if (existing) {
      await executor.execute(
        `UPDATE followups
         SET person_name = ?, commitment = ?, details = ?, due_at = ?, time_zone = ?,
             email_address = ?, phone_number = ?, whatsapp_number = ?, preferred_action = ?,
             recurrence = ?, status = ?, source_note_id = ?, source_excerpt = ?, updated_at = ?
         WHERE id = ?`,
        [
          followUp.personName,
          followUp.commitment,
          followUp.details,
          followUp.dueAt,
          followUp.timeZone,
          followUp.emailAddress,
          followUp.phoneNumber,
          followUp.whatsAppNumber,
          followUp.preferredAction,
          recurrenceJson,
          followUp.status,
          followUp.sourceNoteId,
          followUp.sourceExcerpt,
          followUp.updatedAt,
          followUp.id,
        ]
      );
    } else {
      await executor.execute(
        `INSERT INTO followups (
          id, person_name, commitment, details, due_at, time_zone,
          email_address, phone_number, whatsapp_number, preferred_action,
          recurrence, status, source_note_id, source_excerpt, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          followUp.id,
          followUp.personName,
          followUp.commitment,
          followUp.details,
          followUp.dueAt,
          followUp.timeZone,
          followUp.emailAddress,
          followUp.phoneNumber,
          followUp.whatsAppNumber,
          followUp.preferredAction,
          recurrenceJson,
          followUp.status,
          followUp.sourceNoteId,
          followUp.sourceExcerpt,
          followUp.createdAt,
          followUp.updatedAt,
        ]
      );
    }
  }

  async putOccurrenceRaw(occ: FollowUpOccurrence, tx?: SqliteDatabase): Promise<void> {
    const executor = tx || this.db;
    const existing = await executor.queryFirst<{ id: string }>("SELECT id FROM followup_occurrences WHERE id = ?", [occ.id]);
    if (existing) {
      await executor.execute(
        `UPDATE followup_occurrences
         SET followup_id = ?, scheduled_due_at = ?, outcome = ?, resolved_at = ?, next_due_at = ?
         WHERE id = ?`,
        [occ.followupId, occ.scheduledDueAt, occ.outcome, occ.resolvedAt, occ.nextDueAt, occ.id]
      );
    } else {
      await executor.execute(
        `INSERT INTO followup_occurrences (id, followup_id, scheduled_due_at, outcome, resolved_at, next_due_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [occ.id, occ.followupId, occ.scheduledDueAt, occ.outcome, occ.resolvedAt, occ.nextDueAt]
      );
    }
  }
}
