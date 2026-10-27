import { describe, it, expect } from "vitest";
import { aggregateCalendarMonth, getScheduleForDate } from "./calendar";
import type { Task } from "../types/task";
import type { FollowUp } from "../types/followup";

describe("calendar service", () => {
  const sampleTasks: Task[] = [
    {
      id: "t1",
      title: "Sprint demo",
      description: "",
      completed: false,
      completedAt: null,
      priority: "high",
      dueDate: "2026-10-25",
      category: "work",
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
    {
      id: "t2",
      title: "Design retro",
      description: "",
      completed: true,
      completedAt: "2026-10-25T10:00:00Z",
      priority: "medium",
      dueDate: "2026-10-25",
      category: "work",
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
    {
      id: "t3",
      title: "End of month budget",
      description: "",
      completed: false,
      completedAt: null,
      priority: "high",
      dueDate: "2026-10-31",
      category: "work",
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
  ];

  const sampleFollowups: FollowUp[] = [
    {
      id: "fu1",
      personName: "Carol",
      commitment: "Confirm venue booking",
      details: null,
      dueAt: "2026-10-25T11:00:00Z",
      timeZone: "UTC",
      emailAddress: null,
      phoneNumber: null,
      whatsAppNumber: null,
      preferredAction: null,
      recurrence: null,
      status: "open",
      sourceNoteId: null,
      sourceExcerpt: null,
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
  ];

  it("retrieves schedule for a single date with combined tasks and followups", () => {
    const schedule = getScheduleForDate(sampleTasks, sampleFollowups, "2026-10-25");
    expect(schedule.date).toBe("2026-10-25");
    expect(schedule.tasks.length).toBe(2);
    expect(schedule.followups.length).toBe(1);
    expect(schedule.totalItems).toBe(3);
  });

  it("aggregates an entire month into day buckets", () => {
    const month = aggregateCalendarMonth(sampleTasks, sampleFollowups, 2026, 10);
    expect(month.year).toBe(2026);
    expect(month.month).toBe(10);
    expect(Object.keys(month.days).length).toBe(31);

    const oct25 = month.days["2026-10-25"];
    expect(oct25).toBeDefined();
    expect(oct25.totalItems).toBe(3);

    const oct31 = month.days["2026-10-31"];
    expect(oct31).toBeDefined();
    expect(oct31.tasks.length).toBe(1);

    const oct01 = month.days["2026-10-01"];
    expect(oct01.totalItems).toBe(0);
  });
});
