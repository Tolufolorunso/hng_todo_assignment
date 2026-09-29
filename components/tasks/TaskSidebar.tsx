"use client";

import { useMemo } from "react";
import type { Task } from "@/types/task";
import { isOverdue } from "@/lib/tasks";

interface TaskSidebarProps {
  tasks: Task[];
  todayIso: string;
}

export default function TaskSidebar({ tasks, todayIso }: TaskSidebarProps) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const active = total - completed;
    const overdue = tasks.filter((t) => isOverdue(t, todayIso)).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, active, overdue, percent };
  }, [tasks, todayIso]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, []);

  return (
    <aside
      aria-label="Productivity overview"
      className="flex flex-col gap-5 lg:sticky lg:top-24"
    >
      {/* Date & Welcome Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-5 shadow-card transition-all">
        <div className="absolute right-0 top-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-accent-soft/50 blur-xl" />
        <div className="relative">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            Today
          </span>
          <h2 className="mt-0.5 text-base font-bold tracking-tight text-text">
            {formattedDate}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {stats.total === 0
              ? "No tasks yet. Create one to kick off your day!"
              : stats.active === 0
              ? "All tasks completed! Fantastic job."
              : `${stats.active} ${stats.active === 1 ? "task" : "tasks"} remaining today.`}
          </p>
        </div>

        {/* Progress bar */}
        {stats.total > 0 && (
          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text">Completion</span>
              <span className="font-semibold text-accent">{stats.percent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500 ease-out"
                style={{ width: `${stats.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col rounded-xl border border-border/70 bg-surface p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted">Active</span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-text">
            {stats.active}
          </span>
        </div>

        <div className="flex flex-col rounded-xl border border-border/70 bg-surface p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted">Completed</span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-success">
            {stats.completed}
          </span>
        </div>

        <div className="flex flex-col rounded-xl border border-border/70 bg-surface p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted">Total Tasks</span>
          <span className="mt-1 text-2xl font-bold tracking-tight text-text">
            {stats.total}
          </span>
        </div>

        <div className="flex flex-col rounded-xl border border-border/70 bg-surface p-3.5 shadow-sm">
          <span className="text-[11px] font-medium text-muted">Overdue</span>
          <span
            className={`mt-1 text-2xl font-bold tracking-tight ${
              stats.overdue > 0 ? "text-danger" : "text-text"
            }`}
          >
            {stats.overdue}
          </span>
        </div>
      </div>

      {/* Productivity Tip */}
      <div className="rounded-xl border border-border/60 bg-surface-muted/60 p-4 text-xs text-muted">
        <div className="flex items-center gap-1.5 font-semibold text-text">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          Quick Productivity Tip
        </div>
        <p className="mt-1.5 leading-relaxed text-muted">
          Prioritize tasks as High, Medium, or Low to quickly spot urgent items. Use the status tabs to focus on what needs doing now.
        </p>
      </div>
    </aside>
  );
}
