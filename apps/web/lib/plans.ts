import { getDb } from "@/lib/db";
import type { DailyPlan, DailyPlanInput, DailyPlanItem } from "@/types/plan";
import { updateTask } from "@/lib/tasks";
import { completeFollowUp, getFollowUp } from "@/lib/followups";
import {
  getActiveWorkspaceId,
  getDailyPlanByDate as repoGetDailyPlanByDate,
  upsertDailyPlan as repoUpsertDailyPlan,
  listDailyPlans as repoListDailyPlans,
} from "@/lib/repository";

export class DailyPlanNotFoundError extends Error {
  constructor(idOrDate: string) {
    super(`Daily plan not found: ${idOrDate}`);
    this.name = "DailyPlanNotFoundError";
  }
}

function now(): string {
  return new Date().toISOString();
}

export function getDefaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function createDailyPlan(input: DailyPlanInput): Promise<DailyPlan> {
  const workspaceId = getActiveWorkspaceId();
  return repoUpsertDailyPlan(input, { workspaceId });
}

export async function getDailyPlan(id: string): Promise<DailyPlan | null> {
  const workspaceId = getActiveWorkspaceId();
  const db = await getDb();
  const plan = await db.get("daily_plans", id);
  if (!plan || (plan.workspaceId && plan.workspaceId !== workspaceId)) {
    return null;
  }
  return plan;
}

export async function getDailyPlanByDate(date: string): Promise<DailyPlan | null> {
  const workspaceId = getActiveWorkspaceId();
  return repoGetDailyPlanByDate(date, { workspaceId });
}

export async function saveDailyPlan(plan: DailyPlan): Promise<DailyPlan> {
  const workspaceId = getActiveWorkspaceId();
  return repoUpsertDailyPlan(plan, { workspaceId });
}

export async function updateDailyPlan(
  id: string,
  patch: Partial<Omit<DailyPlan, "id" | "createdAt">>,
): Promise<DailyPlan> {
  const existing = await getDailyPlan(id);
  if (!existing) {
    throw new DailyPlanNotFoundError(id);
  }

  const workspaceId = getActiveWorkspaceId();
  return repoUpsertDailyPlan(
    {
      ...existing,
      ...patch,
      date: patch.date ?? existing.date,
      availableMinutes: patch.availableMinutes ?? existing.availableMinutes,
      items: patch.items ?? existing.items,
    },
    { workspaceId }
  );
}

export async function acceptDailyPlan(id: string): Promise<DailyPlan> {
  const timestamp = now();
  return updateDailyPlan(id, {
    acceptedAt: timestamp,
  });
}

export async function deleteDailyPlan(id: string): Promise<void> {
  const workspaceId = getActiveWorkspaceId();
  const db = await getDb();
  const existing = await getDailyPlan(id);
  if (existing) {
    const tx = db.transaction(["daily_plans", "outbox", "tombstones"], "readwrite");
    await tx.objectStore("daily_plans").delete(id);
    if (workspaceId !== "local") {
      tx.objectStore("outbox").put({
        mutationId: `mut_${crypto.randomUUID()}`,
        workspaceId,
        protocolVersion: 1,
        entityType: "plan",
        entityId: id,
        action: "delete",
        baseRevision: null,
        payload: null,
        createdAt: now(),
        retryCount: 0,
      });
      tx.objectStore("tombstones").put({
        id: `tomb_${crypto.randomUUID()}`,
        workspaceId,
        entityType: "plan",
        entityId: id,
        deletedAt: now(),
      });
    }
    await tx.done;
  }
}

export async function listDailyPlans(): Promise<DailyPlan[]> {
  const workspaceId = getActiveWorkspaceId();
  const plans = await repoListDailyPlans({ workspaceId });
  return plans.sort((a, b) => b.date.localeCompare(a.date));
}

export async function togglePlanItemCompletion(
  planId: string,
  itemId: string,
  forceCompleted?: boolean,
): Promise<DailyPlan> {
  const plan = await getDailyPlan(planId);
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
  };

  return saveDailyPlan(updatedPlan);
}
