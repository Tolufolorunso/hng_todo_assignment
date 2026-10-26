export interface DailyPlanItem {
  id: string;
  type: "task" | "followup";
  targetId?: string;
  title: string;
  estimatedMinutes?: number | null;
  completed: boolean;
  priority?: "low" | "medium" | "high";
  dueDate?: string | null;
  reason?: string;
  order?: number;
}

export interface DailyPlan {
  id: string;
  localDate: string;
  timeZone: string;
  availableMinutes: number;
  items: DailyPlanItem[];
  acceptedAt: string | null;
  updatedAt: string;
}

export interface CreateDailyPlanInput {
  localDate: string;
  timeZone: string;
  availableMinutes: number;
  items: DailyPlanItem[];
  acceptedAt?: string | null;
}

export interface UpdateDailyPlanInput {
  availableMinutes?: number;
  items?: DailyPlanItem[];
  acceptedAt?: string | null;
}

export interface PlanRecommendationResult {
  recommendedItems: DailyPlanItem[];
  totalEstimatedMinutes: number;
  availableMinutes: number;
  remainingMinutes: number;
  overflowItems: DailyPlanItem[];
}
