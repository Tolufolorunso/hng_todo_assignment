"use client";

import { useRef, useState } from "react";
import {
  NOTE_BODY_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  validateNoteInput,
} from "@/lib/validation";
import type { Note } from "@/types/note";

interface NoteEditorProps {
  note: Note | null;
  disabled: boolean;
  onSave: (values: { title: string; body: string }) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}

const ERROR_ID = "note-title-error";

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function focusFieldFor(error: string): "title" | "body" {
  return error.startsWith("Body") ? "body" : "title";
}

export default function NoteEditor({
  note,
  disabled,
  onSave,
  onDelete,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"title" | "body" | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateNoteInput({ title, body });
    if (!validation.ok) {
      const field = focusFieldFor(validation.error);
      setError(validation.error);
      setErrorField(field);
      (field === "title" ? titleRef : bodyRef).current?.focus();
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

  async function handleDelete() {
    setDeleting(true);
    const deleted = await onDelete();
    setDeleting(false);
    if (!deleted) {
      setConfirming(false);
    }
  }

  const busy = disabled || saving || deleting;

  return (
    <section
      aria-label={note === null ? "New note" : "Edit note"}
      className="flex min-h-[320px] flex-col rounded-card border border-border bg-surface"
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col" noValidate>
        <div className="px-5 pt-5">
          <label htmlFor="note-title" className="sr-only">
            Note title
          </label>
          <input
            id="note-title"
            ref={titleRef}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={NOTE_TITLE_MAX_LENGTH}
            placeholder="Note title"
            aria-invalid={errorField === "title"}
            aria-describedby={errorField === "title" ? ERROR_ID : undefined}
            className="w-full border-none bg-transparent text-xl font-semibold tracking-tight text-text outline-none placeholder:text-faint"
          />
          {note !== null && (
            <p className="mt-1 font-mono text-xs text-faint">
              Created {formatStamp(note.createdAt)}, updated {formatStamp(note.updatedAt)}
            </p>
          )}
        </div>

        <label htmlFor="note-body" className="sr-only">
          Note body
        </label>
        <textarea
          id="note-body"
          ref={bodyRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={NOTE_BODY_MAX_LENGTH}
          placeholder="Write your note..."
          aria-invalid={errorField === "body"}
          aria-describedby={errorField === "body" ? ERROR_ID : undefined}
          className="flex-1 resize-none border-none bg-transparent px-5 py-4 text-sm leading-relaxed text-text outline-none placeholder:text-faint"
        />

        {error !== null && (
          <p id={ERROR_ID} role="alert" className="px-5 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-border px-5 py-3">
          {confirming ? (
            <>
              <p className="mr-auto text-sm text-danger">Delete this note?</p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="rounded-control bg-danger px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="rounded-control border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:border-border-strong disabled:opacity-60"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="mr-auto text-xs text-muted">
                {saving ? "Saving..." : "Changes are saved with Save"}
              </span>
              {note !== null && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={disabled}
                  className="rounded-control border border-border bg-surface px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-soft hover:border-danger disabled:opacity-60"
                >
                  Delete
                </button>
              )}
              <button
                type="submit"
                disabled={busy}
                className="rounded-control bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {saving ? "Saving..." : note === null ? "Create note" : "Save"}
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
