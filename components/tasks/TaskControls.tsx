"use client";

import type { TaskSortKey, TaskStatusFilter } from "@/lib/tasks";

interface TaskControlsProps {
  query: string;
  status: TaskStatusFilter;
  sort: TaskSortKey;
  disabled: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: TaskStatusFilter) => void;
  onSortChange: (value: TaskSortKey) => void;
}

const STATUS_OPTIONS: { value: TaskStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export default function TaskControls({
  query,
  status,
  sort,
  disabled,
  onQueryChange,
  onStatusChange,
  onSortChange,
}: TaskControlsProps) {
  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-bg/85 py-3 backdrop-blur">
      <div className="relative min-w-[9rem] flex-1">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
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
          placeholder="Search tasks"
          autoComplete="off"
          className="w-full rounded-control border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <div
        role="group"
        aria-label="Filter by status"
        className="inline-flex gap-0.5 rounded-control border border-border bg-surface-muted p-0.5"
      >
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={status === option.value}
            onClick={() => onStatusChange(option.value)}
            className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-60 ${
              status === option.value
                ? "bg-surface text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label htmlFor="task-sort" className="sr-only">
        Sort tasks
      </label>
      <select
        id="task-sort"
        value={sort}
        onChange={(event) => onSortChange(event.target.value as TaskSortKey)}
        className="rounded-control border border-border bg-surface px-2.5 py-2 text-[13px] text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
      >
        <option value="created">Sort: Newest</option>
        <option value="dueDate">Sort: Due date</option>
        <option value="priority">Sort: Priority</option>
      </select>
    </div>
  );
}
