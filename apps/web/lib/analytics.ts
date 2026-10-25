import { isOverdue } from "@/lib/tasks";
import type { Task, TaskCategory, TaskPriority } from "@/types/task";

export interface AnalyticsSummary {
  total: number;
  completed: number;
  active: number;
  completionRate: number; // 0 - 100
  overdue: number;
  dueToday: number;
  highPriorityActive: number;
  productivityScore: number; // 0 - 100
  productivityRating: "Peak Focus" | "On Track" | "Steady" | "Action Needed";
}

export interface CategoryMetric {
  category: TaskCategory | "unassigned";
  label: string;
  total: number;
  completed: number;
  active: number;
  percentageOfTotal: number;
  completionRate: number;
}

export interface PriorityMetric {
  priority: TaskPriority;
  label: string;
  total: number;
  completed: number;
  active: number;
  percentageOfTotal: number;
}

export interface VelocityDay {
  isoDate: string; // YYYY-MM-DD
  dayLabel: string; // Mon, Tue, etc.
  completedCount: number;
}

export interface ScheduleHealth {
  overdue: number;
  dueToday: number;
  dueUpcoming: number;
  unscheduled: number;
}

export const CATEGORY_LABELS: Record<TaskCategory | "unassigned", string> = {
  work: "Work",
  personal: "Personal",
  urgent: "Urgent",
  study: "Study",
  ideas: "Ideas",
  unassigned: "Unassigned",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function computeSummary(tasks: Task[], todayIso: string): AnalyticsSummary {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const active = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const overdue = tasks.filter((t) => isOverdue(t, todayIso)).length;
  const dueToday = tasks.filter((t) => !t.completed && t.dueDate === todayIso).length;
  const highPriorityActive = tasks.filter(
    (t) => !t.completed && t.priority === "high",
  ).length;

  // Productivity score calculation (0 - 100)
  let score = 100;
  if (total > 0) {
    score = completionRate;
    if (overdue > 0) {
      score = Math.max(0, score - Math.min(30, overdue * 10));
    }
    if (highPriorityActive > 2) {
      score = Math.max(0, score - Math.min(15, (highPriorityActive - 2) * 5));
    }
  }

  let productivityRating: AnalyticsSummary["productivityRating"] = "Steady";
  if (score >= 85) {
    productivityRating = "Peak Focus";
  } else if (score >= 65) {
    productivityRating = "On Track";
  } else if (score >= 40) {
    productivityRating = "Steady";
  } else {
    productivityRating = "Action Needed";
  }

  return {
    total,
    completed,
    active,
    completionRate,
    overdue,
    dueToday,
    highPriorityActive,
    productivityScore: score,
    productivityRating,
  };
}

export function computeCategoryMetrics(tasks: Task[]): CategoryMetric[] {
  const total = tasks.length;
  const categories: (TaskCategory | "unassigned")[] = [
    "work",
    "personal",
    "urgent",
    "study",
    "ideas",
    "unassigned",
  ];

  return categories.map((cat) => {
    const matched = tasks.filter((t) =>
      cat === "unassigned" ? t.category === null || t.category === undefined : t.category === cat,
    );
    const catTotal = matched.length;
    const catCompleted = matched.filter((t) => t.completed).length;
    const catActive = catTotal - catCompleted;
    const percentageOfTotal = total > 0 ? Math.round((catTotal / total) * 100) : 0;
    const completionRate = catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0;

    return {
      category: cat,
      label: CATEGORY_LABELS[cat],
      total: catTotal,
      completed: catCompleted,
      active: catActive,
      percentageOfTotal,
      completionRate,
    };
  });
}

export function computePriorityMetrics(tasks: Task[]): PriorityMetric[] {
  const total = tasks.length;
  const priorities: TaskPriority[] = ["high", "medium", "low"];

  return priorities.map((priority) => {
    const matched = tasks.filter((t) => t.priority === priority);
    const pTotal = matched.length;
    const pCompleted = matched.filter((t) => t.completed).length;
    const pActive = pTotal - pCompleted;
    const percentageOfTotal = total > 0 ? Math.round((pTotal / total) * 100) : 0;

    return {
      priority,
      label: PRIORITY_LABELS[priority],
      total: pTotal,
      completed: pCompleted,
      active: pActive,
      percentageOfTotal,
    };
  });
}

export function computeVelocity(tasks: Task[], todayIso: string): VelocityDay[] {
  const [year, month, day] = todayIso.split("-").map(Number);
  const anchorDate = new Date(Date.UTC(year, month - 1, day));
  const velocity: VelocityDay[] = [];

  // 7 days ending at anchorDate (from 6 days ago up to today)
  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(anchorDate);
    targetDate.setUTCDate(anchorDate.getUTCDate() - i);

    const y = targetDate.getUTCFullYear();
    const m = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(targetDate.getUTCDate()).padStart(2, "0");
    const isoDate = `${y}-${m}-${d}`;

    const dayLabel = targetDate.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    });

    const completedCount = tasks.filter((task) => {
      if (!task.completed) return false;
      const stamp = task.completedAt || task.updatedAt;
      return stamp.startsWith(isoDate);
    }).length;

    velocity.push({
      isoDate,
      dayLabel,
      completedCount,
    });
  }

  return velocity;
}

export function computeScheduleHealth(tasks: Task[], todayIso: string): ScheduleHealth {
  let overdue = 0;
  let dueToday = 0;
  let dueUpcoming = 0;
  let unscheduled = 0;

  for (const t of tasks) {
    if (t.completed) continue;

    if (t.dueDate === null) {
      unscheduled++;
    } else if (t.dueDate < todayIso) {
      overdue++;
    } else if (t.dueDate === todayIso) {
      dueToday++;
    } else {
      dueUpcoming++;
    }
  }

  return {
    overdue,
    dueToday,
    dueUpcoming,
    unscheduled,
  };
}
