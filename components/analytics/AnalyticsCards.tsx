"use client";

import type {
  AnalyticsSummary,
  CategoryMetric,
  PriorityMetric,
  ScheduleHealth,
  VelocityDay,
} from "@/lib/analytics";
import type { TaskCategory, TaskPriority } from "@/types/task";

const CATEGORY_COLORS: Record<TaskCategory | "unassigned", { bg: string; bar: string; text: string }> = {
  work: { bg: "bg-sky-500/10", bar: "bg-sky-400", text: "text-sky-400" },
  personal: { bg: "bg-purple-500/10", bar: "bg-purple-400", text: "text-purple-400" },
  urgent: { bg: "bg-rose-500/10", bar: "bg-rose-400", text: "text-rose-400" },
  study: { bg: "bg-emerald-500/10", bar: "bg-emerald-400", text: "text-emerald-400" },
  ideas: { bg: "bg-amber-500/10", bar: "bg-amber-400", text: "text-amber-400" },
  unassigned: { bg: "bg-surface-muted", bar: "bg-muted", text: "text-muted" },
};

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; bar: string; text: string }> = {
  high: { bg: "bg-danger-soft", bar: "bg-danger", text: "text-danger" },
  medium: { bg: "bg-warning-soft", bar: "bg-warning", text: "text-warning" },
  low: { bg: "bg-surface-muted", bar: "bg-muted", text: "text-muted" },
};

