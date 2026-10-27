"use client";

import { useRef, useState } from "react";
import WysiwygEditor from "@/components/notes/WysiwygEditor";
import { TaskValidationError, createTask } from "@/lib/tasks";
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  validateTaskInput,
} from "@/lib/validation";
import type { TaskCategory, TaskPriority } from "@/types/task";

interface TaskFormProps {
  onAdded: () => Promise<void>;
  onWriteError: (message: string) => void;
}

const ERROR_ID = "task-title-error";

const CATEGORIES: { value: TaskCategory; label: string; activeClass: string }[] = [
  { value: "work", label: "Work", activeClass: "border-sky-500/40 bg-sky-500/15 text-sky-400" },
  { value: "personal", label: "Personal", activeClass: "border-purple-500/40 bg-purple-500/15 text-purple-400" },
  { value: "urgent", label: "Urgent", activeClass: "border-rose-500/40 bg-rose-500/15 text-rose-400" },
  { value: "study", label: "Study", activeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" },
  { value: "ideas", label: "Ideas", activeClass: "border-amber-500/40 bg-amber-500/15 text-amber-400" },
];

export default function TaskForm({ onAdded, onWriteError }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedMinutes = estimatedMinutes.trim() ? Number(estimatedMinutes.trim()) : null;
    const validation = validateTaskInput({
      title,
      description,
      priority,
      dueDate: dueDate || null,
      category,
      estimatedMinutes: parsedMinutes,
    });
    if (!validation.ok) {
      setError(validation.error);
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await createTask({
        title: validation.value.title,
        description: validation.value.description,
        priority: validation.value.priority,
        dueDate: validation.value.dueDate,
        category: validation.value.category,
        estimatedMinutes: validation.value.estimatedMinutes ?? null,
      });
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setEstimatedMinutes("");
      setCategory(null);
      setShowDetails(false);
      await onAdded();
    } catch (caught) {
      const message =
        caught instanceof TaskValidationError
          ? caught.message
          : "Could not add the task. Please try again.";
      setError(message);
      inputRef.current?.focus();
      if (!(caught instanceof TaskValidationError)) {
        onWriteError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5" noValidate>
      <div className="flex items-center justify-between">
        <label htmlFor="task-title" className="text-xs font-semibold uppercase tracking-wider text-muted">
          Quick Add Task
        </label>
        <span className="text-[11px] text-faint">
          {title.length}/{TITLE_MAX_LENGTH}
        </span>
      </div>

      <div className="flex gap-2.5">
        <div className="relative min-w-0 flex-1">
          <input
            id="task-title"
            ref={inputRef}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={TITLE_MAX_LENGTH}
            placeholder="What needs to get done next?"
            aria-invalid={error !== null}
            aria-describedby={error !== null ? ERROR_ID : undefined}
            className="w-full rounded-xl border border-border bg-surface-muted/50 px-4 py-2.5 text-sm text-text outline-none placeholder:text-faint transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || title.trim() === ""}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent-hover px-5 py-2.5 text-xs font-semibold text-accent-ink shadow-sm transition-all hover:brightness-105 hover:shadow active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          {submitting ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Adding</span>
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add</span>
            </>
          )}
        </button>
      </div>

      {/* Category selection chips & Details toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Select task category">
          <span className="text-[11px] font-medium text-muted mr-1">Category:</span>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                aria-pressed={isSelected}
                disabled={submitting}
                onClick={() => setCategory(isSelected ? null : cat.value)}
                className={`rounded-lg px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                  isSelected
                    ? cat.activeClass
                    : "border border-border/70 bg-surface-muted/50 text-muted hover:border-border-strong hover:text-text"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          disabled={submitting}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
            showDetails
              ? "border border-accent/40 bg-accent/15 text-accent"
              : "border border-border/70 bg-surface-muted/40 text-muted hover:border-border-strong hover:text-text"
          }`}
          aria-expanded={showDetails}
          aria-label="Toggle rich formatted details"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span>{showDetails ? "Hide Details" : "+ Add Details"}</span>
        </button>
      </div>

      {/* Expandable Rich Text Description Editor and Extra Controls */}
      {showDetails && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="task-priority"
                className="text-xs font-semibold text-muted"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                disabled={submitting}
                className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="task-due-date" className="text-xs font-semibold text-muted">
                Due Date
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={submitting}
                className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-text outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="task-estimate"
                className="text-xs font-semibold text-muted"
              >
                Estimate (mins)
              </label>
              <input
                id="task-estimate"
                type="number"
                min={1}
                max={1440}
                placeholder="e.g. 30"
                value={estimatedMinutes}
                onChange={(event) => setEstimatedMinutes(event.target.value)}
                disabled={submitting}
                className="w-24 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-text outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-all focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
            <WysiwygEditor
              value={description}
              onChange={setDescription}
              disabled={submitting}
              placeholder="Add formatted details, lists, headings, or notes. Format with the ribbon above."
              ariaLabel="Task description rich text editor"
              maxLength={DESCRIPTION_MAX_LENGTH}
            />
          </div>
        </div>
      )}

      {error !== null && (
        <p id={ERROR_ID} role="alert" className="flex items-center gap-1 text-xs font-medium text-danger">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </form>
  );
}
