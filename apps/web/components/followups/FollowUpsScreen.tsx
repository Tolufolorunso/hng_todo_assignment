"use client";

import { useCallback, useEffect, useState } from "react";
import type { FollowUp, FollowUpOccurrence, CreateFollowUpInput } from "@/types/followup";
import {
  listFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  completeFollowUp,
  skipFollowUpOccurrence,
  snoozeFollowUp,
  rescheduleFollowUp,
  listOccurrencesByFollowUp,
} from "@/lib/followups";
import { isFollowUpOverdue } from "@/lib/recurrence";
import { getOverdueFollowUps } from "@/lib/notifications";
import FollowUpCard from "@/components/followups/FollowUpCard";
import FollowUpModal from "@/components/followups/FollowUpModal";
import RescheduleModal from "@/components/followups/RescheduleModal";
import OccurrenceHistoryModal from "@/components/followups/OccurrenceHistoryModal";
import { onSyncEvent } from "@/lib/broadcast";

type FilterTab = "all" | "due" | "upcoming" | "completed";
type ScreenStatus = "loading" | "ready" | "error";

export default function FollowUpsScreen() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [status, setStatus] = useState<ScreenStatus>("loading");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [nowMs] = useState(() => Date.now());
  const [dismissedOverdue, setDismissedOverdue] = useState(false);

  // Modal dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<FollowUp | null>(null);

  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUp | null>(null);

  const [historyTarget, setHistoryTarget] = useState<FollowUp | null>(null);
  const [historyOccurrences, setHistoryOccurrences] = useState<FollowUpOccurrence[]>([]);

  const loadData = useCallback(
    () =>
      listFollowUps().then(
        (items) => {
          setFollowUps(items);
          setStatus("ready");
        },
        () => {
          setStatus("error");
        },
      ),
    [],
  );

  useEffect(() => {
    void loadData();
    const unsubscribe = onSyncEvent((event) => {
      if (
        event.type === "WORKSPACE_CHANGED" ||
        event.type === "SYNC_COMPLETED" ||
        event.type === "DATA_MUTATED"
      ) {
        setIsModalOpen(false);
        setEditingTarget(null);
        setRescheduleTarget(null);
        setHistoryTarget(null);
        void loadData();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // Handlers for CRUD and state transitions
  async function handleSaveFollowUp(input: CreateFollowUpInput) {
    if (editingTarget) {
      await updateFollowUp(editingTarget.id, input);
    } else {
      await createFollowUp(input);
    }
    await loadData();
  }

  async function handleComplete(item: FollowUp) {
    if (item.status === "completed") {
      // Toggle back to open
      await updateFollowUp(item.id, { status: "open" });
    } else {
      await completeFollowUp(item.id);
    }
    await loadData();
  }

  async function handleSkip(item: FollowUp) {
    await skipFollowUpOccurrence(item.id);
    await loadData();
  }

  async function handleSnooze(item: FollowUp, option: string) {
    await snoozeFollowUp(item.id, option);
    await loadData();
  }

  async function handleReschedule(newDueAt: string, scope: "single" | "series") {
    if (!rescheduleTarget) return;
    await rescheduleFollowUp(rescheduleTarget.id, newDueAt, scope);
    await loadData();
  }

  async function handleDelete(item: FollowUp) {
    await deleteFollowUp(item.id);
    await loadData();
  }

  async function handleOpenHistory(item: FollowUp) {
    setHistoryTarget(item);
    try {
      const occs = await listOccurrencesByFollowUp(item.id);
      setHistoryOccurrences(occs);
    } catch {
      setHistoryOccurrences([]);
    }
  }

  function handleOpenCreate() {
    setEditingTarget(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(item: FollowUp) {
    setEditingTarget(item);
    setIsModalOpen(true);
  }

  // Filter calculations
  const dueItems = followUps.filter(
    (f) => f.status === "open" && (isFollowUpOverdue(f.dueAt, f.status, nowMs) || new Date(f.dueAt).getTime() <= nowMs)
  );
  const upcomingItems = followUps.filter(
    (f) => f.status === "open" && new Date(f.dueAt).getTime() > nowMs
  );
  const completedItems = followUps.filter((f) => f.status === "completed");

  const filteredItems = followUps.filter((item) => {
    // Tab filter
    if (filter === "due") {
      const isDue =
        item.status === "open" &&
        (isFollowUpOverdue(item.dueAt, item.status, nowMs) || new Date(item.dueAt).getTime() <= nowMs);
      if (!isDue) return false;
    } else if (filter === "upcoming") {
      const isUpcoming = item.status === "open" && new Date(item.dueAt).getTime() > nowMs;
      if (!isUpcoming) return false;
    } else if (filter === "completed") {
      if (item.status !== "completed") return false;
    }

    // Text search query
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchPerson = item.personName.toLowerCase().includes(q);
      const matchCommitment = item.commitment.toLowerCase().includes(q);
      const matchDetails = item.details ? item.details.toLowerCase().includes(q) : false;
      return matchPerson || matchCommitment || matchDetails;
    }

    return true;
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-20">
      {/* Top Banner / Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Follow Ups
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage commitments to people, recurring check-ins, and direct communication launchers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95 active:scale-95 transition-all"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>New Follow Up</span>
        </button>
      </div>

      {/* Overdue Catch-up Banner */}
      {(() => {
        const overdueCatchUpItems = getOverdueFollowUps(followUps, new Date(nowMs));
        if (overdueCatchUpItems.length === 0 || dismissedOverdue) return null;

        return (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-500">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-sm font-bold text-text">
                    Overdue Commitments Catch-up ({overdueCatchUpItems.length})
                  </h2>
                  <p className="text-xs text-muted">
                    These commitments became due while the app was closed or idle.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissedOverdue(true)}
                className="text-xs text-muted hover:text-text transition-colors"
                aria-label="Dismiss catch-up alert"
              >
                Dismiss
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {overdueCatchUpItems.slice(0, 3).map((item) => {
                const fullItem = followUps.find((f) => f.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-xl border border-rose-500/20 bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-text">
                        {item.personName}
                      </div>
                      <div className="text-xs text-muted line-clamp-1">
                        {item.commitment}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.launcherUri && (
                        <a
                          href={item.launcherUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-contrast shadow-xs hover:bg-accent-hover transition-all"
                        >
                          Launch {item.preferredAction || "Action"}
                        </a>
                      )}
                      {fullItem && (
                        <>
                          <button
                            type="button"
                            onClick={() => setRescheduleTarget(fullItem)}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text hover:bg-surface-muted transition-all"
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => handleComplete(fullItem)}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text hover:bg-surface-muted transition-all"
                          >
                            Complete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Control bar: Search and Tabs */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-border bg-surface-muted/60 p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === "all"
                ? "border border-border/80 bg-surface text-text shadow-xs"
                : "text-muted hover:text-text hover:bg-surface/40"
            }`}
          >
            All ({followUps.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter("due")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === "due"
                ? "border border-border/80 bg-surface text-text shadow-xs"
                : "text-muted hover:text-text hover:bg-surface/40"
            }`}
          >
            <span>Due & Overdue</span>
            {dueItems.length > 0 && (
              <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-500">
                {dueItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter("upcoming")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === "upcoming"
                ? "border border-border/80 bg-surface text-text shadow-xs"
                : "text-muted hover:text-text hover:bg-surface/40"
            }`}
          >
            Upcoming ({upcomingItems.length})
          </button>

          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === "completed"
                ? "border border-border/80 bg-surface text-text shadow-xs"
                : "text-muted hover:text-text hover:bg-surface/40"
            }`}
          >
            Completed ({completedItems.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search follow-ups..."
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-3.5 py-1.5 text-xs text-text placeholder-muted/60 focus:border-accent focus:outline-hidden"
          />
        </div>
      </div>

      {/* Main List Area */}
      <div className="mt-6 flex-1">
        {status === "loading" && (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 w-full animate-pulse rounded-2xl border border-border/60 bg-surface-muted/40"
              />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-rose-500">
            <p className="text-sm font-semibold">Failed to load follow-up commitments.</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-3 rounded-lg border border-rose-500/40 bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"
            >
              Retry
            </button>
          </div>
        )}

        {status === "ready" && filteredItems.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-muted">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-text">
              {query
                ? "No follow-ups match your search"
                : filter === "due"
                ? "No due or overdue follow-ups"
                : filter === "completed"
                ? "No completed follow-ups yet"
                : "No follow-up commitments yet"}
            </h3>
            <p className="mt-1 text-xs text-muted">
              {query
                ? "Try searching with a different term or clear the filter."
                : "Keep track of promises, scheduled calls, and recurring check-ins with people."}
            </p>
            {!query && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text shadow-xs hover:bg-surface-muted transition-colors"
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
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add your first follow-up</span>
              </button>
            )}
          </div>
        )}

        {status === "ready" && filteredItems.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map((item) => (
              <FollowUpCard
                key={item.id}
                followUp={item}
                onComplete={handleComplete}
                onSkip={handleSkip}
                onSnooze={handleSnooze}
                onOpenReschedule={(f) => setRescheduleTarget(f)}
                onOpenEdit={handleOpenEdit}
                onOpenHistory={handleOpenHistory}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <FollowUpModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveFollowUp}
          initialData={editingTarget}
        />
      )}

      {rescheduleTarget && (
        <RescheduleModal
          isOpen={Boolean(rescheduleTarget)}
          followUp={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onReschedule={handleReschedule}
        />
      )}

      {historyTarget && (
        <OccurrenceHistoryModal
          isOpen={Boolean(historyTarget)}
          followUp={historyTarget}
          occurrences={historyOccurrences}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </main>
  );
}
