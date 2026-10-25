import { describe, expect, it } from "vitest";
import {
  calculateNextOccurrence,
  calculateSnoozeDueAt,
  isFollowUpOverdue,
} from "@/lib/recurrence";
import type { RecurrenceRule } from "@/types/followup";

describe("Recurrence Engine", () => {
  describe("Calendar-Anchored Mode", () => {
    it("advances daily recurrence by interval days from scheduled due date", () => {
      const rule: RecurrenceRule = {
        mode: "calendarAnchored",
        frequency: "daily",
        interval: 2,
        timeZone: "UTC",
      };

      const currentDueAt = "2026-10-10T14:30:00.000Z";
      // Even if completed late on Oct 12, calendar-anchored advances from scheduled dueAt
      const completedAt = "2026-10-12T19:00:00.000Z";

      const next = calculateNextOccurrence(rule, currentDueAt, completedAt);
      expect(next).toBe("2026-10-12T14:30:00.000Z");
    });

    it("advances weekly recurrence to next scheduled weekday", () => {
      const rule: RecurrenceRule = {
        mode: "calendarAnchored",
        frequency: "weekly",
        interval: 1,
        weekdays: [1, 3, 5], // Mon (1), Wed (3), Fri (5)
        timeZone: "UTC",
      };

      // 2026-10-12 is a Monday (day 1)
      const currentDueAt = "2026-10-12T10:00:00.000Z";
      const next1 = calculateNextOccurrence(rule, currentDueAt);
      // Next should be Wednesday 2026-10-14 (day 3)
      expect(next1).toBe("2026-10-14T10:00:00.000Z");

      // From Friday 2026-10-16 (day 5), next should wrap to Monday 2026-10-19
      const next2 = calculateNextOccurrence(rule, "2026-10-16T10:00:00.000Z");
      expect(next2).toBe("2026-10-19T10:00:00.000Z");
    });

    it("handles monthly recurrence with month-end clamping", () => {
      const rule: RecurrenceRule = {
        mode: "calendarAnchored",
        frequency: "monthly",
        interval: 1,
        monthDay: 31,
        timeZone: "UTC",
      };

      // Starting from January 31, next month is February (28 days in non-leap year 2026)
      const currentDueAt = "2026-01-31T09:00:00.000Z";
      const next = calculateNextOccurrence(rule, currentDueAt);

      expect(next).toBe("2026-02-28T09:00:00.000Z");
    });

    it("respects rule end date and returns null when next occurrence exceeds it", () => {
      const rule: RecurrenceRule = {
        mode: "calendarAnchored",
        frequency: "daily",
        interval: 5,
        timeZone: "UTC",
        endDate: "2026-10-12T00:00:00.000Z",
      };

      const currentDueAt = "2026-10-10T00:00:00.000Z";
      const next = calculateNextOccurrence(rule, currentDueAt);

      // Next would be Oct 15, which exceeds endDate Oct 12
      expect(next).toBeNull();
    });
  });

  describe("Completion-Relative Mode", () => {
    it("calculates next occurrence relative to actual completion timestamp", () => {
      const rule: RecurrenceRule = {
        mode: "completionRelative",
        frequency: "customDays",
        interval: 7,
        timeZone: "UTC",
      };

      const currentDueAt = "2026-10-01T10:00:00.000Z";
      // Completed late on Oct 5th
      const completedAt = "2026-10-05T16:00:00.000Z";

      const next = calculateNextOccurrence(rule, currentDueAt, completedAt);
      // Expect 7 days after Oct 5 = Oct 12 at 10:00 (original time of day preserved)
      expect(next).toBe("2026-10-12T10:00:00.000Z");
    });
  });

  describe("Snooze Calculations", () => {
    const fixedNow = new Date("2026-10-20T10:00:00.000Z").getTime();
    const currentDueAt = "2026-10-20T08:00:00.000Z"; // overdue

    it("snoozes for 1 hour from current reference time", () => {
      const snoozed = calculateSnoozeDueAt(currentDueAt, "1hour", fixedNow);
      expect(snoozed).toBe("2026-10-20T11:00:00.000Z");
    });

    it("snoozes to tomorrow morning 09:00 UTC", () => {
      const snoozed = calculateSnoozeDueAt(currentDueAt, "tomorrow", fixedNow);
      expect(snoozed).toBe("2026-10-21T09:00:00.000Z");
    });

    it("snoozes to next week morning 09:00 UTC", () => {
      const snoozed = calculateSnoozeDueAt(currentDueAt, "nextWeek", fixedNow);
      expect(snoozed).toBe("2026-10-27T09:00:00.000Z");
    });

    it("accepts custom valid ISO timestamp", () => {
      const customDate = "2026-10-25T15:30:00.000Z";
      const snoozed = calculateSnoozeDueAt(currentDueAt, customDate, fixedNow);
      expect(snoozed).toBe(customDate);
    });
  });

  describe("isFollowUpOverdue", () => {
    const fixedNow = new Date("2026-10-20T12:00:00.000Z").getTime();

    it("returns true for open follow-ups past their dueAt timestamp", () => {
      expect(isFollowUpOverdue("2026-10-20T11:59:00.000Z", "open", fixedNow)).toBe(true);
    });

    it("returns false for open follow-ups in the future", () => {
      expect(isFollowUpOverdue("2026-10-20T12:01:00.000Z", "open", fixedNow)).toBe(false);
    });

    it("returns false for completed or archived follow-ups even if past due", () => {
      expect(isFollowUpOverdue("2026-10-15T00:00:00.000Z", "completed", fixedNow)).toBe(false);
      expect(isFollowUpOverdue("2026-10-15T00:00:00.000Z", "archived", fixedNow)).toBe(false);
    });
  });
});
