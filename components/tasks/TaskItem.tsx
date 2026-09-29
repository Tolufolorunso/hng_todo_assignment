"use client";

import { useState } from "react";
import TaskEditForm from "@/components/tasks/TaskEditForm";
import { isOverdue } from "@/lib/tasks";
import { stripHtmlToText } from "@/lib/html";
import type { Task, TaskCategory, TaskPriority } from "@/types/task";

interface TaskItemProps {
  task: Task;
  todayIso: string;
  disabled: boolean;
  isDragging?: boolean;
  dropEdge?: "top" | "bottom" | null;
  onDragStart?: (event: React.DragEvent<HTMLLIElement>, task: Task) => void;
  onDragOver?: (event: React.DragEvent<HTMLLIElement>, task: Task) => void;
  onDragLeave?: (event: React.DragEvent<HTMLLIElement>, task: Task) => void;
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
      category?: TaskCategory | null;
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

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  work: "Work",
  personal: "Personal",
  urgent: "Urgent",
  study: "Study",
  ideas: "Ideas",
};

const CATEGORY_CLASS: Record<TaskCategory, string> = {
  work: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  personal: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  urgent: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  study: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  ideas: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
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
  dropEdge = null,
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
  const [expanded, setExpanded] = useState(false);
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
      onDragLeave={(event) => onDragLeave?.(event, task)}
      onDrop={(event) => onDrop?.(event, task)}
      onDragEnd={onDragEnd}
      className={`group relative flex items-start gap-3 rounded-2xl border bg-surface p-4 shadow-card transition-all ${
        isDragging
          ? "opacity-30 scale-[0.99] border-dashed border-accent/60 bg-surface-muted/50"
          : dropEdge
          ? "border-accent/40 bg-surface-muted/20"
          : "border-border/80 hover:border-border-strong hover:shadow-card-hover"
      }`}
    >
      {/* In-between insertion indicator for TOP edge */}
      {dropEdge === "top" && (
        <div
          className="pointer-events-none absolute -top-1.5 left-0 right-0 z-20 flex items-center"
          aria-hidden="true"
        >
          <div className="h-2.5 w-2.5 -ml-1 rounded-full bg-accent ring-2 ring-surface shadow-[0_0_8px_var(--color-accent)]" />
          <div className="h-1 flex-1 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
          <div className="h-2.5 w-2.5 -mr-1 rounded-full bg-accent ring-2 ring-surface shadow-[0_0_8px_var(--color-accent)]" />
        </div>
      )}

      {/* In-between insertion indicator for BOTTOM edge */}
      {dropEdge === "bottom" && (
        <div
          className="pointer-events-none absolute -bottom-1.5 left-0 right-0 z-20 flex items-center"
          aria-hidden="true"
        >
          <div className="h-2.5 w-2.5 -ml-1 rounded-full bg-accent ring-2 ring-surface shadow-[0_0_8px_var(--color-accent)]" />
          <div className="h-1 flex-1 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
          <div className="h-2.5 w-2.5 -mr-1 rounded-full bg-accent ring-2 ring-surface shadow-[0_0_8px_var(--color-accent)]" />
        </div>
      )}
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
        {task.description !== "" && (() => {
          const hasHtml = /<[a-z][\s\S]*>/i.test(task.description);
          const plain = stripHtmlToText(task.description);
          const isLong = plain.length > 180;

          return (
            <div className="mt-1.5">
              <div
                className={`text-xs leading-relaxed transition-all
                  [&_h1]:text-sm [&_h1]:font-bold [&_h1]:my-1.5
                  [&_h2]:text-xs [&_h2]:font-bold [&_h2]:my-1
                  [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:my-1
                  [&_b]:font-semibold [&_strong]:font-semibold
                  [&_i]:italic [&_em]:italic
                  [&_u]:underline
                  [&_s]:line-through
                  [&_blockquote]:border-l-2 [&_blockquote]:border-accent/60 [&_blockquote]:pl-2.5 [&_blockquote]:italic [&_blockquote]:my-1
                  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
                  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
                  [&_li]:my-0.5
                  [&_p]:my-1
                  ${task.completed ? "text-faint opacity-60" : "text-muted"}
                  ${isLong && !expanded ? "line-clamp-3 overflow-hidden" : ""}`}
              >
                {hasHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: task.description }} />
                ) : (
                  <p className="whitespace-pre-wrap">{task.description}</p>
                )}
              </div>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1 text-[11px] font-semibold text-accent hover:underline"
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          );
        })()}

        {/* Badges */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {/* Priority pill */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${PRIORITY_CLASS[task.priority]}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {PRIORITY_LABEL[task.priority]}
          </span>

          {/* Category pill */}
          {task.category !== null && task.category !== undefined && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${CATEGORY_CLASS[task.category]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {CATEGORY_LABEL[task.category]}
            </span>
          )}

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
