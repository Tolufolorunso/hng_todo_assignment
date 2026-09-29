"use client";

import { useRef, useState } from "react";
import { TaskValidationError, createTask } from "@/lib/tasks";
import { TITLE_MAX_LENGTH, validateTaskInput } from "@/lib/validation";

interface TaskFormProps {
  onAdded: () => Promise<void>;
  onWriteError: (message: string) => void;
}

const ERROR_ID = "task-title-error";

export default function TaskForm({ onAdded, onWriteError }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateTaskInput({ title });
    if (!validation.ok) {
      setError(validation.error);
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await createTask({ title: validation.value.title });
      setTitle("");
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
      <label htmlFor="task-title" className="text-sm font-medium text-text">
        Add a task
      </label>
      <div className="flex gap-2">
        <input
          id="task-title"
          ref={inputRef}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="What needs doing?"
          aria-invalid={error !== null}
          aria-describedby={error !== null ? ERROR_ID : undefined}
          className="min-w-0 flex-1 rounded-control border border-border bg-surface px-3 py-2 text-sm text-text outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-control bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? "Adding..." : "Add"}
        </button>
      </div>
      {error !== null && (
        <p id={ERROR_ID} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
