"use client";

import { useEffect, useRef, useState } from "react";
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  validateTaskInput,
} from "@/lib/validation";
import type { Task, TaskPriority } from "@/types/task";

interface TaskEditFormProps {
  task: Task;
  disabled: boolean;
  onSave: (patch: {
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate: string | null;
  }) => Promise<boolean>;
  onCancel: () => void;
}

const ERROR_ID = "task-edit-error";

function focusFieldFor(error: string): "title" | "description" | "priority" | "dueDate" {
  if (error.startsWith("Description")) {
    return "description";
  }
  if (error.startsWith("Priority")) {
    return "priority";
  }
  if (error.startsWith("Due date")) {
    return "dueDate";
  }
  return "title";
}

export default function TaskEditForm({
  task,
  disabled,
  onSave,
  onCancel,
}: TaskEditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<
    "title" | "description" | "priority" | "dueDate" | null
  >(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const priorityRef = useRef<HTMLSelectElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateTaskInput({ title, description, priority, dueDate });
    if (!validation.ok) {
      const field = focusFieldFor(validation.error);
      setError(validation.error);
      setErrorField(field);
      const refs = {
        title: titleRef,
        description: descriptionRef,
        priority: priorityRef,
        dueDate: dueDateRef,
      };
      refs[field].current?.focus();
      return;
    }

    setError(null);
    setErrorField(null);
    setSaving(true);
    const saved = await onSave(validation.value);
    setSaving(false);
    if (!saved) {
      titleRef.current?.focus();
    }
  }

  const busy = disabled || saving;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="task-edit-title" className="text-xs font-semibold text-muted">
          Title
        </label>
        <input
          id="task-edit-title"
          ref={titleRef}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          aria-invalid={errorField === "title"}
          aria-describedby={errorField === "title" ? ERROR_ID : undefined}
          className="rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-text outline-none placeholder:text-faint transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="task-edit-description"
          className="text-xs font-semibold text-muted"
        >
          Description
        </label>
        <textarea
          id="task-edit-description"
          ref={descriptionRef}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={DESCRIPTION_MAX_LENGTH}
          rows={3}
          placeholder="Add details, context, or notes..."
          aria-invalid={errorField === "description"}
          aria-describedby={errorField === "description" ? ERROR_ID : undefined}
          className="resize-y rounded-xl border border-border bg-surface px-3.5 py-2 text-sm text-text outline-none placeholder:text-faint transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="task-edit-priority"
            className="text-xs font-semibold text-muted"
          >
            Priority
          </label>
          <select
            id="task-edit-priority"
            ref={priorityRef}
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            aria-invalid={errorField === "priority"}
            aria-describedby={errorField === "priority" ? ERROR_ID : undefined}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="task-edit-due" className="text-xs font-semibold text-muted">
            Due date
          </label>
          <input
            id="task-edit-due"
            ref={dueDateRef}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            aria-invalid={errorField === "dueDate"}
            aria-describedby={errorField === "dueDate" ? ERROR_ID : undefined}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-text outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
      </div>

      {error !== null && (
        <p id={ERROR_ID} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-gradient-to-r from-accent to-accent-hover px-4 py-2 text-xs font-semibold text-accent-ink shadow-sm transition-all hover:brightness-105 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
