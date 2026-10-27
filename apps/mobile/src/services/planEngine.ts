import type { Task } from "../types/task";
import type { FollowUp } from "../types/followup";
import type { DailyPlanItem, PlanRecommendationResult } from "../types/plan";

export interface PlanEngineOptions {
  targetDate?: string;
  defaultTaskMinutes?: number;
  defaultFollowUpMinutes?: number;
}

interface ScoredCandidate {
  item: DailyPlanItem;
  score: number;
}

function getDaysDiff(fromIsoDate: string, toIsoDate: string): number {
  try {
    const fromMs = new Date(fromIsoDate.slice(0, 10) + "T00:00:00.000Z").getTime();
    const toMs = new Date(toIsoDate.slice(0, 10) + "T00:00:00.000Z").getTime();
    return Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function generateDailyRecommendations(
  tasks: Task[],
  followups: FollowUp[],
  availableMinutes: number,
  options: PlanEngineOptions = {}
): PlanRecommendationResult {
  const defaultTaskMins = options.defaultTaskMinutes ?? 30;
  const defaultFollowUpMins = options.defaultFollowUpMinutes ?? 15;
  const targetDate = options.targetDate ?? new Date().toISOString().slice(0, 10);

  const candidates: ScoredCandidate[] = [];

  // 1. Score incomplete tasks
  for (const task of tasks) {
    if (task.completed) continue;

    const estimatedMinutes =
      task.estimatedMinutes && task.estimatedMinutes > 0
        ? task.estimatedMinutes
        : defaultTaskMins;

    let score = 0;
    let reason = "";

    if (task.dueDate) {
      const daysOverdue = getDaysDiff(task.dueDate, targetDate);
      if (daysOverdue > 0) {
        score += 1000 + daysOverdue * 50;
        reason = `Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}`;
      } else if (daysOverdue === 0) {
        score += 500;
        reason = "Due today";
      }
    }

    if (task.priority === "high") {
      score += 200;
      if (reason === "Due today") {
        reason = "High priority and due today";
      } else if (!reason) {
        reason = "High priority task";
      }
    } else if (task.priority === "medium") {
      score += 50;
    } else if (task.priority === "low") {
      score += 10;
    }

    if (!reason) {
      if (estimatedMinutes <= 20) {
        reason = "Quick win fitting remaining time";
      } else {
        reason = "Backlog task ready to tackle";
      }
    }

    candidates.push({
      item: {
        id: "plan_item_" + Math.random().toString(36).substring(2, 10),
        type: "task",
        targetId: task.id,
        title: task.title,
        estimatedMinutes,
        completed: false,
        priority: task.priority,
        dueDate: task.dueDate,
        reason,
        order: 0,
      },
      score,
    });
  }

  // 2. Score open follow-ups
  for (const fu of followups) {
    if (fu.status !== "open") continue;

    const estimatedMinutes = defaultFollowUpMins;
    let score = 0;
    let reason = "";

    const dueDay = fu.dueAt ? fu.dueAt.slice(0, 10) : "";
    if (dueDay) {
      const daysOverdue = getDaysDiff(dueDay, targetDate);
      if (daysOverdue > 0) {
        score += 1000 + daysOverdue * 50;
        reason = `Overdue commitment (${daysOverdue} day${daysOverdue > 1 ? "s" : ""})`;
      } else if (daysOverdue === 0) {
        score += 500;
        reason = "Follow-up commitment due today";
      }
    }

    if (!reason) {
      reason = "Scheduled follow-up commitment";
    }

    candidates.push({
      item: {
        id: "plan_item_" + Math.random().toString(36).substring(2, 10),
        type: "followup",
        targetId: fu.id,
        title: `${fu.personName}: ${fu.commitment}`,
        estimatedMinutes,
        completed: false,
        dueDate: fu.dueAt,
        reason,
        order: 0,
      },
      score,
    });
  }

  // 3. Sort candidates: score descending, then estimated minutes ascending, then title
  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const aMins = a.item.estimatedMinutes || defaultTaskMins;
    const bMins = b.item.estimatedMinutes || defaultTaskMins;
    if (aMins !== bMins) {
      return aMins - bMins;
    }
    return a.item.title.localeCompare(b.item.title);
  });

  // 4. Greedy knapsack packing
  const recommendedItems: DailyPlanItem[] = [];
  const overflowItems: DailyPlanItem[] = [];
  let consumedMinutes = 0;

  for (const cand of candidates) {
    const itemMins = cand.item.estimatedMinutes || defaultTaskMins;
    if (consumedMinutes + itemMins <= availableMinutes) {
      recommendedItems.push({
        ...cand.item,
        order: recommendedItems.length,
      });
      consumedMinutes += itemMins;
    } else {
      overflowItems.push(cand.item);
    }
  }

  return {
    recommendedItems,
    totalEstimatedMinutes: consumedMinutes,
    availableMinutes,
    remainingMinutes: Math.max(0, availableMinutes - consumedMinutes),
    overflowItems,
  };
}
