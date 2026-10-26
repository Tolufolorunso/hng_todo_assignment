import { describe, it, expect } from "vitest";
import { computeNextDueAt, snoozeFollowUp, rescheduleFollowUp } from "./recurrence.js";
import type { RecurrenceRule } from "../types/followup.js";

describe("Mobile Recurrence Engine", () => {
  it("computes calendar-anchored daily recurrence at target time of day", () => {
    const rule: RecurrenceRule = {
      mode: "calendarAnchored",
      frequency: "daily",
      interval: 1,
      timeOfDay: "14:30",
      timeZone: "UTC",
    };
    const base = new Date("2026-10-25T10:00:00.000Z");
    const next = computeNextDueAt(rule, base);
    expect(next).toBe("2026-10-26T14:30:00.000Z");
  });

  it("computes calendar-anchored weekly recurrence matching target weekdays", () => {
    // 2026-10-25 is Sunday (day 0)
    const rule: RecurrenceRule = {
      mode: "calendarAnchored",
      frequency: "weekly",
      interval: 1,
      weekdays: [2], // Tuesday
      timeOfDay: "09:00",
      timeZone: "UTC",
    };
    const base = new Date("2026-10-25T08:00:00.000Z");
    const next = computeNextDueAt(rule, base);
    // Next Tuesday is 2026-10-27
    expect(next).toBe("2026-10-27T09:00:00.000Z");
  });

  it("computes calendar-anchored monthly recurrence preserving target day of month", () => {
    const rule: RecurrenceRule = {
      mode: "calendarAnchored",
      frequency: "monthly",
      interval: 1,
      monthDay: 15,
      timeOfDay: "11:00",
      timeZone: "UTC",
    };
    const base = new Date("2026-10-25T10:00:00.000Z");
    const next = computeNextDueAt(rule, base);
    expect(next).toBe("2026-11-15T11:00:00.000Z");
  });

  it("computes completion-relative recurrence from resolution timestamp", () => {
    const rule: RecurrenceRule = {
      mode: "completionRelative",
      frequency: "daily",
      interval: 3,
      timeOfDay: "10:00",
      timeZone: "UTC",
    };
    const completionDate = new Date("2026-10-25T16:45:00.000Z");
    const next = computeNextDueAt(rule, completionDate);
    expect(next).toBe("2026-10-28T16:45:00.000Z");
  });

  it("snoozes a follow-up by specified hours", () => {
    const dueAt = "2026-10-25T12:00:00.000Z";
    const snoozed = snoozeFollowUp(dueAt, 48);
    expect(new Date(snoozed).getTime()).toBeGreaterThan(new Date(dueAt).getTime());
  });

  it("reschedules a follow-up with valid ISO date and rejects malformed string", () => {
    const valid = rescheduleFollowUp("2026-11-01T15:00:00.000Z");
    expect(valid).toBe("2026-11-01T15:00:00.000Z");
    expect(() => rescheduleFollowUp("not-a-date")).toThrow("Invalid reschedule timestamp");
  });
});
