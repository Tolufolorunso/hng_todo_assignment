"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import DayInspector from "@/components/calendar/DayInspector";
import {
  formatMonthYear,
  getCalendarDays,
  getNextMonth,
  getPrevMonth,
  groupTasksByDate,
  type MonthYear,
} from "@/lib/calendar";
import {
  createTask,
  listTasks,
  todayIsoDate,
  updateTask,
} from "@/lib/tasks";
import type { Task } from "@/types/task";

type LoadingStatus = "loading" | "ready" | "error";

export default function CalendarScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [mutationError, setMutationError] = useState<string | null>(null);

  const [todayIso] = useState(() => todayIsoDate());
  const [currentMonth, setCurrentMonth] = useState<MonthYear>(() => {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => todayIsoDate());

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

  const days = useMemo(
    () => getCalendarDays(currentMonth.year, currentMonth.monthIndex, todayIso),
    [currentMonth, todayIso],
  );

  const grouped = useMemo(() => groupTasksByDate(tasks), [tasks]);
  const selectedDateTasks = grouped.byDate[selectedDate] || [];

  function handlePrevMonth() {
    setCurrentMonth((curr) => getPrevMonth(curr.year, curr.monthIndex));
  }

  function handleNextMonth() {
    setCurrentMonth((curr) => getNextMonth(curr.year, curr.monthIndex));
  }

  function handleJumpToday() {
    const now = new Date();
    setCurrentMonth({ year: now.getFullYear(), monthIndex: now.getMonth() });
    setSelectedDate(todayIso);
  }

  async function handleToggleTask(task: Task, completed: boolean) {
    setMutationError(null);
    try {
      await updateTask(task.id, { completed });
      await load();
    } catch {
      setMutationError("Could not update task status. Please try again.");
    }
  }

  async function handleQuickAddTask(title: string, date: string): Promise<boolean> {
    setMutationError(null);
    try {
      await createTask({
        title,
        dueDate: date,
        priority: "medium",
        category: null,
      });
      await load();
      return true;
    } catch {
      setMutationError("Could not schedule task. Please try again.");
      return false;
    }
  }

  async function handleRescheduleTask(
    task: Task,
    newDate: string | null,
  ): Promise<boolean> {
    setMutationError(null);
    try {
      await updateTask(task.id, { dueDate: newDate });
      await load();
      return true;
    } catch {
      setMutationError("Could not reschedule task. Please try again.");
      return false;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar Navigation & Month Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface p-4 shadow-card">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-text">
            {formatMonthYear(currentMonth.year, currentMonth.monthIndex)}
          </h2>
          <button
            type="button"
            onClick={handleJumpToday}
            className="rounded-lg border border-border/80 bg-surface-muted/60 px-2.5 py-1 text-xs font-semibold text-text transition-all hover:border-border-strong hover:bg-surface-muted"
          >
            Today
          </button>
        </div>

        {/* Previous / Next Month Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-all hover:border-border-strong hover:text-text"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-muted transition-all hover:border-border-strong hover:text-text"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {mutationError !== null && (
        <div
          role="alert"
          className="rounded-xl border border-danger/40 bg-danger-soft p-3.5 text-xs text-danger"
        >
          {mutationError}
        </div>
      )}

      {status === "loading" ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted">
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Loading schedule...
        </div>
      ) : status === "error" ? (
        <div
          role="alert"
          className="rounded-2xl border border-danger/40 bg-danger-soft p-8 text-center text-sm text-danger"
        >
          Could not load tasks from database. Please reload the page.
        </div>
      ) : (
        /* Responsive 2-Column Workspace Grid */
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Main 7-Column Calendar Grid (8 cols on desktop) */}
          <div className="lg:col-span-8">
            <CalendarGrid
              days={days}
              tasksByDate={grouped.byDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

          {/* Right Day Detail Inspector (4 cols on desktop) */}
          <div className="lg:col-span-4">
            <DayInspector
              selectedDate={selectedDate}
              tasks={selectedDateTasks}
              unscheduledTasks={grouped.unscheduled}
              todayIso={todayIso}
              onToggleTask={handleToggleTask}
              onQuickAddTask={handleQuickAddTask}
              onRescheduleTask={handleRescheduleTask}
            />
          </div>
        </div>
      )}
    </div>
  );
}
