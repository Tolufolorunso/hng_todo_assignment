"use client";

import { WEEKDAYS, type CalendarDay } from "@/lib/calendar";
import type { Task, TaskCategory } from "@/types/task";

interface CalendarGridProps {
  days: CalendarDay[];
  tasksByDate: Record<string, Task[]>;
  selectedDate: string | null;
  onSelectDate: (isoDate: string) => void;
}

const CATEGORY_DOT: Record<TaskCategory, string> = {
  work: "bg-sky-400",
  personal: "bg-purple-400",
  urgent: "bg-rose-400",
  study: "bg-emerald-400",
  ideas: "bg-amber-400",
};

export default function CalendarGrid({
  days,
  tasksByDate,
  selectedDate,
  onSelectDate,
}: CalendarGridProps) {
  return (
    <div
      role="grid"
      aria-label="Monthly calendar"
      className="flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-card"
    >
      {/* Weekday Column Headers */}
      <div
        role="row"
        className="grid grid-cols-7 border-b border-border/80 bg-surface-muted/80 text-center py-2.5"
      >
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            role="columnheader"
            className="text-[11px] font-bold uppercase tracking-wider text-muted"
          >
            {weekday}
          </div>
        ))}
      </div>

      {/* Days Grid Cells */}
      <div className="grid grid-cols-7 gap-px bg-border/60">
        {days.map((day) => {
          const dayTasks = tasksByDate[day.isoDate] || [];
          const isSelected = selectedDate === day.isoDate;
          const incompleteCount = dayTasks.filter((t) => !t.completed).length;
          const hasOverdue = day.isPast && incompleteCount > 0;
          const maxVisible = 2;
          const overflowCount = dayTasks.length - maxVisible;

          return (
            <button
              key={day.isoDate}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`${day.isoDate}, ${dayTasks.length} ${
                dayTasks.length === 1 ? "task" : "tasks"
              }`}
              onClick={() => onSelectDate(day.isoDate)}
              className={`group relative flex min-h-[6.5rem] flex-col p-2 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                day.isCurrentMonth
                  ? "bg-surface hover:bg-surface-muted/60"
                  : "bg-surface-muted/30 text-faint"
              } ${
                isSelected
                  ? "ring-2 ring-accent ring-inset bg-accent-soft/20 z-10"
                  : ""
              }`}
            >
              {/* Day Header Row */}
              <div className="flex items-center justify-between gap-1">
                {/* Overdue alert indicator */}
                {hasOverdue ? (
                  <span
                    title={`${incompleteCount} overdue ${
                      incompleteCount === 1 ? "task" : "tasks"
                    }`}
                    className="flex items-center gap-1 rounded bg-danger-soft px-1 py-0.5 text-[9px] font-semibold text-danger"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />
                    {incompleteCount}
                  </span>
                ) : (
                  <span />
                )}

                {/* Day Number */}
                {day.isToday ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white shadow-sm">
                    {day.dayOfMonth}
                  </span>
                ) : (
                  <span
                    className={`text-xs font-semibold ${
                      day.isCurrentMonth ? "text-text" : "text-faint"
                    }`}
                  >
                    {day.dayOfMonth}
                  </span>
                )}
              </div>

              {/* Task Chips Container */}
              <div className="mt-1.5 flex flex-1 flex-col gap-1 overflow-hidden">
                {dayTasks.slice(0, maxVisible).map((task) => {
                  const categoryDot =
                    task.category !== null && task.category !== undefined
                      ? CATEGORY_DOT[task.category]
                      : null;

                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] leading-tight transition-colors ${
                        task.completed
                          ? "border-border/40 bg-surface-muted/50 text-faint line-through"
                          : "border-border/80 bg-surface text-text shadow-xs group-hover:border-border-strong"
                      }`}
                    >
                      {categoryDot ? (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${categoryDot}`}
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            task.completed ? "bg-faint" : "bg-muted"
                          }`}
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate font-medium">{task.title}</span>
                    </div>
                  );
                })}

                {/* Overflow count badge */}
                {overflowCount > 0 && (
                  <span className="self-start text-[9px] font-semibold text-accent">
                    +{overflowCount} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
