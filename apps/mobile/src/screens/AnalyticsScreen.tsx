import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { TaskRepository } from "../storage/taskRepository.js";
import type { FollowUpRepository } from "../storage/followUpRepository.js";
import type { ProductivityAnalytics } from "../types/analytics.js";
import { calculateProductivityAnalytics } from "../services/analytics.js";
import { TouchButton } from "../components/primitives.js";
import { useTheme } from "../services/theme.js";

export interface AnalyticsScreenProps {
  taskRepo: TaskRepository;
  followUpRepo: FollowUpRepository;
}

export function AnalyticsScreen({ taskRepo, followUpRepo }: AnalyticsScreenProps): React.JSX.Element {
  const { mode, colors, toggleTheme } = useTheme();
  const [analytics, setAnalytics] = useState<ProductivityAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tasks, followups] = await Promise.all([
          taskRepo.list(),
          followUpRepo.list(),
        ]);
        const calculated = calculateProductivityAnalytics(tasks, followups);
        setAnalytics(calculated);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      testID="analytics-screen"
    >
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          Productivity Insights
        </Text>
        <TouchButton
          label={mode === "dark" ? "☀ Light Mode" : "🌙 Dark Mode"}
          onPress={toggleTheme}
          variant="secondary"
        />
      </View>

      {loading || !analytics ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading insights...
          </Text>
        </View>
      ) : (
        <View style={styles.metricsContainer}>
          {/* Headline Metric Cards */}
          <View style={styles.headlineCardsRow}>
            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
            >
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                Task Completion
              </Text>
              <Text style={[styles.metricValue, { color: colors.accent }]}>
                {analytics.completionRate}%
              </Text>
              <Text style={[styles.metricSubtext, { color: colors.textSecondary }]}>
                {analytics.completedTasks} of {analytics.totalTasks} tasks done
              </Text>
            </View>

            <View
              style={[
                styles.metricCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
            >
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                Reliability Rate
              </Text>
              <Text style={[styles.metricValue, { color: colors.success }]}>
                {analytics.reliabilityRate}%
              </Text>
              <Text style={[styles.metricSubtext, { color: colors.textSecondary }]}>
                {analytics.completedFollowUps} of {analytics.totalFollowUps} commitments met
              </Text>
            </View>
          </View>

          {/* Category Distribution */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Tasks by Category
            </Text>

            {analytics.tasksByCategory.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No category data recorded.
              </Text>
            ) : (
              <View style={styles.categoryList}>
                {analytics.tasksByCategory.map((cat) => {
                  const percent =
                    analytics.totalTasks > 0
                      ? Math.round((cat.count / analytics.totalTasks) * 100)
                      : 0;
                  return (
                    <View key={cat.category} style={styles.categoryItem}>
                      <View style={styles.categoryHeaderRow}>
                        <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                          {cat.category}
                        </Text>
                        <Text style={[styles.categoryCount, { color: colors.textMuted }]}>
                          {cat.count} ({percent}%)
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.progressBarTrack,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              backgroundColor: colors.accent,
                              width: `${Math.min(100, percent)}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Priority Breakdown */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Priority Breakdown
            </Text>

            <View style={styles.priorityGrid}>
              {analytics.tasksByPriority.map((p) => (
                <View
                  key={p.priority}
                  style={[
                    styles.priorityCol,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfaceBorder,
                    },
                  ]}
                >
                  <Text style={[styles.priorityLabel, { color: colors.textMuted }]}>
                    {p.priority}
                  </Text>
                  <Text style={[styles.priorityCount, { color: colors.textPrimary }]}>
                    {p.count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
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
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  metricsContainer: {
    gap: 16,
  },
  headlineCardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  metricSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
  },
  categoryList: {
    gap: 10,
  },
  categoryItem: {
    gap: 4,
  },
  categoryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryName: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  categoryCount: {
    fontSize: 12,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  priorityGrid: {
    flexDirection: "row",
    gap: 8,
  },
  priorityCol: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  priorityCount: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
  },
});
