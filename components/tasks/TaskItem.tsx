"use client";

import { useState } from "react";
import TaskEditForm from "@/components/tasks/TaskEditForm";
import { isOverdue } from "@/lib/tasks";
import type { Task, TaskPriority } from "@/types/task";

interface TaskItemProps {
  task: Task;
  todayIso: string;
  disabled: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLLIElement>, task: Task) => void;
  onDragOver?: (event: React.DragEvent<HTMLLIElement>, task: Task) => void;
  onDragLeave?: (event: React.DragEvent<HTMLLIElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLLIElement>, task: Task) => void;
  onDragEnd?: (event: React.DragEvent<HTMLLIElement>) => void;
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
  low: "bg-prio-low-bg text-prio-low border border-prio-low/20",
  medium: "bg-prio-medium-bg text-prio-medium border border-prio-medium/20",
  high: "bg-prio-high-bg text-prio-high border border-prio-high/20",
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
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onToggle,
  onUpdate,
  onDelete,
}: TaskItemProps) {
  const [mode, setMode] = useState<Mode>("view");
  const checkboxId = `task-${task.id}`;
  const overdue = isOverdue(task, todayIso);

  if (mode === "edit") {
    return (
      <li className="rounded-2xl border border-border bg-surface p-5 shadow-card">
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
      <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/40 bg-danger-soft p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-danger"
            aria-hidden="true"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="min-w-0 flex-1 text-xs font-semibold text-danger">
            Delete &quot;{task.title}&quot;?
          </p>
        </div>
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
            className="rounded-xl bg-danger px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
          >
            Delete
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode("view")}
            className="rounded-xl border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      draggable={!disabled && mode === "view"}
      onDragStart={(event) => onDragStart?.(event, task)}
      onDragOver={(event) => onDragOver?.(event, task)}
      onDragLeave={onDragLeave}
      onDrop={(event) => onDrop?.(event, task)}
      onDragEnd={onDragEnd}
      className={`group relative flex items-start gap-3 rounded-2xl border bg-surface p-4 shadow-card transition-all ${
        isDragging
          ? "opacity-30 scale-[0.99] border-dashed border-accent/60 bg-surface-muted/50"
          : isDragOver
          ? "border-accent ring-2 ring-accent/30 bg-surface-muted/30"
          : "border-border/80 hover:border-border-strong hover:shadow-card-hover"
      }`}
    >
      {/* Drag Grip Handle */}
      <div
        className="flex items-center pt-1 text-faint opacity-35 transition-opacity group-hover:opacity-90 hover:text-text cursor-grab active:cursor-grabbing select-none"
        title="Drag to reorder"
        aria-label={`Drag handle for ${task.title}`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="9" cy="5" r="2" />
          <circle cx="15" cy="5" r="2" />
          <circle cx="9" cy="12" r="2" />
          <circle cx="15" cy="12" r="2" />
          <circle cx="9" cy="19" r="2" />
          <circle cx="15" cy="19" r="2" />
        </svg>
      </div>

      {/* Checkbox */}
      <div className="pt-0.5">
        <input
          id={checkboxId}
          type="checkbox"
          checked={task.completed}
          disabled={disabled}
          onChange={(event) => onToggle(task, event.target.checked)}
          className="h-4 w-4 cursor-pointer rounded-md accent-accent transition-transform active:scale-90"
        />
      </div>

      {/* Task Content */}
      <div className="min-w-0 flex-1">
        <label
          htmlFor={checkboxId}
          className={`cursor-pointer text-sm font-medium transition-colors ${
            task.completed
              ? "text-muted line-through"
              : "text-text hover:text-accent"
          }`}
        >
          {task.title}
        </label>
        {task.description !== "" && (
          <p
            className={`mt-1 text-xs leading-relaxed ${
              task.completed ? "text-faint line-through" : "text-muted"
            }`}
          >
            {task.description}
          </p>
        )}

        {/* Badges */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {/* Priority pill */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${PRIORITY_CLASS[task.priority]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {PRIORITY_LABEL[task.priority]}
          </span>

          {/* Due date badge */}
          {task.dueDate !== null &&
            (overdue ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-danger/30 bg-danger-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-danger">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Overdue, {formatDue(task.dueDate)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-surface-muted/60 px-2 py-0.5 font-mono text-[11px] font-medium text-muted">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {formatDue(task.dueDate)}
              </span>
            ))}
        </div>
      </div>

      {/* Row Actions */}
      <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setMode("edit")}
          disabled={disabled}
          aria-label={`Edit ${task.title}`}
          className="rounded-lg border border-transparent p-1.5 text-faint transition-all hover:border-border hover:bg-surface-muted hover:text-text disabled:opacity-60"
        >
          <svg
            width="14"
            height="14"
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
          className="rounded-lg border border-transparent p-1.5 text-faint transition-all hover:border-danger/30 hover:bg-danger-soft hover:text-danger disabled:opacity-60"
        >
          <svg
            width="14"
            height="14"
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
      </div>
    </li>
  );
}
