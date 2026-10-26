export interface CategoryCount {
  category: string;
  count: number;
}

export interface PriorityCount {
  priority: string;
  count: number;
}

export interface ProductivityAnalytics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalFollowUps: number;
  completedFollowUps: number;
  reliabilityRate: number;
  tasksByCategory: CategoryCount[];
  tasksByPriority: PriorityCount[];
}
