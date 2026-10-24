import { afterEach, describe, expect, it } from "vitest";
import { deleteDb } from "@/lib/db";
import {
  createFollowUp,
  getFollowUp,
  listFollowUps,
  updateFollowUp,
  deleteFollowUp,
  recordOccurrence,
  listOccurrencesByFollowUp,
  listAllOccurrences,
  FollowUpValidationError,
  FollowUpNotFoundError,
} from "@/lib/followups";

afterEach(async () => {
  await deleteDb();
});

describe("FollowUps Data Layer", () => {
  const baseInput = {
    personName: "Alice Smith",
    commitment: "Send quarterly review report",
    details: "Include performance benchmarks and growth targets",
    dueAt: "2026-11-01T14:00:00.000Z",
    emailAddress: "alice@example.com",
    phoneNumber: "+1234567890",
    whatsAppNumber: "+1234567890",
    preferredAction: "email" as const,
  };

  it("creates a follow-up with complete attributes and persists to IndexedDB", async () => {
    const followUp = await createFollowUp(baseInput);

    expect(followUp.id).toBeDefined();
    expect(followUp.personName).toBe("Alice Smith");
    expect(followUp.commitment).toBe("Send quarterly review report");
    expect(followUp.details).toBe("Include performance benchmarks and growth targets");
    expect(followUp.status).toBe("open");
    expect(followUp.createdAt).toBeDefined();
    expect(followUp.updatedAt).toBe(followUp.createdAt);

    const fetched = await getFollowUp(followUp.id);
    expect(fetched).toEqual(followUp);
  });

  it("validates required fields and input constraints", async () => {
    await expect(
      createFollowUp({ ...baseInput, personName: "   " })
    ).rejects.toThrow(FollowUpValidationError);

    await expect(
      createFollowUp({ ...baseInput, commitment: "" })
    ).rejects.toThrow(FollowUpValidationError);

    await expect(
      createFollowUp({ ...baseInput, emailAddress: "not-an-email" })
    ).rejects.toThrow(FollowUpValidationError);

    await expect(
      createFollowUp({ ...baseInput, dueAt: "invalid-date" })
    ).rejects.toThrow(FollowUpValidationError);
  });

  it("lists follow-ups sorted by dueAt ascending and filters by status", async () => {
    const f1 = await createFollowUp({
      personName: "Charlie",
      commitment: "Task in Dec",
      dueAt: "2026-12-01T10:00:00.000Z",
    });

    const f2 = await createFollowUp({
      personName: "Bob",
      commitment: "Task in Oct",
      dueAt: "2026-10-15T10:00:00.000Z",
    });

    const f3 = await createFollowUp({
      personName: "David",
      commitment: "Completed task",
      dueAt: "2026-10-10T10:00:00.000Z",
      status: "completed",
    });

    const all = await listFollowUps();
    expect(all.map((f) => f.id)).toEqual([f3.id, f2.id, f1.id]);

    const openOnly = await listFollowUps({ status: "open" });
    expect(openOnly.map((f) => f.id)).toEqual([f2.id, f1.id]);

    const completedOnly = await listFollowUps({ status: "completed" });
    expect(completedOnly.map((f) => f.id)).toEqual([f3.id]);
  });

  it("updates existing follow-up attributes cleanly", async () => {
    const followUp = await createFollowUp(baseInput);

    const updated = await updateFollowUp(followUp.id, {
      commitment: "Updated review report schedule",
      status: "completed",
    });

    expect(updated.commitment).toBe("Updated review report schedule");
    expect(updated.status).toBe("completed");
    expect(updated.personName).toBe("Alice Smith");

    const fetched = await getFollowUp(followUp.id);
    expect(fetched?.status).toBe("completed");
  });

  it("throws FollowUpNotFoundError when updating non-existent record", async () => {
    await expect(
      updateFollowUp("non-existent-id", { commitment: "test" })
    ).rejects.toThrow(FollowUpNotFoundError);
  });

  it("deletes a follow-up and cascades to its occurrences", async () => {
    const followUp = await createFollowUp(baseInput);

    await recordOccurrence({
      followUpId: followUp.id,
      dueAt: followUp.dueAt,
      outcome: "completed",
      resolvedAt: new Date().toISOString(),
      nextDueAt: null,
    });

    const occurrencesBefore = await listOccurrencesByFollowUp(followUp.id);
    expect(occurrencesBefore).toHaveLength(1);

    await deleteFollowUp(followUp.id);

    const fetched = await getFollowUp(followUp.id);
    expect(fetched).toBeNull();

    const occurrencesAfter = await listOccurrencesByFollowUp(followUp.id);
    expect(occurrencesAfter).toHaveLength(0);
  });

  it("records occurrence history and lists in descending order of due date", async () => {
    const followUp = await createFollowUp(baseInput);

    const occ1 = await recordOccurrence({
      followUpId: followUp.id,
      dueAt: "2026-10-01T10:00:00.000Z",
      outcome: "completed",
      resolvedAt: "2026-10-01T10:30:00.000Z",
      nextDueAt: "2026-10-08T10:00:00.000Z",
    });

    const occ2 = await recordOccurrence({
      followUpId: followUp.id,
      dueAt: "2026-10-08T10:00:00.000Z",
      outcome: "skipped",
      resolvedAt: "2026-10-08T11:00:00.000Z",
      nextDueAt: "2026-10-15T10:00:00.000Z",
    });

    const list = await listOccurrencesByFollowUp(followUp.id);
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe(occ2.id); // Newer first
    expect(list[1].id).toBe(occ1.id);

    const allOccurrences = await listAllOccurrences();
    expect(allOccurrences).toHaveLength(2);
  });

  it("completes one-time follow-up and creates completed occurrence", async () => {
    const { completeFollowUp } = await import("@/lib/followups");
    const followUp = await createFollowUp(baseInput);

    const completed = await completeFollowUp(followUp.id);
    expect(completed.status).toBe("completed");

    const history = await listOccurrencesByFollowUp(followUp.id);
    expect(history).toHaveLength(1);
    expect(history[0].outcome).toBe("completed");
    expect(history[0].nextDueAt).toBeNull();
  });

  it("completes recurring follow-up and advances due date to next occurrence", async () => {
    const { completeFollowUp } = await import("@/lib/followups");
    const followUp = await createFollowUp({
      ...baseInput,
      dueAt: "2026-10-20T10:00:00.000Z",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        mode: "calendarAnchored",
      },
    });

    const completed = await completeFollowUp(followUp.id, "2026-10-21T10:00:00.000Z");
    expect(completed.status).toBe("open");
    expect(completed.dueAt).toBe("2026-10-27T10:00:00.000Z");

    const history = await listOccurrencesByFollowUp(followUp.id);
    expect(history).toHaveLength(1);
    expect(history[0].outcome).toBe("completed");
    expect(history[0].nextDueAt).toBe("2026-10-27T10:00:00.000Z");
  });

  it("skips recurring occurrence and advances to next schedule", async () => {
    const { skipFollowUpOccurrence } = await import("@/lib/followups");
    const followUp = await createFollowUp({
      ...baseInput,
      dueAt: "2026-10-20T10:00:00.000Z",
      recurrence: {
        frequency: "daily",
        interval: 2,
        mode: "calendarAnchored",
      },
    });

    const skipped = await skipFollowUpOccurrence(followUp.id, "Not needed today");
    expect(skipped.status).toBe("open");
    expect(skipped.dueAt).toBe("2026-10-22T10:00:00.000Z");

    const history = await listOccurrencesByFollowUp(followUp.id);
    expect(history).toHaveLength(1);
    expect(history[0].outcome).toBe("skipped");
    expect(history[0].notes).toBe("Not needed today");
  });

  it("snoozes a follow-up to a later time without affecting recurrence series", async () => {
    const { snoozeFollowUp } = await import("@/lib/followups");
    const followUp = await createFollowUp({
      ...baseInput,
      dueAt: "2026-10-20T10:00:00.000Z",
    });

    const snoozed = await snoozeFollowUp(followUp.id, "1hour");
    expect(new Date(snoozed.dueAt).getTime()).toBeGreaterThan(new Date(followUp.dueAt).getTime());
  });

  it("reschedules single occurrence versus entire series", async () => {
    const { rescheduleFollowUp } = await import("@/lib/followups");
    const followUp = await createFollowUp({
      ...baseInput,
      dueAt: "2026-10-20T10:00:00.000Z",
      recurrence: {
        frequency: "monthly",
        interval: 1,
        mode: "calendarAnchored",
        monthDay: 20,
      },
    });

    const rescheduledSingle = await rescheduleFollowUp(
      followUp.id,
      "2026-10-25T10:00:00.000Z",
      "single"
    );
    expect(rescheduledSingle.dueAt).toBe("2026-10-25T10:00:00.000Z");
    expect(rescheduledSingle.recurrence?.monthDay).toBe(20);

    const rescheduledSeries = await rescheduleFollowUp(
      followUp.id,
      "2026-11-05T10:00:00.000Z",
      "series"
    );
    expect(rescheduledSeries.dueAt).toBe("2026-11-05T10:00:00.000Z");
    expect(rescheduledSeries.recurrence?.monthDay).toBe(5);
  });

  it("counts due and overdue open follow-ups accurately", async () => {
    const { getDueFollowUpsCount } = await import("@/lib/followups");
    await createFollowUp({
      personName: "Past Due Person",
      commitment: "Overdue call",
      dueAt: "2020-01-01T10:00:00.000Z",
      status: "open",
    });

    await createFollowUp({
      personName: "Future Person",
      commitment: "Future checkin",
      dueAt: "2099-01-01T10:00:00.000Z",
      status: "open",
    });

    const count = await getDueFollowUpsCount();
    expect(count).toBe(1);
  });
});

