"use client";

import type { DailyPlanItem } from "@/types/plan";

interface PlanItemCardProps {
  item: DailyPlanItem;
  isExecutionMode: boolean;
  onToggleComplete?: (id: string) => void;
  onRemove?: (id: string) => void;
  onUpdateEstimate?: (id: string, minutes: number) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export default function PlanItemCard({
  item,
  isExecutionMode,
  onToggleComplete,
  onRemove,
  onUpdateEstimate,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: PlanItemCardProps) {
  const isTask = item.type === "task";

  return (
    <div
      className={`group flex flex-col gap-2.5 rounded-2xl border p-3.5 transition-all sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4 ${
        item.completed
          ? "border-border/50 bg-surface-muted/30 opacity-75"
          : "border-border bg-surface shadow-xs hover:border-border-strong hover:shadow"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {isExecutionMode ? (
          <button
            type="button"
            onClick={() => onToggleComplete?.(item.id)}
            aria-label={item.completed ? `Mark ${item.title} incomplete` : `Mark ${item.title} completed`}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all ${
              item.completed
                ? "border-accent bg-accent text-accent-ink"
                : "border-border-strong bg-surface hover:border-accent"
            }`}
          >
            {item.completed && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            )}
          </button>
        ) : (
          <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                isTask
                  ? "bg-blue-500/10 text-blue-500 dark:text-blue-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isTask ? "Task" : "Follow Up"}
            </span>

            {item.recommendationReason && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                {item.recommendationReason}
              </span>
            )}
          </div>

          <p
            className={`text-sm font-medium leading-snug break-words ${
              item.completed ? "text-muted line-through" : "text-text"
            }`}
          >
            {item.title}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2 sm:border-0 sm:pt-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted">Estimate:</span>
          {isExecutionMode ? (
            <span className="rounded-lg bg-surface-muted px-2 py-1 text-xs font-semibold text-text">
              {item.estimatedMinutes}m
            </span>
          ) : (
            <input
              type="number"
              min={1}
              max={1440}
              step={5}
              value={item.estimatedMinutes}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= 1440) {
                  onUpdateEstimate?.(item.id, val);
                }
              }}
              aria-label={`Estimated minutes for ${item.title}`}
              className="w-16 rounded-lg border border-border bg-surface-muted/60 px-2 py-1 text-center text-xs font-semibold text-text outline-none focus:border-accent focus:bg-surface focus:ring-1 focus:ring-accent"
            />
          )}
        </div>

        {!isExecutionMode && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={() => onMoveUp?.(item.id)}
              aria-label="Move item up"
              className="rounded-lg p-1.5 text-muted transition-all hover:bg-surface-muted hover:text-text disabled:opacity-30"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m18 15-6-6-6 6" />
              </svg>
            </button>

            <button
              type="button"
              disabled={!canMoveDown}
              onClick={() => onMoveDown?.(item.id)}
              aria-label="Move item down"
              className="rounded-lg p-1.5 text-muted transition-all hover:bg-surface-muted hover:text-text disabled:opacity-30"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => onRemove?.(item.id)}
              aria-label="Remove item from plan"
              className="rounded-lg p-1.5 text-muted transition-all hover:bg-danger/10 hover:text-danger"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
