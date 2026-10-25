"use client";

import type { FollowUp, FollowUpOccurrence } from "@/types/followup";

interface OccurrenceHistoryModalProps {
  isOpen: boolean;
  followUp: FollowUp | null;
  occurrences: FollowUpOccurrence[];
  onClose: () => void;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OccurrenceHistoryModal({
  isOpen,
  followUp,
  occurrences,
  onClose,
}: OccurrenceHistoryModalProps) {
  if (!isOpen || !followUp) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="occurrence-history-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h2 id="occurrence-history-title" className="text-base font-semibold text-text">
              Occurrence History
            </h2>
            <div className="text-xs text-muted mt-0.5">
              {followUp.personName}: {followUp.commitment}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close occurrence history modal"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-text transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {occurrences.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-muted">
                <svg
                  width="18"
                  height="18"
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
              </div>
              <p className="mt-2 text-xs text-muted">No past occurrences recorded yet.</p>
            </div>
          ) : (
            occurrences.map((occ) => {
              const isCompleted = occ.outcome === "completed";
              const isSkipped = occ.outcome === "skipped";

              return (
                <div
                  key={occ.id}
                  className="rounded-xl border border-border bg-surface-muted/30 p-3 text-xs space-y-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
                        isCompleted
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : isSkipped
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {occ.outcome}
                    </span>
                    <span className="text-[11px] text-muted">
                      Scheduled: {formatDate(occ.dueAt)}
                    </span>
                  </div>

                  {occ.resolvedAt && (
                    <div className="text-[11px] text-text font-medium">
                      Resolved: {formatDate(occ.resolvedAt)}
                    </div>
                  )}

                  {occ.nextDueAt && (
                    <div className="text-[11px] text-muted">
                      Advanced to: {formatDate(occ.nextDueAt)}
                    </div>
                  )}

                  {occ.notes && (
                    <div className="mt-1 rounded-md bg-surface p-2 text-[11px] text-muted italic border border-border/60">
                      {occ.notes}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-surface-muted px-4 py-2 text-xs font-semibold text-text hover:bg-surface-muted/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
