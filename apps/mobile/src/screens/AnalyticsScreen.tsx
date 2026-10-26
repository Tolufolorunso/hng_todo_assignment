import React, { useState, useEffect } from "react";
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
    <div
      role="region"
      aria-label="Productivity Analytics screen"
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
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Productivity Insights</h1>
        <TouchButton
          label={mode === "dark" ? "☀ Light Mode" : "🌙 Dark Mode"}
          onPress={toggleTheme}
          variant="secondary"
        />
      </div>

      {loading || !analytics ? (
        <div style={{ textAlign: "center", padding: "24px", color: colors.textMuted }}>
          Loading insights...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Headline Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ fontSize: "13px", color: colors.textMuted }}>Task Completion</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: colors.accent }}>
                {analytics.completionRate}%
              </div>
              <div style={{ fontSize: "12px", color: colors.textSecondary }}>
                {analytics.completedTasks} of {analytics.totalTasks} tasks done
              </div>
            </div>

            <div
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ fontSize: "13px", color: colors.textMuted }}>Reliability Rate</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: colors.success }}>
                {analytics.reliabilityRate}%
              </div>
              <div style={{ fontSize: "12px", color: colors.textSecondary }}>
                {analytics.completedFollowUps} of {analytics.totalFollowUps} commitments met
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 600 }}>Tasks by Category</div>
            {analytics.tasksByCategory.length === 0 ? (
              <div style={{ fontSize: "13px", color: colors.textMuted }}>No category data</div>
            ) : (
              analytics.tasksByCategory.map((cat) => {
                const percent =
                  analytics.totalTasks > 0
                    ? Math.round((cat.count / analytics.totalTasks) * 100)
                    : 0;
                return (
                  <div key={cat.category} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ textTransform: "capitalize", fontWeight: 500 }}>
                        {cat.category}
                      </span>
                      <span style={{ color: colors.textMuted }}>
                        {cat.count} ({percent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        backgroundColor: colors.background,
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${percent}%`,
                          backgroundColor: colors.accent,
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Priority Breakdown */}
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 600 }}>Priority Breakdown</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {analytics.tasksByPriority.map((p) => (
                <div
                  key={p.priority}
                  style={{
                    backgroundColor: colors.background,
                    border: `1px solid ${colors.surfaceBorder}`,
                    borderRadius: "8px",
                    padding: "10px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "11px", textTransform: "uppercase", color: colors.textMuted }}>
                    {p.priority}
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "2px" }}>
                    {p.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
