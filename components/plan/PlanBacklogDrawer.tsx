"use client";

import { useState } from "react";
import type { Task } from "@/types/task";
import type { FollowUp } from "@/types/followup";
import type { DailyPlanItem } from "@/types/plan";

interface PlanBacklogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  followups: FollowUp[];
  currentPlanTargetIds: Set<string>;
  onAddItem: (item: DailyPlanItem) => void;
}

export default function PlanBacklogDrawer({
  isOpen,
  onClose,
  tasks,
  followups,
  currentPlanTargetIds,
  onAddItem,
}: PlanBacklogDrawerProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "tasks" | "followups">("all");

  if (!isOpen) return null;

  const normalizedSearch = search.trim().toLowerCase();

  const availableTasks = tasks.filter((t) => {
    if (t.completed || currentPlanTargetIds.has(t.id)) return false;
    if (filterType === "followups") return false;
    if (!normalizedSearch) return true;
    return (
      t.title.toLowerCase().includes(normalizedSearch) ||
      t.description.toLowerCase().includes(normalizedSearch)
    );
  });

  const availableFollowups = followups.filter((f) => {
    if (f.status !== "open" || currentPlanTargetIds.has(f.id)) return false;
    if (filterType === "tasks") return false;
    if (!normalizedSearch) return true;
    return (
      f.personName.toLowerCase().includes(normalizedSearch) ||
      f.commitment.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add backlog items to daily plan"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-all"
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-3xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-base font-bold text-text">Add from Backlog</h2>
            <p className="text-xs text-muted">Select eligible tasks and follow-ups to add to today&apos;s plan</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close backlog modal"
            className="rounded-xl p-2 text-muted hover:bg-surface-muted hover:text-text"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5 pb-3">
          <input
            type="search"
            placeholder="Search backlog items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-muted/50 px-3.5 py-2 text-xs text-text outline-none placeholder:text-faint transition-all focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent-soft"
          />

          <div className="flex gap-2">
            {(["all", "tasks", "followups"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                  filterType === type
                    ? "bg-accent text-accent-ink"
                    : "border border-border bg-surface-muted text-muted hover:text-text"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {availableTasks.length === 0 && availableFollowups.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted">
              No matching backlog items found to add.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {availableTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/30 p-3 hover:border-border-strong"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5 pb-0.5">
                      <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500">
                        Task
                      </span>
                      {task.priority && (
                        <span className="text-[10px] uppercase text-muted">
                          {task.priority} priority
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-[10px] text-muted">Due {task.dueDate}</span>
                      )}
                    </div>
                    <p className="truncate text-xs font-medium text-text">{task.title}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onAddItem({
                        id: crypto.randomUUID(),
                        type: "task",
                        targetId: task.id,
                        title: task.title,
                        estimatedMinutes: task.estimatedMinutes || 30,
                        completed: false,
                        recommendationReason: "Added from backlog",
                        order: 0,
                      });
                    }}
                    className="shrink-0 rounded-lg bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent transition-all hover:bg-accent hover:text-accent-ink"
                  >
                    + Add
                  </button>
                </div>
              ))}

              {availableFollowups.map((fu) => (
                <div
                  key={fu.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/30 p-3 hover:border-border-strong"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-1.5 pb-0.5">
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                        Follow Up
                      </span>
                      <span className="text-[10px] text-muted">{fu.personName}</span>
                    </div>
                    <p className="truncate text-xs font-medium text-text">{fu.commitment}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onAddItem({
                        id: crypto.randomUUID(),
                        type: "followup",
                        targetId: fu.id,
                        title: `${fu.personName}: ${fu.commitment}`,
                        estimatedMinutes: 15,
                        completed: false,
                        recommendationReason: "Added from backlog",
                        order: 0,
                      });
                    }}
                    className="shrink-0 rounded-lg bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent transition-all hover:bg-accent hover:text-accent-ink"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
