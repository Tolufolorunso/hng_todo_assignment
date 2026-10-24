import { getDb } from "@/lib/db";
import type { DailyPlan, DailyPlanInput, DailyPlanItem } from "@/types/plan";
import { updateTask } from "@/lib/tasks";
import { completeFollowUp, getFollowUp } from "@/lib/followups";

export class DailyPlanNotFoundError extends Error {
  constructor(idOrDate: string) {
    super(`Daily plan not found: ${idOrDate}`);
    this.name = "DailyPlanNotFoundError";
  }
}

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export function getDefaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function createDailyPlan(input: DailyPlanInput): Promise<DailyPlan> {
  const db = await getDb();
  const timestamp = now();
  const plan: DailyPlan = {
    id: newId(),
    date: input.date,
    timeZone: input.timeZone || getDefaultTimeZone(),
    availableMinutes: input.availableMinutes,
    items: input.items,
    acceptedAt: input.acceptedAt ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.put("daily_plans", plan);
  return plan;
}

export async function getDailyPlan(id: string): Promise<DailyPlan | null> {
  const db = await getDb();
  const plan = await db.get("daily_plans", id);
  return plan ?? null;
}

export async function getDailyPlanByDate(date: string): Promise<DailyPlan | null> {
  const db = await getDb();
  const index = db.transaction("daily_plans").store.index("date");
  const plan = await index.get(date);
  return plan ?? null;
}

export async function saveDailyPlan(plan: DailyPlan): Promise<DailyPlan> {
  const db = await getDb();
  const updated: DailyPlan = {
    ...plan,
    updatedAt: now(),
  };
  await db.put("daily_plans", updated);
  return updated;
}

export async function updateDailyPlan(
  id: string,
  patch: Partial<Omit<DailyPlan, "id" | "createdAt">>,
): Promise<DailyPlan> {
  const db = await getDb();
  const existing = await db.get("daily_plans", id);
  if (!existing) {
    throw new DailyPlanNotFoundError(id);
  }

  const updated: DailyPlan = {
    ...existing,
    ...patch,
    updatedAt: now(),
  };

  await db.put("daily_plans", updated);
  return updated;
}

export async function acceptDailyPlan(id: string): Promise<DailyPlan> {
  const timestamp = now();
  return updateDailyPlan(id, {
    acceptedAt: timestamp,
  });
}

export async function deleteDailyPlan(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("daily_plans", id);
}

export async function listDailyPlans(): Promise<DailyPlan[]> {
  const db = await getDb();
  const plans = await db.getAll("daily_plans");
  return plans.sort((a, b) => b.date.localeCompare(a.date));
}

export async function togglePlanItemCompletion(
  planId: string,
  itemId: string,
  forceCompleted?: boolean,
): Promise<DailyPlan> {
  const db = await getDb();
  const plan = await db.get("daily_plans", planId);
  if (!plan) {
    throw new DailyPlanNotFoundError(planId);
  }

  const itemIndex = plan.items.findIndex((it) => it.id === itemId);
  if (itemIndex === -1) {
    throw new Error(`Plan item not found: ${itemId}`);
  }

  const currentItem = plan.items[itemIndex];
  const newCompleted = forceCompleted !== undefined ? forceCompleted : !currentItem.completed;

  const updatedItem: DailyPlanItem = {
    ...currentItem,
    completed: newCompleted,
  };

  const updatedItems = [...plan.items];
  updatedItems[itemIndex] = updatedItem;

  // Sync completion state to the underlying task or follow-up
  if (currentItem.type === "task") {
    try {
      await updateTask(currentItem.targetId, { completed: newCompleted });
    } catch {
      // If task was deleted in backlog, keep plan item state intact
    }
  } else if (currentItem.type === "followup") {
    if (newCompleted) {
      try {
        const followUp = await getFollowUp(currentItem.targetId);
        if (followUp && followUp.status === "open") {
          await completeFollowUp(currentItem.targetId);
        }
      } catch {
        // If followup was deleted, keep plan item state intact
      }
    }
  }

  const updatedPlan: DailyPlan = {
    ...plan,
    items: updatedItems,
    updatedAt: now(),
  };

  await db.put("daily_plans", updatedPlan);
  return updatedPlan;
}
