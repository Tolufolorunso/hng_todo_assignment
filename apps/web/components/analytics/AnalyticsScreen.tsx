"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CategoryBreakdownCard,
  HeroHealthCard,
  PrioritySplitCard,
  QuickMetricsGrid,
  ScheduleHealthCard,
  VelocityChartCard,
} from "@/components/analytics/AnalyticsCards";
import {
  computeCategoryMetrics,
  computePriorityMetrics,
  computeScheduleHealth,
  computeSummary,
  computeVelocity,
} from "@/lib/analytics";
import { listTasks, todayIsoDate } from "@/lib/tasks";
import type { Task } from "@/types/task";

type LoadingStatus = "loading" | "ready" | "error";

export default function AnalyticsScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [todayIso] = useState(() => todayIsoDate());

  const load = useCallback(
    () =>
      listTasks().then(
        (loaded) => {
          setTasks(loaded);
          setStatus("ready");
        },
        () => {
          setStatus("error");
        },
      ),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => computeSummary(tasks, todayIso), [tasks, todayIso]);
  const categoryMetrics = useMemo(() => computeCategoryMetrics(tasks), [tasks]);
  const priorityMetrics = useMemo(() => computePriorityMetrics(tasks), [tasks]);
  const velocity = useMemo(() => computeVelocity(tasks, todayIso), [tasks, todayIso]);
  const scheduleHealth = useMemo(
    () => computeScheduleHealth(tasks, todayIso),
    [tasks, todayIso],
  );

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted">
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        Calculating productivity metrics...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-danger/40 bg-danger-soft p-8 text-center text-sm text-danger"
      >
        Could not load task records from local storage. Please reload the page.
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <h3 className="mt-4 text-base font-bold text-text">No tasks to analyze</h3>
        <p className="mt-1 max-w-sm text-xs text-muted">
          Your analytics dashboard generates insights from your tasks. Create tasks in your workspace to unlock completion rates and category breakdowns.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover"
        >
          Go to Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Hero Health Score */}
      <HeroHealthCard summary={summary} />

      {/* 4-Card Quick Metrics Bar */}
      <QuickMetricsGrid summary={summary} />

      {/* 2-Column Responsive Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Category Breakdown & Velocity */}
        <div className="flex flex-col gap-6">
          <CategoryBreakdownCard metrics={categoryMetrics} />
          <VelocityChartCard velocity={velocity} />
        </div>

        {/* Right Column: Priority Splits & Schedule Health */}
        <div className="flex flex-col gap-6">
          <PrioritySplitCard metrics={priorityMetrics} />
          <ScheduleHealthCard health={scheduleHealth} />
        </div>
      </div>
    </div>
  );
}
