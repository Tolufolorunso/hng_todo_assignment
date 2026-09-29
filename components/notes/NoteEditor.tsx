"use client";

import { useRef, useState } from "react";
import WysiwygEditor from "@/components/notes/WysiwygEditor";
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateNoteInput({ title, body });
    if (!validation.ok) {
      const field = focusFieldFor(validation.error);
      setError(validation.error);
      setErrorField(field);
      if (field === "title") {
        titleRef.current?.focus();
      }
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
      className="flex min-h-[500px] flex-col rounded-2xl border border-border/80 bg-surface shadow-card transition-all"
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col" noValidate>
        {/* Note Title Input */}
        <div className="border-b border-border/60 px-6 pt-6 pb-4">
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
            placeholder="Note title..."
            aria-invalid={errorField === "title"}
            aria-describedby={errorField === "title" ? ERROR_ID : undefined}
            className="w-full border-none bg-transparent text-xl font-bold tracking-tight text-text outline-none placeholder:text-faint"
          />
          {note !== null && (
            <p className="mt-2 font-mono text-[11px] text-faint">
              Created {formatStamp(note.createdAt)} &bull; Updated {formatStamp(note.updatedAt)}
            </p>
          )}
        </div>

        {/* Note Body Microsoft Word-style WYSIWYG Editor */}
        <div className="flex flex-1 flex-col">
          <WysiwygEditor
            value={body}
            onChange={setBody}
            disabled={busy}
            placeholder="Write your note here... Format text using the ribbon above."
            ariaLabel="Note body rich text editor"
            ariaInvalid={errorField === "body"}
            ariaDescribedBy={errorField === "body" ? ERROR_ID : undefined}
            maxLength={NOTE_BODY_MAX_LENGTH}
          />
        </div>

        {error !== null && (
          <p id={ERROR_ID} role="alert" className="px-6 pb-2 text-xs font-medium text-danger">
            {error}
          </p>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/70 px-6 py-4">
          {confirming ? (
            <div className="flex w-full items-center justify-between gap-3">
              <p className="text-xs font-semibold text-danger">Permanently delete this note?</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-xl bg-danger px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="rounded-xl border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className="text-[11px] text-muted">
                {saving ? "Saving note..." : "Changes persist to IndexedDB"}
              </span>
              <div className="flex items-center gap-2">
                {note !== null && (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    disabled={disabled}
                    className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-danger shadow-sm transition-all hover:border-danger/40 hover:bg-danger-soft disabled:opacity-60"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-gradient-to-r from-accent to-accent-hover px-4 py-1.5 text-xs font-semibold text-accent-ink shadow-sm transition-all hover:brightness-105 active:scale-95 disabled:opacity-60"
                >
                  {saving ? "Saving..." : note === null ? "Create Note" : "Save Note"}
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
