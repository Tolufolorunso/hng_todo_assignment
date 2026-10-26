import React, { useState, useEffect } from "react";
import type { TaskRepository } from "../storage/taskRepository.js";
import type { FollowUpRepository } from "../storage/followUpRepository.js";
import type { DailyPlanRepository } from "../storage/dailyPlanRepository.js";
import type { DailyPlan, DailyPlanItem } from "../types/plan.js";
import { generateDailyRecommendations } from "../services/planEngine.js";
import { TouchButton, Badge, EmptyState } from "../components/primitives.js";
import { useTheme } from "../services/theme.js";

export interface PlanScreenProps {
  taskRepo: TaskRepository;
  followUpRepo: FollowUpRepository;
  dailyPlanRepo: DailyPlanRepository;
}

const CAPACITY_PRESETS = [60, 120, 180, 240, 360, 480];

export function PlanScreen({
  taskRepo,
  followUpRepo,
  dailyPlanRepo,
}: PlanScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const today = new Date().toISOString().slice(0, 10);

  const [availableMinutes, setAvailableMinutes] = useState(240);
  const [existingPlan, setExistingPlan] = useState<DailyPlan | null>(null);
  const [recommendedItems, setRecommendedItems] = useState<DailyPlanItem[]>([]);
  const [overflowItems, setOverflowItems] = useState<DailyPlanItem[]>([]);
  const [totalEstimatedMinutes, setTotalEstimatedMinutes] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadCurrentPlan = async () => {
    setLoading(true);
    try {
      const plan = await dailyPlanRepo.getByDate(today);
      if (plan && plan.acceptedAt) {
        setExistingPlan(plan);
        setAvailableMinutes(plan.availableMinutes);
      } else {
        setExistingPlan(null);
        await generatePlan(availableMinutes);
      }
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async (minutes: number) => {
    const tasks = await taskRepo.list();
    const followups = await followUpRepo.list();
    const result = generateDailyRecommendations(tasks, followups, minutes, { targetDate: today });
    setRecommendedItems(result.recommendedItems);
    setOverflowItems(result.overflowItems);
    setTotalEstimatedMinutes(result.totalEstimatedMinutes);
  };

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const handleCapacityChange = async (mins: number) => {
    setAvailableMinutes(mins);
    if (!existingPlan?.acceptedAt) {
      await generatePlan(mins);
    }
  };

  const handleAcceptPlan = async () => {
    const plan = await dailyPlanRepo.save({
      localDate: today,
      timeZone: "UTC",
      availableMinutes,
      items: recommendedItems,
      acceptedAt: new Date().toISOString(),
    });
    setExistingPlan(plan);
  };

  const handleToggleItem = async (itemId: string) => {
    if (!existingPlan) return;
    const updated = await dailyPlanRepo.toggleItem(existingPlan.id, itemId);
    setExistingPlan(updated);
  };

  const handleResetPlan = async () => {
    if (existingPlan) {
      await dailyPlanRepo.delete(existingPlan.id);
      setExistingPlan(null);
      await generatePlan(availableMinutes);
    }
  };

  return (
    <div
      role="region"
      aria-label="Plan My Day screen"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: colors.background,
        color: colors.textPrimary,
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Plan My Day</h1>
          <div style={{ fontSize: "13px", color: colors.textMuted, marginTop: "2px" }}>{today}</div>
        </div>
        {existingPlan?.acceptedAt && (
          <TouchButton label="Replan" onPress={handleResetPlan} variant="secondary" />
        )}
      </div>

      {/* Available Time Selector */}
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.surfaceBorder}`,
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
          Target Capacity: {availableMinutes} min ({Math.round((availableMinutes / 60) * 10) / 10}h)
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {CAPACITY_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={!!existingPlan?.acceptedAt}
              onClick={() => handleCapacityChange(preset)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${availableMinutes === preset ? colors.accent : colors.surfaceBorder}`,
                backgroundColor: availableMinutes === preset ? colors.accent : "transparent",
                color: availableMinutes === preset ? "#ffffff" : colors.textPrimary,
                fontSize: "13px",
                fontWeight: 600,
                cursor: existingPlan?.acceptedAt ? "not-allowed" : "pointer",
                minHeight: "44px",
              }}
            >
              {preset}m
            </button>
          ))}
        </div>
      </div>

      {/* Display Active Checklist if Plan Accepted */}
      {existingPlan?.acceptedAt ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "15px", fontWeight: 600 }}>Active Daily Checklist</span>
            <Badge label="Plan Accepted" variant="low" />
          </div>

          {existingPlan.items.length === 0 ? (
            <EmptyState title="No items in today's plan" description="You have completed all items!" />
          ) : (
            existingPlan.items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleItem(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.surfaceBorder}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  minHeight: "48px",
                }}
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => handleToggleItem(item.id)}
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      textDecoration: item.completed ? "line-through" : "none",
                      color: item.completed ? colors.textMuted : colors.textPrimary,
                      fontWeight: 500,
                    }}
                  >
                    {item.title}
                  </div>
                  {item.reason && (
                    <div style={{ fontSize: "12px", color: colors.textMuted }}>{item.reason}</div>
                  )}
                </div>
                {item.estimatedMinutes && (
                  <Badge label={`${item.estimatedMinutes}m`} variant="neutral" />
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Recommended items preview before acceptance */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "15px", fontWeight: 600 }}>
              Recommended: {totalEstimatedMinutes} / {availableMinutes} min
            </span>
            <TouchButton
              label="Accept Daily Plan"
              onPress={handleAcceptPlan}
              variant="primary"
              disabled={recommendedItems.length === 0}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "24px", color: colors.textMuted }}>
              Calculating capacity plan...
            </div>
          ) : recommendedItems.length === 0 ? (
            <EmptyState
              title="No tasks to plan"
              description="All caught up! Add tasks or follow ups to generate a plan."
            />
          ) : (
            recommendedItems.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "12px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.surfaceBorder}`,
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: colors.textPrimary }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: "12px", color: colors.accent, marginTop: "2px" }}>
                    {item.reason}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <Badge label={item.type} variant="category" />
                  <Badge label={`${item.estimatedMinutes}m`} variant="neutral" />
                </div>
              </div>
            ))
          )}

          {overflowItems.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: colors.textMuted, marginBottom: "8px" }}>
                Overflow ({overflowItems.length} items exceeding {availableMinutes}m capacity)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {overflowItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${colors.surfaceBorder}`,
                      borderRadius: "6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      opacity: 0.7,
                    }}
                  >
                    <span style={{ fontSize: "13px", color: colors.textMuted }}>{item.title}</span>
                    <Badge label={`${item.estimatedMinutes}m`} variant="neutral" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
