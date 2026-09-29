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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="task-edit-title" className="text-xs font-medium text-muted">
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
          className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-text outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="task-edit-description"
          className="text-xs font-medium text-muted"
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
          placeholder="Add details"
          aria-invalid={errorField === "description"}
          aria-describedby={errorField === "description" ? ERROR_ID : undefined}
          className="resize-y rounded-control border border-border bg-surface px-3 py-2 text-sm text-text outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="task-edit-priority"
            className="text-xs font-medium text-muted"
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
            className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="task-edit-due" className="text-xs font-medium text-muted">
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
            className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
      </div>

      {error !== null && (
        <p id={ERROR_ID} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-control bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:border-border-strong disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
