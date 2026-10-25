import { describe, expect, it } from "vitest";
import {
  computeCategoryMetrics,
  computePriorityMetrics,
  computeScheduleHealth,
  computeSummary,
  computeVelocity,
} from "@/lib/analytics";
import type { Task } from "@/types/task";

function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    title: "Test Task",
    description: "",
    completed: false,
    priority: "medium",
    dueDate: null,
    category: null,
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-01T12:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

describe("analytics calculations", () => {
  const todayIso = "2026-10-15";

  describe("computeSummary", () => {
    it("handles empty task list safely", () => {
      const summary = computeSummary([], todayIso);
      expect(summary.total).toBe(0);
      expect(summary.completed).toBe(0);
      expect(summary.active).toBe(0);
      expect(summary.completionRate).toBe(0);
      expect(summary.overdue).toBe(0);
      expect(summary.dueToday).toBe(0);
      expect(summary.highPriorityActive).toBe(0);
      expect(summary.productivityScore).toBe(100);
      expect(summary.productivityRating).toBe("Peak Focus");
    });

    it("computes accurate completion rate and score penalties", () => {
      const tasks = [
        mockTask({ id: "t1", completed: true, dueDate: "2026-10-10" }),
        mockTask({ id: "t2", completed: true, dueDate: "2026-10-11" }),
        mockTask({ id: "t3", completed: false, dueDate: "2026-10-12" }), // overdue
        mockTask({ id: "t4", completed: false, dueDate: "2026-10-15" }), // due today
      ];

      const summary = computeSummary(tasks, todayIso);
      expect(summary.total).toBe(4);
      expect(summary.completed).toBe(2);
      expect(summary.active).toBe(2);
      expect(summary.completionRate).toBe(50);
      expect(summary.overdue).toBe(1);
      expect(summary.dueToday).toBe(1);
      // Base score 50, penalty 10 for 1 overdue -> 40
      expect(summary.productivityScore).toBe(40);
      expect(summary.productivityRating).toBe("Steady");
    });

    it("assigns ratings appropriately based on score thresholds", () => {
      const tasks100 = [mockTask({ completed: true })];
      expect(computeSummary(tasks100, todayIso).productivityRating).toBe("Peak Focus");

      const tasks0 = [mockTask({ completed: false })];
      expect(computeSummary(tasks0, todayIso).productivityRating).toBe("Action Needed");
    });
  });

  describe("computeCategoryMetrics", () => {
    it("groups tasks by curated categories including unassigned", () => {
      const tasks = [
        mockTask({ id: "t1", category: "work", completed: true }),
        mockTask({ id: "t2", category: "work", completed: false }),
        mockTask({ id: "t3", category: "personal", completed: true }),
        mockTask({ id: "t4", category: null, completed: false }),
      ];

      const metrics = computeCategoryMetrics(tasks);
      expect(metrics).toHaveLength(6);

      const work = metrics.find((m) => m.category === "work");
      expect(work?.total).toBe(2);
      expect(work?.completed).toBe(1);
      expect(work?.active).toBe(1);
      expect(work?.percentageOfTotal).toBe(50);
      expect(work?.completionRate).toBe(50);

      const unassigned = metrics.find((m) => m.category === "unassigned");
      expect(unassigned?.total).toBe(1);
      expect(unassigned?.completed).toBe(0);
      expect(unassigned?.active).toBe(1);
      expect(unassigned?.percentageOfTotal).toBe(25);
    });
  });

  describe("computePriorityMetrics", () => {
    it("breaks down tasks across high, medium, and low priorities", () => {
      const tasks = [
        mockTask({ priority: "high", completed: true }),
        mockTask({ priority: "high", completed: false }),
        mockTask({ priority: "medium", completed: true }),
        mockTask({ priority: "low", completed: false }),
      ];

      const metrics = computePriorityMetrics(tasks);
      expect(metrics).toHaveLength(3);

      const high = metrics.find((m) => m.priority === "high");
      expect(high?.total).toBe(2);
      expect(high?.completed).toBe(1);
      expect(high?.active).toBe(1);
      expect(high?.percentageOfTotal).toBe(50);

      const medium = metrics.find((m) => m.priority === "medium");
      expect(medium?.total).toBe(1);
      expect(medium?.percentageOfTotal).toBe(25);
    });
  });

  describe("computeVelocity", () => {
    it("generates 7-day rolling window ending today", () => {
      const tasks = [
        mockTask({
          id: "t1",
          completed: true,
          completedAt: "2026-10-15T09:00:00.000Z", // today
        }),
        mockTask({
          id: "t2",
          completed: true,
          completedAt: "2026-10-14T10:00:00.000Z", // yesterday
        }),
        mockTask({
          id: "t3",
          completed: false, // active, not counted
        }),
      ];

      const velocity = computeVelocity(tasks, todayIso);
      expect(velocity).toHaveLength(7);
      expect(velocity[6].isoDate).toBe("2026-10-15");
      expect(velocity[6].completedCount).toBe(1);

      expect(velocity[5].isoDate).toBe("2026-10-14");
      expect(velocity[5].completedCount).toBe(1);

      expect(velocity[0].isoDate).toBe("2026-10-09");
      expect(velocity[0].completedCount).toBe(0);
    });
  });

  describe("computeScheduleHealth", () => {
    it("categorizes tasks into overdue, dueToday, upcoming, and unscheduled", () => {
      const tasks = [
        mockTask({ id: "t1", completed: false, dueDate: "2026-10-10" }), // overdue
        mockTask({ id: "t2", completed: false, dueDate: "2026-10-15" }), // due today
        mockTask({ id: "t3", completed: false, dueDate: "2026-10-20" }), // upcoming
        mockTask({ id: "t4", completed: false, dueDate: null }), // unscheduled
        mockTask({ id: "t5", completed: true, dueDate: "2026-10-01" }), // completed (ignored)
      ];

      const health = computeScheduleHealth(tasks, todayIso);
      expect(health.overdue).toBe(1);
      expect(health.dueToday).toBe(1);
      expect(health.dueUpcoming).toBe(1);
      expect(health.unscheduled).toBe(1);
    });
  });
});
