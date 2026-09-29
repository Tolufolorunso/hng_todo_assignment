"use client";

import { useState } from "react";
import TaskEditForm from "@/components/tasks/TaskEditForm";
import type { Task } from "@/types/task";

interface TaskItemProps {
  task: Task;
  disabled: boolean;
  onToggle: (task: Task, completed: boolean) => void;
  onUpdate: (
    task: Task,
    patch: { title: string; description: string },
  ) => Promise<boolean>;
  onDelete: (task: Task) => Promise<boolean>;
}

type Mode = "view" | "edit" | "confirmDelete";

export default function TaskItem({
  task,
  disabled,
  onToggle,
  onUpdate,
  onDelete,
}: TaskItemProps) {
  const [mode, setMode] = useState<Mode>("view");
  const checkboxId = `task-${task.id}`;

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