export function HeroHealthCard({ summary }: { summary: AnalyticsSummary }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (summary.completionRate / 100) * circumference;

  const ratingBadgeClass =
    summary.productivityRating === "Peak Focus"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : summary.productivityRating === "On Track"
      ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
      : summary.productivityRating === "Steady"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-rose-500/15 text-rose-400 border-rose-500/30";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-6 shadow-card transition-all">
      <div className="absolute right-0 top-0 -mr-10 -mt-10 h-36 w-36 rounded-full bg-accent-soft/40 blur-2xl" />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Productivity Health
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ratingBadgeClass}`}
            >
              {summary.productivityRating}
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text">
            {summary.completionRate}% Tasks Completed
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {summary.total === 0
              ? "No tasks in your workspace yet. Create tasks to unlock velocity metrics."
              : summary.overdue > 0
              ? `You have ${summary.overdue} overdue ${
                  summary.overdue === 1 ? "task" : "tasks"
                } requiring immediate focus.`
              : summary.active === 0
              ? "All tasks cleared. Exceptional productivity momentum!"
              : `${summary.active} tasks in progress with zero overdue deadlines. Great flow!`}
          </p>
        </div>

        {/* Circular SVG Completion Ring Gauge */}
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-surface-muted"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Foreground animated progress ring */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-accent transition-all duration-700 ease-out"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-lg font-bold tracking-tight text-text">
              {summary.completionRate}%
            </span>
            <span className="text-[9px] font-medium uppercase tracking-wider text-faint">
              Done
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuickMetricsGrid({ summary }: { summary: AnalyticsSummary }) {
  const metrics = [
    {
      label: "Total Tasks",
      value: summary.total,
      color: "text-text",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted"
          aria-hidden="true"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      label: "Completed",
      value: summary.completed,
      color: "text-success",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-success"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      label: "In Progress",
      value: summary.active,
      color: "text-accent",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: "Overdue",
      value: summary.overdue,
      color: summary.overdue > 0 ? "text-danger" : "text-text",
      icon: (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={summary.overdue > 0 ? "text-danger" : "text-muted"}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="flex flex-col rounded-2xl border border-border/80 bg-surface p-4 shadow-card transition-all hover:border-border-strong"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted">{m.label}</span>
            {m.icon}
          </div>
          <span className={`mt-2 text-2xl font-bold tracking-tight ${m.color}`}>
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CategoryBreakdownCard({ metrics }: { metrics: CategoryMetric[] }) {
  const activeMetrics = metrics.filter((m) => m.total > 0);

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h3 className="text-sm font-bold tracking-tight text-text">
          Category Distribution
        </h3>
        <span className="text-xs text-muted">
          {activeMetrics.length} active categories
        </span>
      </div>

      {activeMetrics.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">
          No categorized tasks yet. Assign categories to view distributions.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {activeMetrics.map((m) => {
            const colors = CATEGORY_COLORS[m.category];
            return (
              <div key={m.category} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${colors.bar}`}
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-text">{m.label}</span>
                    <span className="text-[11px] text-faint">
                      ({m.percentageOfTotal}%)
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {m.completed}/{m.total} done ({m.completionRate}%)
                  </span>
                </div>
                {/* Progress track */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${colors.bar}`}
                    style={{ width: `${m.completionRate}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PrioritySplitCard({ metrics }: { metrics: PriorityMetric[] }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h3 className="text-sm font-bold tracking-tight text-text">
          Priority Breakdown
        </h3>
        <span className="text-xs text-muted">Urgency splits</span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {metrics.map((m) => {
          const colors = PRIORITY_COLORS[m.priority];
          const completionRate =
            m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;

          return (
            <div key={m.priority} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${colors.bar}`}
                    aria-hidden="true"
                  />
                  <span className="font-semibold text-text">{m.label}</span>
                  <span className="text-[11px] text-faint">
                    ({m.percentageOfTotal}%)
                  </span>
                </div>
                <span className="font-mono text-xs text-muted">
                  {m.completed} done, {m.active} active
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${colors.bar}`}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VelocityChartCard({ velocity }: { velocity: VelocityDay[] }) {
  const maxCount = Math.max(1, ...velocity.map((v) => v.completedCount));

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-text">
            7-Day Completion Velocity
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            Tasks completed day by day over the past week
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-accent">
          {velocity.reduce((sum, v) => sum + v.completedCount, 0)} completed
        </span>
      </div>

      <div className="mt-6 flex h-36 items-end justify-between gap-3 px-2">
        {velocity.map((day) => {
          const heightPercent =
            day.completedCount > 0
              ? Math.max(18, Math.round((day.completedCount / maxCount) * 100))
              : 6;

          return (
            <div
              key={day.isoDate}
              className="flex flex-1 flex-col items-center gap-2"
            >
              {/* Bar count indicator */}
              <span className="font-mono text-[10px] font-semibold text-faint">
                {day.completedCount > 0 ? day.completedCount : ""}
              </span>

              {/* Bar track */}
              <div className="flex h-24 w-full items-end justify-center rounded-lg bg-surface-muted/40 p-1">
                <div
                  className={`w-full rounded-md transition-all duration-500 ${
                    day.completedCount > 0
                      ? "bg-accent hover:bg-accent-hover shadow-sm"
                      : "bg-surface-muted"
                  }`}
                  style={{ height: `${heightPercent}%` }}
                  title={`${day.dayLabel}, ${day.isoDate}: ${day.completedCount} completed`}
                />
              </div>

              {/* Day Label */}
              <span className="text-[11px] font-medium text-muted">
                {day.dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleHealthCard({ health }: { health: ScheduleHealth }) {
  const items = [
    {
      label: "Overdue",
      count: health.overdue,
      badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    },
    {
      label: "Due Today",
      count: health.dueToday,
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    {
      label: "Upcoming",
      count: health.dueUpcoming,
      badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    },
    {
      label: "Unscheduled",
      count: health.unscheduled,
      badge: "bg-surface-muted text-muted border-border/80",
    },
  ];

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h3 className="text-sm font-bold tracking-tight text-text">
          Schedule Health
        </h3>
        <span className="text-xs text-muted">Active task due dates</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-muted/30 p-3"
          >
            <span className="text-xs font-medium text-text">{item.label}</span>
            <span
              className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${item.badge}`}
            >
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
