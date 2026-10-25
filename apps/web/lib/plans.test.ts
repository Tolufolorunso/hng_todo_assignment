import { afterEach, describe, expect, it } from "vitest";
import { deleteDb } from "@/lib/db";
import {
  acceptDailyPlan,
  createDailyPlan,
  deleteDailyPlan,
  getDailyPlan,
  getDailyPlanByDate,
  listDailyPlans,
  saveDailyPlan,
  togglePlanItemCompletion,
  updateDailyPlan,
} from "@/lib/plans";
import { createTask, getTask } from "@/lib/tasks";
import { createFollowUp, getFollowUp } from "@/lib/followups";
import type { DailyPlanItem } from "@/types/plan";

afterEach(async () => {
  await deleteDb();
});

describe("daily plans data layer", () => {
  it("creates and retrieves a daily plan by id and date", async () => {
    const item: DailyPlanItem = {
      id: "item-1",
      type: "task",
      targetId: "task-1",
      title: "Review PR",
      estimatedMinutes: 45,
      completed: false,
      recommendationReason: "High priority",
      order: 0,
    };

    const created = await createDailyPlan({
      date: "2026-10-25",
      availableMinutes: 240,
      items: [item],
    });

    expect(created.id).toBeDefined();
    expect(created.date).toBe("2026-10-25");
    expect(created.availableMinutes).toBe(240);
    expect(created.items).toHaveLength(1);
    expect(created.acceptedAt).toBeNull();

    const byId = await getDailyPlan(created.id);
    expect(byId).toEqual(created);

    const byDate = await getDailyPlanByDate("2026-10-25");
    expect(byDate).toEqual(created);

    const missing = await getDailyPlanByDate("2026-10-26");
    expect(missing).toBeNull();
  });

  it("updates and saves a daily plan", async () => {
    const plan = await createDailyPlan({
      date: "2026-10-25",
      availableMinutes: 180,
      items: [],
    });

    const updated = await updateDailyPlan(plan.id, {
      availableMinutes: 300,
    });

    expect(updated.availableMinutes).toBe(300);

    const reloaded = await getDailyPlan(plan.id);
    expect(reloaded?.availableMinutes).toBe(300);

    const reSaved = await saveDailyPlan({
      ...updated,
      availableMinutes: 360,
    });
    expect(reSaved.availableMinutes).toBe(360);
  });

  it("accepts a daily plan by recording acceptedAt", async () => {
    const plan = await createDailyPlan({
      date: "2026-10-25",
      availableMinutes: 120,
      items: [],
    });
    expect(plan.acceptedAt).toBeNull();

    const accepted = await acceptDailyPlan(plan.id);
    expect(accepted.acceptedAt).not.toBeNull();
  });

  it("deletes a daily plan", async () => {
    const plan = await createDailyPlan({
      date: "2026-10-25",
      availableMinutes: 60,
      items: [],
    });

    await deleteDailyPlan(plan.id);
    const byId = await getDailyPlan(plan.id);
    expect(byId).toBeNull();
  });

  it("lists daily plans sorted by date descending", async () => {
    await createDailyPlan({ date: "2026-10-20", availableMinutes: 120, items: [] });
    await createDailyPlan({ date: "2026-10-25", availableMinutes: 180, items: [] });
    await createDailyPlan({ date: "2026-10-22", availableMinutes: 240, items: [] });

    const list = await listDailyPlans();
    expect(list).toHaveLength(3);
    expect(list[0].date).toBe("2026-10-25");
    expect(list[1].date).toBe("2026-10-22");
    expect(list[2].date).toBe("2026-10-20");
  });

  it("toggles item completion and synchronizes to underlying task", async () => {
    const task = await createTask({
      title: "Finish report",
      priority: "high",
      estimatedMinutes: 60,
    });
    expect(task.completed).toBe(false);

    const plan = await createDailyPlan({
      date: "2026-10-25",
      availableMinutes: 120,
      items: [
        {
          id: "item-task-1",
          type: "task",
          targetId: task.id,
          title: task.title,
          estimatedMinutes: 60,
          completed: false,
          order: 0,
        },
      ],
    });

    const toggled = await togglePlanItemCompletion(plan.id, "item-task-1");
    expect(toggled.items[0].completed).toBe(true);

    const updatedTask = await getTask(task.id);
    expect(updatedTask?.completed).toBe(true);

    // Toggle back
    const toggledBack = await togglePlanItemCompletion(plan.id, "item-task-1");
    expect(toggledBack.items[0].completed).toBe(false);

    const updatedTaskBack = await getTask(task.id);
    expect(updatedTaskBack?.completed).toBe(false);
  });

  it("toggles item completion for a follow-up commitment", async () => {
    const followup = await createFollowUp({
      personName: "Alex",
      commitment: "Send contract draft",
      dueAt: "2026-10-25T10:00:00.000Z",
    });

    const plan = await createDailyPlan({
      date: "2026-10-25",
      availableMinutes: 60,
      items: [
        {
          id: "item-fu-1",
          type: "followup",
          targetId: followup.id,
          title: `${followup.personName}: ${followup.commitment}`,
          estimatedMinutes: 15,
          completed: false,
          order: 0,
        },
      ],
    });

    const toggled = await togglePlanItemCompletion(plan.id, "item-fu-1", true);
    expect(toggled.items[0].completed).toBe(true);

    const updatedFollowup = await getFollowUp(followup.id);
    expect(updatedFollowup?.status).toBe("completed");
  });
});
