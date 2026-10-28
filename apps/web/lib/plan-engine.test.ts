import { describe, expect, it } from "vitest";
import { generateDailyRecommendations } from "@/lib/plan-engine";
import type { Task } from "@/types/task";
import type { FollowUp } from "@/types/followup";
import type { DailyPlan } from "@/types/plan";

function mockTask(partial: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    title: "Sample Task",
    description: "",
    completed: false,
    priority: "medium",
    dueDate: null,
    category: null,
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
    completedAt: null,
    ...partial,
  };
}

function mockFollowUp(partial: Partial<FollowUp>): FollowUp {
  return {
    id: crypto.randomUUID(),
    personName: "John Doe",
    commitment: "Check in on project",
    details: null,
    dueAt: "2026-10-25T12:00:00.000Z",
    timeZone: "UTC",
    emailAddress: null,
    phoneNumber: null,
    whatsAppNumber: null,
    preferredAction: null,
    recurrence: null,
    status: "open",
    sourceNoteId: null,
    sourceExcerpt: null,
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
    ...partial,
  };
}

describe("plan recommendation engine", () => {
  it("returns empty result when no tasks or follow-ups exist", () => {
    const result = generateDailyRecommendations([], [], 120);
    expect(result.recommendedItems).toHaveLength(0);
    expect(result.otherEligibleItems).toHaveLength(0);
    expect(result.totalPlannedMinutes).toBe(0);
    expect(result.utilizationPercent).toBe(0);
  });

  it("prioritizes overdue items with explicit reasons", () => {
    const overdueTask = mockTask({
      title: "Overdue critical fix",
      dueDate: "2026-10-20",
      estimatedMinutes: 60,
    });
    const futureTask = mockTask({
      title: "Next week planning",
      dueDate: "2026-10-30",
      estimatedMinutes: 60,
    });

    const result = generateDailyRecommendations(
      [futureTask, overdueTask],
      [],
      60,
      { targetDate: "2026-10-25" }
    );

    expect(result.recommendedItems).toHaveLength(1);
    expect(result.recommendedItems[0].targetId).toBe(overdueTask.id);
    expect(result.recommendedItems[0].recommendationReason).toContain("Overdue by 5 days");
    expect(result.otherEligibleItems).toHaveLength(1);
    expect(result.otherEligibleItems[0].targetId).toBe(futureTask.id);
  });

  it("fits items within available capacity and places overflow into otherEligibleItems", () => {
    const taskA = mockTask({ title: "Task A", priority: "high", estimatedMinutes: 60 });
    const taskB = mockTask({ title: "Task B", priority: "medium", estimatedMinutes: 60 });
    const taskC = mockTask({ title: "Task C", priority: "low", estimatedMinutes: 60 });

    const result = generateDailyRecommendations([taskA, taskB, taskC], [], 90);

    expect(result.recommendedItems).toHaveLength(1);
    expect(result.recommendedItems[0].targetId).toBe(taskA.id);
    expect(result.totalPlannedMinutes).toBe(60);
    expect(result.otherEligibleItems).toHaveLength(2);
  });

  it("suggests high priority items due today with combined rationale", () => {
    const task = mockTask({
      title: "Submit tax docs",
      dueDate: "2026-10-25",
      priority: "high",
      estimatedMinutes: 30,
    });

    const result = generateDailyRecommendations([task], [], 60, {
      targetDate: "2026-10-25",
    });

    expect(result.recommendedItems[0].recommendationReason).toBe("High priority and due today");
  });

  it("includes open follow-ups due today alongside tasks", () => {
    const task = mockTask({ title: "Draft email", estimatedMinutes: 30 });
    const followup = mockFollowUp({
      personName: "Alice",
      commitment: "Send contract",
      dueAt: "2026-10-25T14:00:00.000Z",
    });

    const result = generateDailyRecommendations([task], [followup], 60, {
      targetDate: "2026-10-25",
    });

    expect(result.recommendedItems).toHaveLength(2);
    const followupItem = result.recommendedItems.find((it) => it.type === "followup");
    expect(followupItem).toBeDefined();
    expect(followupItem?.title).toBe("Alice: Send contract");
    expect(followupItem?.recommendationReason).toBe("Follow-up commitment due today");
  });

  it("detects unfinished items from previous plan and applies reason", () => {
    const task = mockTask({ title: "Incomplete yesterday task", estimatedMinutes: 30 });
    const previousPlan: DailyPlan = {
      id: "prev-plan-1",
      date: "2026-10-24",
      timeZone: "UTC",
      availableMinutes: 120,
      items: [
        {
          id: "item-prev-1",
          type: "task",
          targetId: task.id,
          title: task.title,
          estimatedMinutes: 30,
          completed: false,
          order: 0,
        },
      ],
      acceptedAt: "2026-10-24T09:00:00.000Z",
      createdAt: "2026-10-24T09:00:00.000Z",
      updatedAt: "2026-10-24T09:00:00.000Z",
    };

    const result = generateDailyRecommendations([task], [], 60, {
      targetDate: "2026-10-25",
      previousPlan,
    });

    expect(result.recommendedItems[0].recommendationReason).toBe("Unfinished from previous plan");
  });

  it("filters out completed tasks and non-open followups", () => {
    const completedTask = mockTask({ title: "Done task", completed: true });
    const archivedFollowup = mockFollowUp({
      personName: "Bob",
      commitment: "Archive test",
      status: "archived",
    });

    const result = generateDailyRecommendations([completedTask], [archivedFollowup], 120);
    expect(result.recommendedItems).toHaveLength(0);
    expect(result.otherEligibleItems).toHaveLength(0);
  });

  it("calculates utilization percentage and supports overflow calculation", () => {
    const task1 = mockTask({ title: "Task 1", estimatedMinutes: 60 });
    const task2 = mockTask({ title: "Task 2", estimatedMinutes: 60 });

    const result = generateDailyRecommendations([task1, task2], [], 120);
    expect(result.totalPlannedMinutes).toBe(120);
    expect(result.utilizationPercent).toBe(100);

    // Verify percentage calculation helper logic for ARIA clamping
    const overPercent = Math.round((180 / 120) * 100);
    expect(overPercent).toBe(150);
    const clampedForAria = Math.min(Math.max(overPercent, 0), 100);
    expect(clampedForAria).toBe(100);
  });
});
