import type { Task } from "@/types/task";
import type { FollowUp } from "@/types/followup";
import type { DailyPlan, DailyPlanItem, RecommendationEngineResult } from "@/types/plan";

export interface PlanEngineOptions {
  defaultTaskMinutes?: number;
  defaultFollowUpMinutes?: number;
  targetDate?: string;
  previousPlan?: DailyPlan | null;
}

interface ScoredCandidate {
  item: DailyPlanItem;
  score: number;
  reason: string;
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
): RecommendationEngineResult {
  const defaultTaskMins = options.defaultTaskMinutes ?? 30;
  const defaultFollowUpMins = options.defaultFollowUpMinutes ?? 15;
  const targetDate = options.targetDate ?? new Date().toISOString().slice(0, 10);
  const previousUnfinishedTargetIds = new Set<string>();

  if (options.previousPlan) {
    for (const item of options.previousPlan.items) {
      if (!item.completed) {
        previousUnfinishedTargetIds.add(item.targetId);
      }
    }
  }

  const candidates: ScoredCandidate[] = [];

  // Evaluate incomplete tasks
  for (const task of tasks) {
    if (task.completed) {
      continue;
    }

    const estimatedMinutes =
      task.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : defaultTaskMins;
    let score = 0;
    let primaryReason = "";

    const isUnfinishedPrior = previousUnfinishedTargetIds.has(task.id);
    if (isUnfinishedPrior) {
      score += 150;
    }

    if (task.dueDate) {
      const daysOverdue = getDaysDiff(task.dueDate, targetDate);
      if (daysOverdue > 0) {
        score += 1000 + daysOverdue * 50;
        primaryReason = `Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}`;
      } else if (daysOverdue === 0) {
        score += 500;
        primaryReason = "Due today";
      }
    }

    if (task.priority === "high") {
      score += 200;
      if (primaryReason === "Due today") {
        primaryReason = "High priority and due today";
      } else if (!primaryReason) {
        primaryReason = "High priority task";
      }
    } else if (task.priority === "medium") {
      score += 50;
    } else if (task.priority === "low") {
      score += 10;
    }

    if (!primaryReason) {
      if (isUnfinishedPrior) {
        primaryReason = "Unfinished from previous plan";
      } else if (estimatedMinutes <= 20) {
        primaryReason = "Quick win fitting remaining time";
      } else {
        primaryReason = "Backlog task ready to tackle";
      }
    }

    candidates.push({
      item: {
        id: crypto.randomUUID(),
        type: "task",
        targetId: task.id,
        title: task.title,
        estimatedMinutes,
        completed: false,
        recommendationReason: primaryReason,
        order: 0,
      },
      score,
      reason: primaryReason,
    });
  }

  // Evaluate open follow-ups
  for (const followup of followups) {
    if (followup.status !== "open") {
      continue;
    }

    const estimatedMinutes = defaultFollowUpMins;
    let score = 0;
    let primaryReason = "";

    const isUnfinishedPrior = previousUnfinishedTargetIds.has(followup.id);
    if (isUnfinishedPrior) {
      score += 150;
    }

    const dueDay = followup.dueAt ? followup.dueAt.slice(0, 10) : "";
    if (dueDay) {
      const daysOverdue = getDaysDiff(dueDay, targetDate);
      if (daysOverdue > 0) {
        score += 1000 + daysOverdue * 50;
        primaryReason = `Overdue commitment (${daysOverdue} day${daysOverdue > 1 ? "s" : ""})`;
      } else if (daysOverdue === 0) {
        score += 500;
        primaryReason = "Follow-up commitment due today";
      }
    }

    if (!primaryReason) {
      if (isUnfinishedPrior) {
        primaryReason = "Unfinished commitment from previous plan";
      } else {
        primaryReason = "Scheduled follow-up commitment";
      }
    }

    candidates.push({
      item: {
        id: crypto.randomUUID(),
        type: "followup",
        targetId: followup.id,
        title: `${followup.personName}: ${followup.commitment}`,
        estimatedMinutes,
        completed: false,
        recommendationReason: primaryReason,
        order: 0,
      },
      score,
      reason: primaryReason,
    });
  }

  // Sort candidates deterministically: highest score first, then smallest estimate, then alphabetical title
  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.item.estimatedMinutes !== b.item.estimatedMinutes) {
      return a.item.estimatedMinutes - b.item.estimatedMinutes;
    }
    return a.item.title.localeCompare(b.item.title);
  });

  const recommendedItems: DailyPlanItem[] = [];
  const otherEligibleItems: DailyPlanItem[] = [];
  let remainingCapacity = Math.max(0, availableMinutes);

  for (const candidate of candidates) {
    if (candidate.item.estimatedMinutes <= remainingCapacity) {
      candidate.item.order = recommendedItems.length;
      recommendedItems.push(candidate.item);
      remainingCapacity -= candidate.item.estimatedMinutes;
    } else {
      otherEligibleItems.push(candidate.item);
    }
  }

  const totalPlannedMinutes = recommendedItems.reduce((acc, it) => acc + it.estimatedMinutes, 0);
  const utilizationPercent =
    availableMinutes > 0
      ? Math.min(100, Math.round((totalPlannedMinutes / availableMinutes) * 100))
      : 0;

  return {
    recommendedItems,
    otherEligibleItems,
    totalPlannedMinutes,
    availableMinutes,
    utilizationPercent,
  };
}
