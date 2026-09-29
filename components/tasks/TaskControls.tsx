"use client";

import type { TaskCategoryFilter, TaskSortKey, TaskStatusFilter } from "@/lib/tasks";

interface TaskControlsProps {
  query: string;
  status: TaskStatusFilter;
  category: TaskCategoryFilter;
  sort: TaskSortKey;
  disabled: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: TaskStatusFilter) => void;
  onCategoryChange: (value: TaskCategoryFilter) => void;
  onSortChange: (value: TaskSortKey) => void;
}

const STATUS_OPTIONS: { value: TaskStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

const CATEGORY_OPTIONS: { value: TaskCategoryFilter; label: string; dotClass?: string }[] = [
  { value: "all", label: "All" },
  { value: "work", label: "Work", dotClass: "bg-sky-400" },
  { value: "personal", label: "Personal", dotClass: "bg-purple-400" },
  { value: "urgent", label: "Urgent", dotClass: "bg-rose-400" },
  { value: "study", label: "Study", dotClass: "bg-emerald-400" },
  { value: "ideas", label: "Ideas", dotClass: "bg-amber-400" },
];

export default function TaskControls({
  query,
  status,
  category,
  sort,
  disabled,
  onQueryChange,
  onStatusChange,
  onCategoryChange,
  onSortChange,
}: TaskControlsProps) {
  return (
    <div className="sticky top-16 z-10 -mx-1 flex flex-col gap-2.5 border-b border-border/80 bg-bg/90 px-1 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-[11rem] flex-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
          <label htmlFor="task-search" className="sr-only">
            Search tasks
          </label>
          <input
            id="task-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by title or description..."
            autoComplete="off"
            className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-xs text-text outline-none placeholder:text-faint transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Segment */}
          <div
            role="group"
            aria-label="Filter by status"
            className="inline-flex gap-1 rounded-xl border border-border bg-surface-muted/70 p-1"
          >
            {STATUS_OPTIONS.map((option) => {
              const isSelected = status === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={() => onStatusChange(option.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-60 ${
                    isSelected
                      ? "border border-border/60 bg-surface text-text shadow-sm"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Sort Select */}
          <label htmlFor="task-sort" className="sr-only">
            Sort tasks
          </label>
          <div className="relative">
            <select
              id="task-sort"
              value={sort}
              onChange={(event) => onSortChange(event.target.value as TaskSortKey)}
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
            >
              <option value="created">Sort: Newest</option>
              <option value="manual">Sort: Custom</option>
              <option value="dueDate">Sort: Due date</option>
              <option value="priority">Sort: Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div
        role="group"
        aria-label="Filter by category"
        className="flex flex-wrap items-center gap-1.5 overflow-x-auto"
      >
        <span className="mr-1 text-[11px] font-medium text-faint">Category:</span>
        {CATEGORY_OPTIONS.map((option) => {
          const isSelected = category === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onCategoryChange(option.value)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all disabled:opacity-60 ${
                isSelected
                  ? "border border-accent/40 bg-accent/15 text-accent shadow-sm"
                  : "border border-border/60 bg-surface/80 text-muted hover:border-border-strong hover:text-text"
              }`}
            >
              {option.dotClass && (
                <span className={`h-1.5 w-1.5 rounded-full ${option.dotClass}`} aria-hidden="true" />
              )}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
