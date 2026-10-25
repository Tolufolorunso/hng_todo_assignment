"use client";

import Link from "next/link";
import { createExcerpt } from "@/lib/html";
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
      className="flex min-h-0 flex-col gap-3.5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          All Notes ({totalCount})
        </span>
        <button
          type="button"
          onClick={onNew}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent-hover px-3.5 py-1.5 text-xs font-semibold text-accent-ink shadow-sm transition-all hover:brightness-105 active:scale-95 disabled:opacity-60"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Note
        </button>
      </div>

      <div className="relative">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
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
          placeholder="Search notes..."
          autoComplete="off"
          className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-xs text-text outline-none placeholder:text-faint transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      {status === "loading" && (
        <div className="flex items-center gap-2 py-4 text-xs text-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Loading notes...
        </div>
      )}

      {status === "ready" && totalCount === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center">
          <p className="text-xs font-semibold text-text">No notes yet</p>
          <p className="mt-1 text-xs text-muted">
            Create a note to keep thoughts and context alongside your tasks.
          </p>
        </div>
      )}

      {status === "ready" && totalCount > 0 && notes.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
          <p className="text-xs font-semibold text-text">
            No notes match &ldquo;{query.trim()}&rdquo;
          </p>
          <button
            type="button"
            onClick={onClearSearch}
            className="mt-3 rounded-xl border border-border bg-surface px-3 py-1 text-xs font-semibold text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted"
          >
            Clear search
          </button>
        </div>
      )}

      {status === "ready" && notes.length > 0 && (
        <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
          {notes.map((note) => {
            const selected = note.id === selectedId;
            return (
              <li key={note.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(note.id)}
                  disabled={disabled}
                  aria-current={selected ? "true" : undefined}
                  className={`w-full rounded-xl border p-3.5 pr-11 text-left transition-all disabled:opacity-60 ${
                    selected
                      ? "border-accent/80 bg-surface shadow-card ring-1 ring-accent/30"
                      : "border-border/70 bg-surface hover:border-border-strong hover:bg-surface-muted/50"
                  }`}
                >
                  <span
                    className={`block truncate text-sm ${
                      selected ? "font-bold text-accent" : "font-semibold text-text"
                    }`}
                  >
                    {note.title}
                  </span>
                  {createExcerpt(note.body, 120) !== "" && (
                    <span className="mt-1 block truncate text-xs text-muted">
                      {createExcerpt(note.body, 120)}
                    </span>
                  )}
                </button>
                <Link
                  href={`/notes/${note.id}`}
                  title="Open standalone document view"
                  aria-label={`Open standalone document view for ${note.title}`}
                  className="absolute right-2.5 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-surface/90 text-muted opacity-80 shadow-xs transition-all hover:border-accent/60 hover:bg-accent-soft hover:text-accent hover:opacity-100 group-hover:opacity-100 focus:opacity-100"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {status === "ready" && hasQuery && notes.length > 0 && (
        <p className="text-[11px] text-faint">
          Showing {notes.length} of {totalCount} notes
        </p>
      )}
    </section>
  );
}
