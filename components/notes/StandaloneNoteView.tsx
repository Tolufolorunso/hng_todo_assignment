"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { calculateReadingStats, stripHtmlToText } from "@/lib/html";
import { getNote } from "@/lib/notes";
import type { Note } from "@/types/note";

interface StandaloneNoteViewProps {
  id: string;
}

type Status = "loading" | "ready" | "not_found" | "error";

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function StandaloneNoteView({ id }: StandaloneNoteViewProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    getNote(id)
      .then((found) => {
        if (!active) return;
        if (found === undefined) {
          setStatus("not_found");
        } else {
          setNote(found);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!active) return;
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function handleCopyText() {
    if (!note) return;
    const plain = stripHtmlToText(note.body);
    const content = `${note.title}\n\n${plain}`;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  }

  function handlePrint() {
    window.print();
  }

  if (status === "loading") {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 pb-24 sm:px-6 sm:py-12 sm:pb-12">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <span>Opening document...</span>
        </div>
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-4 w-1/3 animate-pulse rounded-lg bg-surface-muted" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-4 w-4/6 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </main>
    );
  }

  if (status === "not_found") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 pb-24 sm:px-6 sm:py-20 sm:pb-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-muted shadow-sm">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">Note Not Found</h1>
          <p className="mt-1 text-xs text-muted">
            The document you are looking for does not exist or may have been deleted.
          </p>
        </div>
        <Link
          href="/notes"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-ink shadow-sm transition-all hover:brightness-105 active:scale-95"
        >
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
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          Return to Notes
        </Link>
      </main>
    );
  }

  if (status === "error" || !note) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 pb-24 sm:px-6 sm:py-20 sm:pb-20 text-center">
        <div className="rounded-xl border border-danger/40 bg-danger-soft p-4 text-xs text-danger" role="alert">
          Could not load the requested note. Please try again.
        </div>
        <Link
          href="/notes"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text shadow-sm transition-all hover:bg-surface-muted"
        >
          Back to Notes
        </Link>
      </main>
    );
  }

  const stats = calculateReadingStats(note.body);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 pb-24 sm:px-6 sm:py-12 sm:pb-12 print:max-w-full print:p-0">
      {/* Top Action Bar */}
      <nav
        aria-label="Document reader navigation"
        className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5 print:hidden"
      >
        <Link
          href="/notes"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted active:scale-95"
        >
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
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
          All Notes
        </Link>

        <div className="flex items-center gap-2">
          {/* Copy Plain Text */}
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted active:scale-95"
            title="Copy plain text to clipboard"
          >
            {copied ? (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-500"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-emerald-500 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                <span>Copy Text</span>
              </>
            )}
          </button>

          {/* Print / Export PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted active:scale-95"
            title="Print or export as PDF"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            <span>Print / PDF</span>
          </button>

          {/* Edit Note */}
          <Link
            href={`/notes?id=${encodeURIComponent(note.id)}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent-hover px-3.5 py-2 text-xs font-semibold text-accent-ink shadow-sm transition-all hover:brightness-105 active:scale-95"
            title="Open in editor"
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
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span>Edit Note</span>
          </Link>
        </div>
      </nav>

      {/* Document Article Container */}
      <article className="rounded-2xl border border-border bg-surface p-8 shadow-card sm:p-12 print:border-none print:bg-white print:p-0 print:shadow-none">
        {/* Document Header */}
        <header className="border-b border-border pb-6 print:border-b-2 print:border-black/20">
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl print:text-black">
            {note.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted print:text-gray-600">
            <span>Last updated {formatTimestamp(note.updatedAt)}</span>
            <span aria-hidden="true" className="text-border">•</span>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted/60 px-2.5 py-0.5 font-medium text-text print:border-gray-300 print:bg-transparent print:text-gray-700">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>
                {stats.words} {stats.words === 1 ? "word" : "words"}
                {stats.words > 0 && ` (${stats.readingTimeMinutes} min read)`}
              </span>
            </div>
          </div>
        </header>

        {/* Document Body */}
        <section
          aria-label="Note document content"
          className="mt-8 text-sm leading-relaxed text-text print:text-black
            [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:mt-8 [&_h1]:mb-3 print:[&_h1]:text-black
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-6 [&_h2]:mb-2.5 print:[&_h2]:text-black
            [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 print:[&_h3]:text-black
            [&_p]:my-3.5 [&_p]:leading-7
            [&_b]:font-bold [&_strong]:font-bold
            [&_i]:italic [&_em]:italic
            [&_u]:underline
            [&_s]:line-through
            [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:bg-surface-muted/30 [&_blockquote]:py-2.5 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted print:[&_blockquote]:border-gray-400 print:[&_blockquote]:bg-gray-50 print:[&_blockquote]:text-gray-700
            [&_ul]:my-3.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5
            [&_ol]:my-3.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5
            [&_li]:leading-relaxed
            [&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_code]:text-accent print:[&_code]:bg-gray-100 print:[&_code]:text-black
            [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-surface-muted [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-xs print:[&_pre]:bg-gray-100 print:[&_pre]:text-black
            [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse
            [&_th]:border [&_th]:border-border [&_th]:p-2.5 [&_th]:text-left [&_th]:font-semibold print:[&_th]:border-gray-300
            [&_td]:border [&_td]:border-border [&_td]:p-2.5 print:[&_td]:border-gray-300
            [&_hr]:my-8 [&_hr]:border-border print:[&_hr]:border-gray-300"
        >
          {note.body.trim() === "" ? (
            <p className="italic text-muted print:text-gray-500">(Empty note body)</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: note.body }} />
          )}
        </section>
      </article>
    </main>
  );
}
