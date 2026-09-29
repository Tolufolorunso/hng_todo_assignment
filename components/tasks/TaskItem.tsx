"use client";

import { useState } from "react";
import TaskEditForm from "@/components/tasks/TaskEditForm";
import { isOverdue } from "@/lib/tasks";
import type { Task, TaskPriority } from "@/types/task";

interface TaskItemProps {
  task: Task;
  todayIso: string;
  disabled: boolean;
  onToggle: (task: Task, completed: boolean) => void;
  onUpdate: (
    task: Task,
    patch: {
      title: string;
      description: string;
      priority: TaskPriority;
      dueDate: string | null;
    },
  ) => Promise<boolean>;
  onDelete: (task: Task) => Promise<boolean>;
}

type Mode = "view" | "edit" | "confirmDelete";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  low: "bg-prio-low-bg text-prio-low",
  medium: "bg-prio-medium-bg text-prio-medium",
  high: "bg-prio-high-bg text-prio-high",
};

function formatDue(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function TaskItem({
  task,
  todayIso,
  disabled,
  onToggle,
  onUpdate,
  onDelete,
}: TaskItemProps) {
  const [mode, setMode] = useState<Mode>("view");
  const checkboxId = `task-${task.id}`;
  const overdue = isOverdue(task, todayIso);

  if (mode === "edit") {
    return (
      <li className="rounded-card border border-border bg-surface p-4">
        <TaskEditForm
          task={task}
          disabled={disabled}
          onSave={async (patch) => {
            const saved = await onUpdate(task, patch);
            if (saved) {
              setMode("view");
            }
            return saved;
          }}
          onCancel={() => setMode("view")}
        />
      </li>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <li className="flex flex-wrap items-center gap-3 rounded-card border border-danger bg-danger-soft px-4 py-3">
        <p className="min-w-0 flex-1 text-sm text-danger">
          Delete this task?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={async () => {
              const deleted = await onDelete(task);
              if (!deleted) {
                setMode("view");
              }
            }}
            className="rounded-control bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
          >
            Delete
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode("view")}
            className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:border-border-strong disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 rounded-card border border-border bg-surface px-4 py-3">
      <input
        id={checkboxId}
        type="checkbox"
        checked={task.completed}
        disabled={disabled}
        onChange={(event) => onToggle(task, event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={checkboxId}
          className={
            task.completed
              ? "cursor-pointer text-sm text-muted line-through"
              : "cursor-pointer text-sm text-text"
          }
        >
          {task.title}
        </label>
        {task.description !== "" && (
          <p
            className={
              task.completed
                ? "mt-1 text-sm text-faint"
                : "mt-1 text-sm text-muted"
            }
          >
            {task.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_CLASS[task.priority]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {PRIORITY_LABEL[task.priority]}
          </span>
          {task.dueDate !== null &&
            (overdue ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 font-mono text-xs font-semibold text-danger">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                </svg>
                Overdue, {formatDue(task.dueDate)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-muted">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" />
                </svg>
                {formatDue(task.dueDate)}
              </span>
            ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setMode("edit")}
        disabled={disabled}
        aria-label={`Edit ${task.title}`}
        className="rounded-control border border-transparent p-1.5 text-faint transition-colors hover:border-border hover:bg-surface-muted hover:text-text disabled:opacity-60"
      >
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
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setMode("confirmDelete")}
        disabled={disabled}
        aria-label={`Delete ${task.title}`}
        className="rounded-control border border-transparent p-1.5 text-faint transition-colors hover:border-border hover:bg-surface-muted hover:text-danger disabled:opacity-60"
      >
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
        >
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        </svg>
      </button>
    </li>
  );
}
