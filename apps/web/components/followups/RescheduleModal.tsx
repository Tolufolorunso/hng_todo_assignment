"use client";

import { useState } from "react";
import type { FollowUp } from "@/types/followup";

interface RescheduleModalProps {
  isOpen: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onReschedule: (newDueAt: string, scope: "single" | "series") => Promise<void>;
}

function toLocalDatetimeString(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function RescheduleModal({
  isOpen,
  followUp,
  onClose,
  onReschedule,
}: RescheduleModalProps) {
  const [newDueAtLocal, setNewDueAtLocal] = useState(() =>
    toLocalDatetimeString(followUp?.dueAt)
  );
  const [scope, setScope] = useState<"single" | "series">("single");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !followUp) return null;

  const isRecurring = Boolean(followUp.recurrence);

  function applyPreset(daysToAdd: number) {
    const base = newDueAtLocal ? new Date(newDueAtLocal) : new Date();
    base.setDate(base.getDate() + daysToAdd);
    setNewDueAtLocal(toLocalDatetimeString(base.toISOString()));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!newDueAtLocal) {
      setError("Please select a new date and time.");
      return;
    }

    const parsed = new Date(newDueAtLocal);
    if (Number.isNaN(parsed.getTime())) {
      setError("Please choose a valid date and time.");
      return;
    }

    setSubmitting(true);
    try {
      await onReschedule(parsed.toISOString(), scope);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to reschedule follow-up.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex w-full max-w-md flex-col rounded-2xl border border-border bg-surface p-6 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 id="reschedule-modal-title" className="text-base font-semibold text-text">
            Reschedule Follow Up
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reschedule modal"
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 font-medium">
              {error}
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-muted">Contact & Commitment:</div>
            <div className="text-sm font-semibold text-text mt-0.5">{followUp.personName}</div>
            <div className="text-xs text-muted line-clamp-1">{followUp.commitment}</div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5">
              Quick Offset Presets
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyPreset(1)}
                className="flex-1 rounded-lg border border-border bg-surface-muted/50 px-2 py-1.5 text-xs font-medium text-text hover:bg-surface-muted transition-colors"
              >
                +1 Day
              </button>
              <button
                type="button"
                onClick={() => applyPreset(3)}
                className="flex-1 rounded-lg border border-border bg-surface-muted/50 px-2 py-1.5 text-xs font-medium text-text hover:bg-surface-muted transition-colors"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset(7)}
                className="flex-1 rounded-lg border border-border bg-surface-muted/50 px-2 py-1.5 text-xs font-medium text-text hover:bg-surface-muted transition-colors"
              >
                +1 Week
              </button>
            </div>
          </div>

          {/* New Due Date & Time */}
          <div>
            <label htmlFor="newDueAtLocal" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              New Date and Time
            </label>
            <input
              id="newDueAtLocal"
              type="datetime-local"
              required
              value={newDueAtLocal}
              onChange={(e) => setNewDueAtLocal(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-muted/60 px-3.5 py-2 text-sm text-text focus:border-accent focus:outline-hidden"
            />
          </div>

          {/* Scoped Reschedule Choice (for recurring follow-ups) */}
          {isRecurring && (
            <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-3 space-y-2">
              <span className="block text-xs font-semibold text-text">
                Reschedule Scope
              </span>
              <div className="space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="scope"
                    value="single"
                    checked={scope === "single"}
                    onChange={() => setScope("single")}
                    className="mt-0.5 text-accent focus:ring-accent"
                  />
                  <div>
                    <div className="font-medium text-text">This occurrence only</div>
                    <div className="text-[11px] text-muted leading-tight">
                      Reschedules this active occurrence. Subsequent occurrences continue on the original series schedule.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="scope"
                    value="series"
                    checked={scope === "series"}
                    onChange={() => setScope("series")}
                    className="mt-0.5 text-accent focus:ring-accent"
                  />
                  <div>
                    <div className="font-medium text-text">Whole series</div>
                    <div className="text-[11px] text-muted leading-tight">
                      Adjusts the recurring baseline so this and future occurrences shift to the new schedule.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? "Rescheduling..." : "Save Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
