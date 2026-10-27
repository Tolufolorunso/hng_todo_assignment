import { describe, it, expect, beforeEach } from "vitest";
import { generateDailyRecommendations } from "./planEngine";
import { DailyPlanRepository } from "../storage/dailyPlanRepository";
import { InMemorySqliteDatabase } from "../db/driver";
import { runMigrations } from "../db/migrations";
import type { Task } from "../types/task";
import type { FollowUp } from "../types/followup";

describe("planEngine", () => {
  const targetDate = "2026-10-25";

  const sampleTasks: Task[] = [
    {
      id: "t1",
      title: "Overdue critical fix",
      description: "",
      completed: false,
      completedAt: null,
      priority: "high",
      dueDate: "2026-10-23",
      category: "work",
      estimatedMinutes: 45,
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
    {
      id: "t2",
      title: "Today meeting notes",
      description: "",
      completed: false,
      completedAt: null,
      priority: "medium",
      dueDate: "2026-10-25",
      category: "work",
      estimatedMinutes: 30,
      createdAt: "2026-10-24T10:00:00Z",
      updatedAt: "2026-10-24T10:00:00Z",
    },
    {
      id: "t3",
      title: "Quick cleanup",
      description: "",
      completed: false,
      completedAt: null,
      priority: "low",
      dueDate: null,
      category: "work",
      estimatedMinutes: 15,
      createdAt: "2026-10-24T10:00:00Z",
      updatedAt: "2026-10-24T10:00:00Z",
    },
    {
      id: "t4",
      title: "Big research spike",
      description: "",
      completed: false,
      completedAt: null,
      priority: "low",
      dueDate: "2026-10-30",
      category: "work",
      estimatedMinutes: 120,
      createdAt: "2026-10-24T10:00:00Z",
      updatedAt: "2026-10-24T10:00:00Z",
    },
    {
      id: "t5",
      title: "Already done task",
      description: "",
      completed: true,
      completedAt: "2026-10-25T10:00:00Z",
      priority: "high",
      dueDate: "2026-10-25",
      category: "work",
      estimatedMinutes: 30,
      createdAt: "2026-10-24T10:00:00Z",
      updatedAt: "2026-10-24T10:00:00Z",
    },
  ];

  const sampleFollowups: FollowUp[] = [
    {
      id: "fu1",
      personName: "Alice",
      commitment: "Send contract review",
      details: null,
      dueAt: "2026-10-25T14:00:00Z",
      timeZone: "UTC",
      emailAddress: "alice@example.com",
      phoneNumber: null,
      whatsAppNumber: null,
      preferredAction: "email",
      recurrence: null,
      status: "open",
      sourceNoteId: null,
      sourceExcerpt: null,
      createdAt: "2026-10-20T10:00:00Z",
      updatedAt: "2026-10-20T10:00:00Z",
    },
  ];

  it("prioritizes overdue and due-today items within available minutes", () => {
    const result = generateDailyRecommendations(sampleTasks, sampleFollowups, 90, { targetDate });

    expect(result.recommendedItems.length).toBeGreaterThan(0);
    // Highest score should be first: t1 (overdue high priority)
    expect(result.recommendedItems[0].targetId).toBe("t1");
    expect(result.recommendedItems[0].reason).toContain("Overdue");

    // Total estimated minutes should not exceed availableMinutes
    expect(result.totalEstimatedMinutes).toBeLessThanOrEqual(90);
    expect(result.remainingMinutes).toBe(90 - result.totalEstimatedMinutes);
  });

  it("places oversized tasks into overflow when capacity is tight", () => {
    // 50 minutes available: t1 takes 45 mins, others won't fit except maybe follow-up or small items
    const result = generateDailyRecommendations(sampleTasks, sampleFollowups, 50, { targetDate });

    expect(result.recommendedItems.length).toBe(1);
    expect(result.recommendedItems[0].targetId).toBe("t1");
    expect(result.overflowItems.length).toBeGreaterThan(0);
  });

  it("uses default estimates when task estimatedMinutes is missing", () => {
    const taskWithoutEstimate: Task = {
      id: "t_no_est",
      title: "Unestimated task",
      description: "",
      completed: false,
      completedAt: null,
      category: "work",
      priority: "high",
      dueDate: "2026-10-25",
      createdAt: "2026-10-24T10:00:00Z",
      updatedAt: "2026-10-24T10:00:00Z",
    };

    const result = generateDailyRecommendations([taskWithoutEstimate], [], 60, {
      targetDate,
      defaultTaskMinutes: 40,
    });

    expect(result.recommendedItems[0].estimatedMinutes).toBe(40);
  });
});

describe("DailyPlanRepository", () => {
  let db: InMemorySqliteDatabase;
  let repo: DailyPlanRepository;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);
    repo = new DailyPlanRepository(db);
  });

  it("saves, retrieves, and updates a daily plan", async () => {
    const created = await repo.save({
      localDate: "2026-10-25",
      timeZone: "America/New_York",
      availableMinutes: 180,
      items: [
        {
          id: "item_1",
          type: "task",
          title: "Finish report",
          estimatedMinutes: 60,
          completed: false,
        },
      ],
    });

    expect(created.localDate).toBe("2026-10-25");
    expect(created.availableMinutes).toBe(180);
    expect(created.items.length).toBe(1);

    const fetched = await repo.getByDate("2026-10-25");
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.items[0].title).toBe("Finish report");

    // Toggle item completion
    const toggled = await repo.toggleItem(created.id, "item_1");
    expect(toggled.items[0].completed).toBe(true);

    // Accept plan
    const accepted = await repo.acceptPlan(created.id);
    expect(accepted.acceptedAt).toBeDefined();
    expect(accepted.acceptedAt).not.toBeNull();
  });
});
