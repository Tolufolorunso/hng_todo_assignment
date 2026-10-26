import { describe, it, expect } from "vitest";
import { calculateProductivityAnalytics } from "./analytics.js";
import { NotificationScheduler } from "./notifications.js";
import type { Task } from "../types/task.js";
import type { FollowUp } from "../types/followup.js";

describe("analytics service", () => {
  const sampleTasks: Task[] = [
    {
      id: "t1",
      title: "Write documentation",
      description: "",
      completed: true,
      completedAt: "2026-10-21T10:00:00Z",
      dueDate: "2026-10-21",
      priority: "high",
      category: "work",
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
    {
      id: "t2",
      title: "Gym session",
      description: "",
      completed: true,
      completedAt: "2026-10-21T10:00:00Z",
      dueDate: "2026-10-21",
      priority: "medium",
      category: "personal",
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
    {
      id: "t3",
      title: "Pay credit card",
      description: "",
      completed: false,
      completedAt: null,
      dueDate: null,
      priority: "high",
      category: "personal",
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
    {
      id: "t4",
      title: "Study system design",
      description: "",
      completed: false,
      completedAt: null,
      dueDate: null,
      priority: "low",
      category: "study",
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
  ];

  const sampleFollowups: FollowUp[] = [
    {
      id: "fu1",
      personName: "David",
      commitment: "Send quarterly roadmap",
      details: null,
      dueAt: "2026-10-25T14:00:00Z",
      timeZone: "UTC",
      emailAddress: null,
      phoneNumber: null,
      whatsAppNumber: null,
      preferredAction: null,
      recurrence: null,
      status: "completed",
      sourceNoteId: null,
      sourceExcerpt: null,
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
    {
      id: "fu2",
      personName: "Eve",
      commitment: "Schedule one on one",
      details: null,
      dueAt: "2026-10-26T14:00:00Z",
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

  it("calculates task completion and follow-up reliability rates", () => {
    const analytics = calculateProductivityAnalytics(sampleTasks, sampleFollowups);

    expect(analytics.totalTasks).toBe(4);
    expect(analytics.completedTasks).toBe(2);
    expect(analytics.completionRate).toBe(50);

    expect(analytics.totalFollowUps).toBe(2);
    expect(analytics.completedFollowUps).toBe(1);
    expect(analytics.reliabilityRate).toBe(50);
  });

  it("aggregates categories and priorities properly", () => {
    const analytics = calculateProductivityAnalytics(sampleTasks, sampleFollowups);

    const personal = analytics.tasksByCategory.find((c) => c.category === "personal");
    expect(personal?.count).toBe(2);

    const highPriority = analytics.tasksByPriority.find((p) => p.priority === "high");
    expect(highPriority?.count).toBe(2);
  });
});

describe("notification scheduler", () => {
  it("schedules and cancels reminders", async () => {
    const scheduler = new NotificationScheduler();
    const followUp: FollowUp = {
      id: "fu_test",
      personName: "Frank",
      commitment: "Check proposal",
      details: null,
      dueAt: "2026-12-01T15:00:00Z",
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
    };

    const scheduled = await scheduler.scheduleFollowUpReminder(followUp, 30);
    expect(scheduled.title).toContain("Frank");
    expect(scheduled.triggerAt).toBe("2026-12-01T14:30:00.000Z");

    const pending = await scheduler.listPending();
    expect(pending.length).toBe(1);

    const cancelled = await scheduler.cancel(scheduled.id);
    expect(cancelled).toBe(true);

    const afterCancel = await scheduler.listPending();
    expect(afterCancel.length).toBe(0);
  });
});
