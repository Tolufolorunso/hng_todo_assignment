"use client";

import { useState } from "react";
import { processCapture } from "@/lib/inbox";
import { useModalAccessibility } from "@/hooks/useModalAccessibility";
import type { InboxCapture, InboxTargetType, ProcessCaptureResult } from "@/types/inbox";
import type { TaskCategory, TaskPriority } from "@/types/task";

interface ConvertCaptureModalProps {
  capture: InboxCapture;
  targetType: InboxTargetType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ProcessCaptureResult) => void;
}

const CATEGORIES: TaskCategory[] = ["work", "personal", "urgent", "study", "ideas"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

export default function ConvertCaptureModal({
  capture,
  targetType,
  isOpen,
  onClose,
  onSuccess,
}: ConvertCaptureModalProps) {
  const { containerRef } = useModalAccessibility({ isOpen, onClose });
  const defaultTitle = capture.text.split("\n")[0].trim().slice(0, 100);

  const [title, setTitle] = useState(defaultTitle || "New Item");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState<TaskCategory | null>("work");
  const [dueDate, setDueDate] = useState<string>("");

  const [personName, setPersonName] = useState("");
  const [commitment, setCommitment] = useState(defaultTitle || "Follow up");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (targetType === "task") {
        if (!title.trim()) {
          setError("Task title is required.");
          setIsSubmitting(false);
          return;
        }
        const res = await processCapture(capture.id, {
          targetType: "task",
          title: title.trim(),
          priority,
          category,
          dueDate: dueDate || null,
        });
        onSuccess(res);
      } else if (targetType === "note") {
        if (!title.trim()) {
          setError("Note title is required.");
          setIsSubmitting(false);
          return;
        }
        const res = await processCapture(capture.id, {
          targetType: "note",
          title: title.trim(),
        });
        onSuccess(res);
      } else if (targetType === "followup") {
        if (!personName.trim()) {
          setError("Person name is required.");
          setIsSubmitting(false);
          return;
        }
        if (!commitment.trim()) {
          setError("Commitment is required.");
          setIsSubmitting(false);
          return;
        }
        const res = await processCapture(capture.id, {
          targetType: "followup",
          personName: personName.trim(),
          commitment: commitment.trim(),
          dueDate: dueDate || null,
        });
        onSuccess(res);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process capture.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const typeLabels: Record<InboxTargetType, string> = {
    task: "Task",
    note: "Rich Text Note",
    followup: "Follow Up",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-border/80 bg-surface p-5 shadow-2xl transition-all scale-in-95 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-sm font-bold text-foreground">
            Convert to {typeLabels[targetType]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
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
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Capture preview quote */}
        <div className="mt-3 rounded-xl border border-border/60 bg-surface-muted/40 p-3 text-xs text-muted">
          <p className="font-semibold uppercase tracking-wider text-[10px] text-faint mb-1">
            Original Capture
          </p>
          <p className="line-clamp-2 italic text-foreground">&ldquo;{capture.text}&rdquo;</p>
          {capture.sharedUrl && (
            <p className="mt-1 truncate text-[11px] text-accent underline">{capture.sharedUrl}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {targetType === "followup" ? (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Person Name *
                </label>
                <input
                  type="text"
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Commitment / Action *
                </label>
                <input
                  type="text"
                  required
                  value={commitment}
                  onChange={(e) => setCommitment(e.target.value)}
                  placeholder="e.g. Send revised contract"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {targetType === "task" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TaskPriority)}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        value={category || ""}
                        onChange={(e) => setCategory((e.target.value as TaskCategory) || null)}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Converting...</span>
                </>
              ) : (
                <span>Confirm &amp; Convert</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
