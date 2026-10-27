import type { Task } from "../types/task";
import type { FollowUp } from "../types/followup";
import type { ProductivityAnalytics, CategoryCount, PriorityCount } from "../types/analytics";

export function calculateProductivityAnalytics(
  tasks: Task[],
  followups: FollowUp[],
  referenceDate = new Date().toISOString().slice(0, 10)
): ProductivityAnalytics {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

  const totalFollowUps = followups.length;
  const completedFollowUps = followups.filter((f) => f.status === "completed").length;
  const reliabilityRate =
    totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 1000) / 10 : 0;

  // Category distribution
  const categoryMap = new Map<string, number>();
  for (const t of tasks) {
    const cat = t.category || "uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  }
  const tasksByCategory: CategoryCount[] = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // Priority distribution
  const priorityMap = new Map<string, number>([
    ["high", 0],
    ["medium", 0],
    ["low", 0],
  ]);
  for (const t of tasks) {
    const p = t.priority || "medium";
    priorityMap.set(p, (priorityMap.get(p) || 0) + 1);
  }
  const tasksByPriority: PriorityCount[] = Array.from(priorityMap.entries()).map(
    ([priority, count]) => ({ priority, count })
  );

  return {
    totalTasks,
    completedTasks,
    completionRate,
    totalFollowUps,
    completedFollowUps,
    reliabilityRate,
    tasksByCategory,
    tasksByPriority,
  };
}
