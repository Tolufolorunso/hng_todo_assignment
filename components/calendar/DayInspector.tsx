"use client";

import { useState } from "react";
import { formatSelectedDateHeading } from "@/lib/calendar";
import type { Task, TaskCategory, TaskPriority } from "@/types/task";

interface DayInspectorProps {
  selectedDate: string;
  tasks: Task[];
  unscheduledTasks: Task[];
  todayIso: string;
  onToggleTask: (task: Task, completed: boolean) => void;
  onQuickAddTask: (title: string, date: string) => Promise<boolean>;
  onRescheduleTask: (task: Task, newDate: string | null) => Promise<boolean>;
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  low: "bg-prio-low-bg text-prio-low border border-prio-low/20",
  medium: "bg-prio-medium-bg text-prio-medium border border-prio-medium/20",
  high: "bg-prio-high-bg text-prio-high border border-prio-high/20",
};

const CATEGORY_LABEL: Record<TaskCategory, string> = {
  work: "Work",
  personal: "Personal",
  urgent: "Urgent",
  study: "Study",
  ideas: "Ideas",
};

const CATEGORY_CLASS: Record<TaskCategory, string> = {
  work: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
  personal: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  urgent: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  study: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  ideas: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

export default function DayInspector({
  selectedDate,
  tasks,
  unscheduledTasks,
  todayIso,
  onToggleTask,
  onQuickAddTask,
  onRescheduleTask,
}: DayInspectorProps) {
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  const formattedHeading = formatSelectedDateHeading(selectedDate);
  const isToday = selectedDate === todayIso;
  const isPast = selectedDate < todayIso;
  const incompleteCount = tasks.filter((t) => !t.completed).length;

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    const success = await onQuickAddTask(trimmed, selectedDate);
    setIsSubmitting(false);
    if (success) {
      setNewTitle("");
    }
  }

  return (
    <aside
      aria-label={`Schedule inspector for ${selectedDate}`}
      className="flex flex-col gap-5"
    >
      {/* Date Header Card */}
      <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                {isToday ? "Today" : isPast ? "Past Date" : "Scheduled"}
              </span>
              {isPast && incompleteCount > 0 && (
                <span className="rounded bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                  {incompleteCount} overdue
                </span>
              )}
            </div>
            <h2 className="mt-1 text-base font-bold tracking-tight text-text">
              {formattedHeading}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {tasks.length === 0
                ? "No tasks scheduled for this day."
                : `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} scheduled (${
                    tasks.length - incompleteCount
                  } completed)`}
            </p>
          </div>
        </div>

        {/* Quick inline task creator */}
        <form onSubmit={handleAddSubmit} className="mt-4 flex gap-2">
          <label htmlFor="quick-add-input" className="sr-only">
            Add task for {selectedDate}
          </label>
          <input
            id="quick-add-input"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add task for this day..."
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-border bg-surface-muted/60 px-3 py-2 text-xs text-text outline-none placeholder:text-faint transition-all focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>

      {/* Scheduled Tasks List */}
      <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Tasks for This Day
        </h3>

        {tasks.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border/80 p-6 text-center">
            <p className="text-xs text-muted">No scheduled tasks.</p>
            <p className="mt-1 text-[11px] text-faint">
              Add one above or schedule from unscheduled tasks below.
            </p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2.5">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-2.5 rounded-xl border border-border/70 bg-surface-muted/30 p-3 transition-colors hover:border-border"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={(e) => onToggleTask(task, e.target.checked)}
                  aria-label={`Mark "${task.title}" as ${
                    task.completed ? "incomplete" : "complete"
                  }`}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-accent"
                />
                <div className="min-w-0 flex-1">
                  <span
                    className={`block text-xs font-medium ${
                      task.completed ? "text-faint line-through" : "text-text"
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.description !== "" && (() => {
                    const hasHtml = /<[a-z][\s\S]*>/i.test(task.description);

                    return (
                      <div
                        className={`mt-1 text-[11px] leading-relaxed transition-all
                          [&_h1]:text-xs [&_h1]:font-bold [&_h1]:my-1
                          [&_h2]:text-[11px] [&_h2]:font-bold [&_h2]:my-0.5
                          [&_h3]:text-[11px] [&_h3]:font-semibold [&_h3]:my-0.5
                          [&_b]:font-semibold [&_strong]:font-semibold
                          [&_i]:italic [&_em]:italic
                          [&_u]:underline
                          [&_s]:line-through
                          [&_blockquote]:border-l-2 [&_blockquote]:border-accent/60 [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:my-0.5
                          [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-0.5
                          [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-0.5
                          [&_li]:my-0.5
                          [&_p]:my-0.5
                          ${
                            task.completed
                              ? "text-faint line-through opacity-60"
                              : "text-muted"
                          }`}
                      >
                        {hasHtml ? (
                          <div dangerouslySetInnerHTML={{ __html: task.description }} />
                        ) : (
                          <p className="whitespace-pre-wrap">{task.description}</p>
                        )}
                      </div>
                    );
                  })()}
                  {/* Badges row */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                        PRIORITY_CLASS[task.priority]
                      }`}
                    >
                      {PRIORITY_LABEL[task.priority]}
                    </span>
                    {task.category && (
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                          CATEGORY_CLASS[task.category]
                        }`}
                      >
                        {CATEGORY_LABEL[task.category]}
                      </span>
                    )}
                  </div>
                </div>
                {/* Remove from date / unschedule button */}
                <button
                  type="button"
                  title="Remove due date"
                  onClick={() => onRescheduleTask(task, null)}
                  className="rounded p-1 text-faint hover:bg-surface hover:text-muted"
                >
                  <span className="sr-only">Clear due date</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Unscheduled Backlog Section */}
      <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Unscheduled Tasks
            </h3>
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-text">
              {unscheduledTasks.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            className="text-xs font-medium text-accent hover:underline"
          >
            {showUnscheduled ? "Hide" : "Show"}
          </button>
        </div>

        {showUnscheduled && (
          <div className="mt-3 border-t border-border/60 pt-3">
            {unscheduledTasks.length === 0 ? (
              <p className="py-2 text-center text-xs text-muted">
                All tasks have scheduled due dates!
              </p>
            ) : (
              <ul className="flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
                {unscheduledTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-surface-muted/40 p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-text">
                        {task.title}
                      </span>
                      <span className="text-[10px] text-faint">
                        {PRIORITY_LABEL[task.priority]} priority
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRescheduleTask(task, selectedDate)}
                      className="shrink-0 rounded-lg border border-accent/30 bg-accent-soft px-2 py-1 text-[10px] font-semibold text-accent transition-all hover:bg-accent hover:text-white"
                    >
                      Schedule Here
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
