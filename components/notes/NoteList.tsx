"use client";

import type { Note } from "@/types/note";

type Status = "loading" | "ready" | "error";

interface NoteListProps {
  notes: Note[];
  totalCount: number;
  status: Status;
  query: string;
  selectedId: string | null;
  disabled: boolean;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onClearSearch: () => void;
  onNew: () => void;
}

function excerpt(body: string): string {
  const firstLine = body.trim().split("\n")[0] ?? "";
  return firstLine;
}

export default function NoteList({
  notes,
  totalCount,
  status,
  query,
  selectedId,
  disabled,
  onQueryChange,
  onSelect,
  onClearSearch,
  onNew,
}: NoteListProps) {
  const hasQuery = query.trim() !== "";

  return (
    <section
      aria-label="Notes list"
      className="flex min-h-0 flex-col gap-3 md:max-h-[calc(100vh-8rem)]"
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-text">Notes</h1>
        <button
          type="button"
          onClick={onNew}
          disabled={disabled}
          className="rounded-control bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          New note
        </button>
      </div>

      <div className="relative">
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
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <label htmlFor="note-search" className="sr-only">
          Search notes
        </label>
        <input
          id="note-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search notes"
          autoComplete="off"
          className="w-full rounded-control border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      {status === "loading" && (
        <p role="status" className="text-sm text-muted">
          Loading notes...
        </p>
      )}

      {status === "ready" && totalCount === 0 && (
        <div className="rounded-card border border-border bg-surface p-6 text-center">
          <p className="text-sm font-medium text-text">No notes yet</p>
          <p className="mt-1 text-sm text-muted">
            Create a note to keep context next to your tasks.
          </p>
        </div>
      )}

      {status === "ready" && totalCount > 0 && notes.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-6 text-center">
          <p className="text-sm font-medium text-text">
            No notes match &ldquo;{query.trim()}&rdquo;
          </p>
          <button
            type="button"
            onClick={onClearSearch}
            className="mt-3 rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-border-strong"
          >
            Clear search
          </button>
        </div>
      )}

      {status === "ready" && notes.length > 0 && (
        <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
          {notes.map((note) => {
            const selected = note.id === selectedId;
            return (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onSelect(note.id)}
                  disabled={disabled}
                  aria-current={selected ? "true" : undefined}
                  className={`w-full rounded-control border px-3 py-2 text-left transition-colors disabled:opacity-60 ${
                    selected
                      ? "border-accent bg-surface shadow-[inset_3px_0_0_0_var(--accent)]"
                      : "border-transparent hover:bg-surface-muted"
                  }`}
                >
                  <span
                    className={`block truncate text-sm ${
                      selected ? "font-semibold text-text" : "font-medium text-text"
                    }`}
                  >
                    {note.title}
                  </span>
                  {excerpt(note.body) !== "" && (
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {excerpt(note.body)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {status === "ready" && hasQuery && notes.length > 0 && (
        <p className="text-xs text-faint">
          {notes.length} of {totalCount} notes
        </p>
      )}
    </section>
  );
}
