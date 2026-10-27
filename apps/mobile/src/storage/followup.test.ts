import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySqliteDatabase } from "../db/driver";
import { runMigrations } from "../db/migrations";
import { FollowUpRepository } from "./followUpRepository";

describe("Mobile FollowUpRepository", () => {
  let db: InMemorySqliteDatabase;
  let repo: FollowUpRepository;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);
    repo = new FollowUpRepository(db);
  });

  it("creates and retrieves a one-time follow-up commitment", async () => {
    const fu = await repo.create({
      personName: "Bob Smith",
      commitment: "Send revised proposal",
      dueAt: "2026-10-27T10:00:00.000Z",
      emailAddress: "bob@example.com",
      preferredAction: "email",
    });

    expect(fu.id).toMatch(/^fu_/);
    expect(fu.personName).toBe("Bob Smith");
    expect(fu.commitment).toBe("Send revised proposal");
    expect(fu.status).toBe("open");

    const fetched = await repo.getById(fu.id);
    expect(fetched).toEqual(fu);
  });

  it("completes a one-time follow-up", async () => {
    const fu = await repo.create({
      personName: "Carol",
      commitment: "Call back after lunch",
      dueAt: "2026-10-26T13:00:00.000Z",
    });

    const completed = await repo.completeOccurrence(fu.id, "completed");
    expect(completed.status).toBe("completed");
  });

  it("advances dueAt when completing a recurring follow-up", async () => {
    const fu = await repo.create({
      personName: "David",
      commitment: "Weekly sync meeting",
      dueAt: "2026-10-26T09:00:00.000Z",
      recurrence: {
        mode: "calendarAnchored",
        frequency: "weekly",
        interval: 1,
        timeOfDay: "09:00",
        timeZone: "UTC",
      },
    });

    const advanced = await repo.completeOccurrence(fu.id, "completed");
    expect(advanced.status).toBe("open");
    expect(new Date(advanced.dueAt).getTime()).toBeGreaterThan(new Date("2026-10-26T09:00:00.000Z").getTime());
  });

  it("snoozes and reschedules follow-ups", async () => {
    const fu = await repo.create({
      personName: "Emma",
      commitment: "Review portfolio",
      dueAt: "2026-10-28T12:00:00.000Z",
    });

    const snoozed = await repo.snooze(fu.id, 24);
    expect(new Date(snoozed.dueAt).getTime()).toBeGreaterThan(new Date(fu.dueAt).getTime());

    const rescheduled = await repo.reschedule(fu.id, "2026-11-05T15:00:00.000Z");
    expect(rescheduled.dueAt).toBe("2026-11-05T15:00:00.000Z");
  });

  it("deletes a follow-up and its occurrences", async () => {
    const fu = await repo.create({
      personName: "Frank",
      commitment: "Quick check-in",
      dueAt: "2026-10-29T10:00:00.000Z",
    });

    const deleted = await repo.delete(fu.id);
    expect(deleted).toBe(true);
    expect(await repo.getById(fu.id)).toBeNull();
  });
});
