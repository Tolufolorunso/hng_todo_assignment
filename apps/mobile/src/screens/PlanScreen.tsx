import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { TaskRepository } from "../storage/taskRepository";
import type { FollowUpRepository } from "../storage/followUpRepository";
import type { DailyPlanRepository } from "../storage/dailyPlanRepository";
import type { DailyPlan, DailyPlanItem } from "../types/plan";
import { generateDailyRecommendations } from "../services/planEngine";
import { TouchButton, Badge, EmptyState } from "../components/primitives";
import { useTheme } from "../services/theme";

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

  const generatePlan = async (minutes: number) => {
    const tasks = await taskRepo.list();
    const followups = await followUpRepo.list();
    const result = generateDailyRecommendations(tasks, followups, minutes, { targetDate: today });
    setRecommendedItems(result.recommendedItems);
    setOverflowItems(result.overflowItems);
    setTotalEstimatedMinutes(result.totalEstimatedMinutes);
  };

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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      testID="plan-screen"
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
            Plan My Day
          </Text>
          <Text style={[styles.dateSubtitle, { color: colors.textMuted }]}>
            {today}
          </Text>
        </View>
        {existingPlan?.acceptedAt ? (
          <TouchButton label="Replan" onPress={handleResetPlan} variant="secondary" />
        ) : null}
      </View>

      {/* Available Time Selector */}
      <View
        style={[
          styles.capacityCard,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}
      >
        <Text style={[styles.capacityTitle, { color: colors.textPrimary }]}>
          Target Capacity: {availableMinutes} min ({Math.round((availableMinutes / 60) * 10) / 10}h)
        </Text>
        <View style={styles.presetsRow}>
          {CAPACITY_PRESETS.map((preset) => {
            const isSelected = availableMinutes === preset;
            const isDisabled = !!existingPlan?.acceptedAt;
            return (
              <Pressable
                key={preset}
                disabled={isDisabled}
                onPress={() => handleCapacityChange(preset)}
                accessibilityRole="button"
                accessibilityLabel={`${preset} minutes`}
                style={[
                  styles.presetChip,
                  {
                    borderColor: isSelected ? colors.accent : colors.surfaceBorder,
                    backgroundColor: isSelected ? colors.accent : "transparent",
                    opacity: isDisabled ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    { color: isSelected ? "#ffffff" : colors.textPrimary },
                  ]}
                >
                  {preset}m
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Display Active Checklist if Plan Accepted */}
      {existingPlan?.acceptedAt ? (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Active Daily Checklist
            </Text>
            <Badge label="Plan Accepted" variant="low" />
          </View>

          {existingPlan.items.length === 0 ? (
            <EmptyState
              title="No items in today's plan"
              description="You have completed all items for today!"
            />
          ) : (
            existingPlan.items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleToggleItem(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.completed }}
                accessibilityLabel={item.title}
                style={[
                  styles.checklistItem,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                ]}
              >
                <View
                  style={[
                    styles.checkboxIndicator,
                    {
                      borderColor: item.completed ? colors.accent : colors.surfaceBorder,
                      backgroundColor: item.completed ? colors.accent : "transparent",
                    },
                  ]}
                >
                  {item.completed ? (
                    <Text style={styles.checkboxCheck}>✓</Text>
                  ) : null}
                </View>

                <View style={styles.itemMainContent}>
                  <Text
                    style={[
                      styles.itemTitle,
                      {
                        color: item.completed ? colors.textMuted : colors.textPrimary,
                        textDecorationLine: item.completed ? "line-through" : "none",
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.reason ? (
                    <Text style={[styles.itemReason, { color: colors.textMuted }]}>
                      {item.reason}
                    </Text>
                  ) : null}
                </View>

                {item.estimatedMinutes ? (
                  <Badge label={`${item.estimatedMinutes}m`} variant="neutral" />
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      ) : (
        /* Recommended items preview before acceptance */
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Recommended: {totalEstimatedMinutes} / {availableMinutes} min
            </Text>
            <TouchButton
              label="Accept Daily Plan"
              onPress={handleAcceptPlan}
              variant="primary"
              disabled={recommendedItems.length === 0}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Calculating capacity recommendations...
              </Text>
            </View>
          ) : recommendedItems.length === 0 ? (
            <EmptyState
              title="No tasks to plan"
              description="All caught up! Add tasks or follow ups to generate a plan."
            />
          ) : (
            recommendedItems.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.recommendedCard,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                ]}
              >
                <View style={styles.itemMainContent}>
                  <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                    {item.title}
                  </Text>
                  {item.reason ? (
                    <Text style={[styles.itemReason, { color: colors.accent }]}>
                      {item.reason}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.badgesRow}>
                  <Badge label={item.type} variant="category" />
                  <Badge label={`${item.estimatedMinutes}m`} variant="neutral" />
                </View>
              </View>
            ))
          )}

          {overflowItems.length > 0 ? (
            <View style={styles.overflowContainer}>
              <Text style={[styles.overflowTitle, { color: colors.textMuted }]}>
                Overflow ({overflowItems.length} items exceeding {availableMinutes}m capacity)
              </Text>
              <View style={styles.overflowList}>
                {overflowItems.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.overflowCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.surfaceBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.overflowItemTitle, { color: colors.textMuted }]}>
                      {item.title}
                    </Text>
                    <Badge label={`${item.estimatedMinutes}m`} variant="neutral" />
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  dateSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  capacityCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  capacityTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionContainer: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    gap: 12,
  },
  checkboxIndicator: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxCheck: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  itemMainContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  itemReason: {
    fontSize: 12,
    marginTop: 2,
  },
  recommendedCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  overflowContainer: {
    marginTop: 16,
    gap: 8,
  },
  overflowTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  overflowList: {
    gap: 8,
  },
  overflowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    opacity: 0.75,
  },
  overflowItemTitle: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
});
