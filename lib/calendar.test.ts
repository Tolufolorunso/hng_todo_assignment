import { describe, expect, it } from "vitest";
import {
  formatMonthYear,
  formatSelectedDateHeading,
  getCalendarDays,
  getNextMonth,
  getPrevMonth,
  groupTasksByDate,
  WEEKDAYS,
} from "@/lib/calendar";
import type { Task } from "@/types/task";

function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Sample Task",
    description: "",
    completed: false,
    priority: "medium",
    dueDate: null,
    category: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

describe("calendar utilities", () => {
  it("exports Monday-based weekdays array", () => {
    expect(WEEKDAYS).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  describe("getCalendarDays", () => {
    it("generates grid for October 2026 with correct padding and month boundaries", () => {
      // Oct 1, 2026 is Thursday. Mon-start offset = 3 (Mon, Tue, Wed are padding).
      // Oct has 31 days. 3 + 31 = 34. Total days must be a multiple of 7 -> 35 days (1 trailing padding).
      const days = getCalendarDays(2026, 9, "2026-10-15");

      expect(days.length).toBe(35);
      expect(days.length % 7).toBe(0);

      // Leading padding days (Sept 28, 29, 30)
      expect(days[0].isoDate).toBe("2026-09-28");
      expect(days[0].isCurrentMonth).toBe(false);
      expect(days[1].isoDate).toBe("2026-09-29");
      expect(days[2].isoDate).toBe("2026-09-30");

      // First day of October
      expect(days[3].isoDate).toBe("2026-10-01");
      expect(days[3].dayOfMonth).toBe(1);
      expect(days[3].isCurrentMonth).toBe(true);

      // Last day of October
      expect(days[33].isoDate).toBe("2026-10-31");
      expect(days[33].dayOfMonth).toBe(31);
      expect(days[33].isCurrentMonth).toBe(true);

      // Trailing padding day (Nov 1)
      expect(days[34].isoDate).toBe("2026-11-01");
      expect(days[34].dayOfMonth).toBe(1);
      expect(days[34].isCurrentMonth).toBe(false);
    });

    it("correctly flags isToday and isPast based on todayIso", () => {
      const todayIso = "2026-10-15";
      const days = getCalendarDays(2026, 9, todayIso);

      const pastDay = days.find((d) => d.isoDate === "2026-10-10");
      expect(pastDay?.isPast).toBe(true);
      expect(pastDay?.isToday).toBe(false);

      const today = days.find((d) => d.isoDate === "2026-10-15");
      expect(today?.isPast).toBe(false);
      expect(today?.isToday).toBe(true);

      const futureDay = days.find((d) => d.isoDate === "2026-10-20");
      expect(futureDay?.isPast).toBe(false);
      expect(futureDay?.isToday).toBe(false);
    });

    it("handles leap years in February correctly (2024 has 29 days)", () => {
      const days = getCalendarDays(2024, 1, "2024-02-15");
      const currentMonthDays = days.filter((d) => d.isCurrentMonth);
      expect(currentMonthDays.length).toBe(29);
      expect(currentMonthDays[28].isoDate).toBe("2024-02-29");
    });

    it("handles non-leap years in February correctly (2025 has 28 days)", () => {
      const days = getCalendarDays(2025, 1, "2025-02-15");
      const currentMonthDays = days.filter((d) => d.isCurrentMonth);
      expect(currentMonthDays.length).toBe(28);
      expect(currentMonthDays[27].isoDate).toBe("2025-02-28");
    });
  });

  describe("groupTasksByDate", () => {
    it("separates tasks with due dates from unscheduled tasks", () => {
      const task1 = mockTask({ id: "t1", dueDate: "2026-10-05" });
      const task2 = mockTask({ id: "t2", dueDate: "2026-10-05" });
      const task3 = mockTask({ id: "t3", dueDate: "2026-10-12" });
      const task4 = mockTask({ id: "t4", dueDate: null });
      const task5 = mockTask({ id: "t5", dueDate: null });

      const grouped = groupTasksByDate([task1, task2, task3, task4, task5]);

      expect(grouped.unscheduled).toHaveLength(2);
      expect(grouped.unscheduled.map((t) => t.id)).toEqual(["t4", "t5"]);

      expect(Object.keys(grouped.byDate)).toHaveLength(2);
      expect(grouped.byDate["2026-10-05"]).toHaveLength(2);
      expect(grouped.byDate["2026-10-12"]).toHaveLength(1);
    });

    it("handles empty task list", () => {
      const grouped = groupTasksByDate([]);
      expect(grouped.unscheduled).toEqual([]);
      expect(grouped.byDate).toEqual({});
    });
  });

  describe("month navigation helpers", () => {
    it("steps backwards through regular months and year boundaries", () => {
      expect(getPrevMonth(2026, 5)).toEqual({ year: 2026, monthIndex: 4 });
      expect(getPrevMonth(2026, 0)).toEqual({ year: 2025, monthIndex: 11 });
    });

    it("steps forward through regular months and year boundaries", () => {
      expect(getNextMonth(2026, 5)).toEqual({ year: 2026, monthIndex: 6 });
      expect(getNextMonth(2026, 11)).toEqual({ year: 2027, monthIndex: 0 });
    });

    it("formats month and year heading correctly", () => {
      expect(formatMonthYear(2026, 9)).toBe("October 2026");
      expect(formatMonthYear(2027, 0)).toBe("January 2027");
    });

    it("formats selected date heading in readable format", () => {
      expect(formatSelectedDateHeading("2026-10-15")).toBe("Thursday, Oct 15, 2026");
      expect(formatSelectedDateHeading("2027-01-01")).toBe("Friday, Jan 1, 2027");
    });
  });
});
