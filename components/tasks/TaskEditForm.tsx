"use client";

import { useEffect, useRef, useState } from "react";
import WysiwygEditor from "@/components/notes/WysiwygEditor";
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  validateTaskInput,
} from "@/lib/validation";
import type { Task, TaskCategory, TaskPriority } from "@/types/task";

interface TaskEditFormProps {
  task: Task;
  disabled: boolean;
  onSave: (patch: {
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate: string | null;
    category?: TaskCategory | null;
  }) => Promise<boolean>;
  onCancel: () => void;
}

const ERROR_ID = "task-edit-error";

function focusFieldFor(
  error: string,
): "title" | "description" | "priority" | "dueDate" | "category" {
  if (error.startsWith("Description")) {
    return "description";
  }
  if (error.startsWith("Priority")) {
    return "priority";
  }
  if (error.startsWith("Due date")) {
    return "dueDate";
  }
  if (error.startsWith("Category")) {
    return "category";
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
  const [category, setCategory] = useState<TaskCategory | null>(task.category ?? null);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<
    "title" | "description" | "priority" | "dueDate" | "category" | null
  >(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const priorityRef = useRef<HTMLSelectElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateTaskInput({ title, description, priority, dueDate, category });
    if (!validation.ok) {
      const field = focusFieldFor(validation.error);
      setError(validation.error);
      setErrorField(field);
      if (field === "title") titleRef.current?.focus();
      else if (field === "priority") priorityRef.current?.focus();
      else if (field === "dueDate") dueDateRef.current?.focus();
      else if (field === "category") categoryRef.current?.focus();
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
          Description (Microsoft Word-style Rich Text)
        </label>
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
          <WysiwygEditor
            value={description}
            onChange={setDescription}
            disabled={busy}
            placeholder="Add details, context, lists, or notes... Format with the ribbon above."
            ariaLabel="Task description rich text editor"
            ariaInvalid={errorField === "description"}
            ariaDescribedBy={errorField === "description" ? ERROR_ID : undefined}
            maxLength={DESCRIPTION_MAX_LENGTH}
          />
        </div>
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

        <div className="flex flex-col gap-1">
          <label
            htmlFor="task-edit-category"
            className="text-xs font-semibold text-muted"
          >
            Category
          </label>
          <select
            id="task-edit-category"
            ref={categoryRef}
            value={category ?? ""}
            onChange={(event) =>
              setCategory((event.target.value as TaskCategory) || null)
            }
            aria-invalid={errorField === "category"}
            aria-describedby={errorField === "category" ? ERROR_ID : undefined}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
          >
            <option value="">No Category</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="urgent">Urgent</option>
            <option value="study">Study</option>
            <option value="ideas">Ideas</option>
          </select>
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
