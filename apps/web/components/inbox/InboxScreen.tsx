"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/app/AppHeader";
import FastCaptureModal from "@/components/inbox/FastCaptureModal";
import ConvertCaptureModal from "@/components/inbox/ConvertCaptureModal";
import {
  createCapture,
  deleteCapture,
  discardCapture,
  listCaptures,
  updateCapture,
} from "@/lib/inbox";
import type { InboxCapture, InboxCaptureState, InboxTargetType } from "@/types/inbox";

interface InboxScreenProps {
  initialCapture?: boolean;
  initialTitle?: string;
  initialText?: string;
  initialUrl?: string;
}

type TabFilter = "pending" | "processed" | "discarded" | "all";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function InboxScreen({
  initialCapture = false,
  initialTitle = "",
  initialText = "",
  initialUrl = "",
}: InboxScreenProps) {
  const [captures, setCaptures] = useState<InboxCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TabFilter>("pending");
  const [query, setQuery] = useState("");
  const [refreshSignal, setRefreshSignal] = useState(0);

  // Quick inline capture
  const [inlineInput, setInlineInput] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);

  // Modals
  const [isFastModalOpen, setIsFastModalOpen] = useState(
    () => initialCapture || Boolean(initialText || initialUrl || initialTitle)
  );
  const [convertTarget, setConvertTarget] = useState<InboxCapture | null>(null);
  const [convertType, setConvertType] = useState<InboxTargetType>("task");

  useEffect(() => {
    let active = true;
    listCaptures()
      .then((items) => {
        if (!active) return;
        setCaptures(items);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshSignal]);

  async function handleInlineSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inlineInput.trim();
    if (!trimmed) return;

    setInlineSaving(true);
    try {
      await createCapture({
        text: trimmed,
        sourceAppLabel: "Inline Capture",
      });
      setInlineInput("");
      setRefreshSignal((s) => s + 1);
    } catch {
      // error handled
    } finally {
      setInlineSaving(false);
    }
  }

  async function handleDiscard(id: string) {
    try {
      await discardCapture(id);
      setRefreshSignal((s) => s + 1);
    } catch {
      // error
    }
  }

  async function handleRestore(id: string) {
    try {
      await updateCapture(id, { state: "pending", discardedAt: null });
      setRefreshSignal((s) => s + 1);
    } catch {
      // error
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCapture(id);
      setRefreshSignal((s) => s + 1);
    } catch {
      // error
    }
  }

  function openConvert(target: InboxCapture, type: InboxTargetType) {
    setConvertTarget(target);
    setConvertType(type);
  }

  // Derived counts
  const pendingCount = captures.filter((c) => c.state === "pending").length;
  const processedCount = captures.filter((c) => c.state === "processed").length;
  const discardedCount = captures.filter((c) => c.state === "discarded").length;

  // Filtered and searched list
  const filtered = captures.filter((c) => {
    if (filter !== "all" && c.state !== filter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.text.toLowerCase().includes(q) ||
      (c.sharedUrl && c.sharedUrl.toLowerCase().includes(q)) ||
      (c.sourceAppLabel && c.sourceAppLabel.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <AppHeader active="inbox" />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                  <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                </svg>
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Capture Inbox
              </h1>
              {pendingCount > 0 && (
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-bold text-accent">
                  {pendingCount}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-1">
              Frictionless offline capture for text and links with instant conversion into tasks, notes, or follow-ups.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsFastModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 active:scale-95 transition-all shrink-0"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Quick Capture</span>
            <kbd className="hidden sm:inline rounded bg-white/20 px-1 py-0.2 font-mono text-[9px] text-white">
              Alt+C
            </kbd>
          </button>
        </div>

        {/* Inline Fast Capture input box */}
        <form onSubmit={handleInlineSubmit} className="mb-6">
          <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-surface p-2 shadow-card transition-all focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <input
              type="text"
              value={inlineInput}
              disabled={inlineSaving}
              onChange={(e) => setInlineInput(e.target.value)}
              placeholder="Quick capture a thought, link, or reminder (press Enter to save)..."
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-foreground placeholder:text-muted/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={inlineSaving || !inlineInput.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-accent/90 disabled:opacity-40 transition-all shrink-0"
            >
              {inlineSaving ? "Saving..." : "Capture"}
            </button>
          </div>
        </form>

        {/* Controls: Filter Tabs + Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-border/60 pb-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === "pending"
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <span>Pending</span>
              <span className="rounded-full bg-surface-muted px-1.5 py-0.2 text-[10px]">
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("processed")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === "processed"
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <span>Processed</span>
              <span className="rounded-full bg-surface-muted px-1.5 py-0.2 text-[10px]">
                {processedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("discarded")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === "discarded"
                  ? "bg-slate-500/15 text-slate-400"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <span>Discarded</span>
              <span className="rounded-full bg-surface-muted px-1.5 py-0.2 text-[10px]">
                {discardedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === "all"
                  ? "bg-surface-muted text-foreground"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <span>All</span>
              <span className="rounded-full bg-surface-muted px-1.5 py-0.2 text-[10px]">
                {captures.length}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-60">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search captures..."
              className="w-full rounded-xl border border-border bg-surface px-3 py-1.5 pl-8 text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* Capture Items List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/80 bg-surface p-12 text-center shadow-card">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-3">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <h3 className="text-sm font-bold text-foreground">
              {filter === "pending" ? "Inbox Zero" : "No captures found"}
            </h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              {filter === "pending"
                ? "All captured thoughts, links, and shares have been organized. Use Quick Capture (Alt+C) anytime."
                : "No items match your selected filter or search query."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              const stateBadgeClass: Record<InboxCaptureState, string> = {
                pending: "bg-accent/15 text-accent border border-accent/20",
                processed: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20",
                discarded: "bg-slate-500/15 text-slate-400 border border-slate-500/20",
              };

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border/80 bg-surface p-4 shadow-card transition-all hover:border-border-strong space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            stateBadgeClass[item.state]
                          }`}
                        >
                          {item.state}
                        </span>

                        {item.sourceAppLabel && (
                          <span className="rounded-md border border-border bg-surface-muted/60 px-1.5 py-0.5 text-[10px] text-muted font-medium">
                            {item.sourceAppLabel}
                          </span>
                        )}

                        <span className="text-[11px] text-faint">
                          {formatDate(item.capturedAt)}
                        </span>
                      </div>

                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {item.text}
                      </p>

                      {item.sharedUrl && (
                        <div className="flex items-center gap-1.5 text-xs text-accent">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="shrink-0"
                          >
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          <a
                            href={item.sharedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate underline font-mono text-[11px] hover:text-accent/80"
                          >
                            {item.sharedUrl}
                          </a>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      title="Delete permanently"
                      className="rounded-lg p-1.5 text-faint hover:bg-rose-500/10 hover:text-rose-500 transition-colors shrink-0"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>

                  {/* Actions & Resulting Target Links */}
                  <div className="flex items-center justify-between border-t border-border/60 pt-2.5 flex-wrap gap-2">
                    {item.state === "pending" ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openConvert(item, "task")}
                          className="flex items-center gap-1 rounded-lg border border-border bg-surface-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent transition-colors"
                        >
                          <span>To Task</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openConvert(item, "note")}
                          className="flex items-center gap-1 rounded-lg border border-border bg-surface-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent transition-colors"
                        >
                          <span>To Note</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openConvert(item, "followup")}
                          className="flex items-center gap-1 rounded-lg border border-border bg-surface-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-accent hover:text-accent transition-colors"
                        >
                          <span>To Follow Up</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDiscard(item.id)}
                          className="rounded-lg px-2 py-1 text-[11px] text-muted hover:text-foreground transition-colors"
                        >
                          Discard
                        </button>
                      </div>
                    ) : item.state === "processed" ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted">Converted into:</span>
                        {item.targetType === "task" && (
                          <Link
                            href="/"
                            className="font-semibold text-accent hover:underline flex items-center gap-1"
                          >
                            <span>Open Task</span>
                            <span aria-hidden="true">&rarr;</span>
                          </Link>
                        )}
                        {item.targetType === "note" && (
                          <Link
                            href={item.targetId ? `/notes/${item.targetId}` : "/notes"}
                            className="font-semibold text-accent hover:underline flex items-center gap-1"
                          >
                            <span>Open Note</span>
                            <span aria-hidden="true">&rarr;</span>
                          </Link>
                        )}
                        {item.targetType === "followup" && (
                          <Link
                            href="/followups"
                            className="font-semibold text-accent hover:underline flex items-center gap-1"
                          >
                            <span>Open Follow Up</span>
                            <span aria-hidden="true">&rarr;</span>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Discarded</span>
                        <button
                          type="button"
                          onClick={() => handleRestore(item.id)}
                          className="text-xs text-accent hover:underline font-medium"
                        >
                          Restore to Pending
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Fast Capture Modal */}
      {isFastModalOpen && (
        <FastCaptureModal
          isOpen={isFastModalOpen}
          onClose={() => setIsFastModalOpen(false)}
          onCaptured={() => setRefreshSignal((s) => s + 1)}
          initialText={initialText || initialTitle}
          initialUrl={initialUrl}
        />
      )}

      {/* Convert to Task/Note/FollowUp Modal */}
      {convertTarget && (
        <ConvertCaptureModal
          capture={convertTarget}
          targetType={convertType}
          isOpen={Boolean(convertTarget)}
          onClose={() => setConvertTarget(null)}
          onSuccess={() => setRefreshSignal((s) => s + 1)}
        />
      )}
    </>
  );
}
