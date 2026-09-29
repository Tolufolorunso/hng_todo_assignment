"use client";

import { useRef, useState } from "react";
import { TaskValidationError, createTask } from "@/lib/tasks";
import { TITLE_MAX_LENGTH, validateTaskInput } from "@/lib/validation";
import type { TaskCategory } from "@/types/task";

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
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateTaskInput({ title, category });
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
        category: validation.value.category,
      });
      setTitle("");
      setCategory(null);
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
              <span>Adding...</span>
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

      {/* Category selection chips */}
      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <span className="text-[11px] font-medium text-muted">Category:</span>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Select task category">
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
      </div>

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
