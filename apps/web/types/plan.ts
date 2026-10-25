export type DailyPlanItemType = "task" | "followup";

export interface DailyPlanItem {
  id: string;
  type: DailyPlanItemType;
  targetId: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  recommendationReason?: string | null;
  order: number;
}

export interface DailyPlan {
  id: string;
  date: string;
  timeZone: string;
  availableMinutes: number;
  items: DailyPlanItem[];
  acceptedAt: string | null;
  workspaceId?: string;
  revision?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPlanInput {
  date: string;
  timeZone?: string;
  availableMinutes: number;
  items: DailyPlanItem[];
  acceptedAt?: string | null;
}

export interface PlanRecommendation {
  item: DailyPlanItem;
  score: number;
  reason: string;
  fitsCapacity: boolean;
}

export interface RecommendationEngineResult {
  recommendedItems: DailyPlanItem[];
  otherEligibleItems: DailyPlanItem[];
  totalPlannedMinutes: number;
  availableMinutes: number;
  utilizationPercent: number;
}
