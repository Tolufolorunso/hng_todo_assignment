"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getNoteBacklinks } from "@/lib/notes";
import { updateTask } from "@/lib/tasks";
import type { Task, TaskPriority } from "@/types/task";
import type { FollowUp } from "@/types/followup";

interface NoteBacklinksProps {
  noteId: string;
  refreshSignal?: number;
  onActionToggled?: () => void;
}

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: "bg-prio-low-bg text-prio-low border border-prio-low/20",
  medium: "bg-prio-medium-bg text-prio-medium border border-prio-medium/20",
  high: "bg-prio-high-bg text-prio-high border border-prio-high/20",
};

function formatIsoDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function NoteBacklinks({
  noteId,
  refreshSignal = 0,
  onActionToggled,
}: NoteBacklinksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getNoteBacklinks(noteId)
      .then((data) => {
        if (!active) return;
        setTasks(data.tasks);
        setFollowups(data.followups);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [noteId, refreshSignal]);

  async function handleToggleTask(task: Task) {
    setTogglingTaskId(task.id);
    try {
      const updated = await updateTask(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      onActionToggled?.();
    } catch {
      // Handle error
    } finally {
      setTogglingTaskId(null);
    }
  }

  const totalCount = tasks.length + followups.length;

  return (
    <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-accent"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Linked Actions ({totalCount})
          </h3>
        </div>
        {loading && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        )}
      </div>

      {totalCount === 0 && !loading && (
        <div className="py-4 text-center">
          <p className="text-xs text-muted">No linked actions yet.</p>
          <p className="text-[11px] text-faint mt-0.5">
            Select text in this note to create connected tasks or follow-ups.
          </p>
        </div>
      )}

      {/* Linked Tasks */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Tasks ({tasks.length})
          </div>
          <ul className="divide-y divide-border/40 rounded-xl border border-border/60 bg-surface-muted/30">
            {tasks.map((task) => {
              const isToggling = togglingTaskId === task.id;
              return (
                <li
                  key={task.id}
                  className="flex flex-col gap-1 p-3 transition-colors hover:bg-surface-muted/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2.5 min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        disabled={isToggling}
                        onChange={() => handleToggleTask(task)}
                        className="h-4 w-4 rounded-md border-border text-accent focus:ring-accent"
                      />
                      <span
                        className={`text-xs font-medium truncate ${
                          task.completed ? "line-through text-muted" : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </span>
                    </label>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                          PRIORITY_BADGE[task.priority]
                        }`}
                      >
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                          {task.dueDate}
                        </span>
                      )}
                      <Link
                        href="/"
                        className="text-[10px] text-accent hover:underline ml-1"
                        title="View on tasks board"
                      >
                        Open
                      </Link>
                    </div>
                  </div>

                  {task.sourceExcerpt && (
                    <p className="pl-6.5 text-[11px] text-muted italic line-clamp-1 border-l-2 border-border/70 ml-2 my-0.5">
                      &ldquo;{task.sourceExcerpt}&rdquo;
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Linked Follow-Ups */}
      {followups.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
            Follow Ups ({followups.length})
          </div>
          <ul className="divide-y divide-border/40 rounded-xl border border-border/60 bg-surface-muted/30">
            {followups.map((fu) => (
              <li
                key={fu.id}
                className="flex flex-col gap-1 p-3 transition-colors hover:bg-surface-muted/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        fu.status === "completed"
                          ? "bg-emerald-500"
                          : fu.status === "archived"
                          ? "bg-slate-400"
                          : "bg-accent"
                      }`}
                    />
                    <div className="truncate text-xs">
                      <span className="font-semibold text-foreground">{fu.personName}</span>
                      <span className="text-muted mx-1">&bull;</span>
                      <span className={fu.status === "completed" ? "line-through text-muted" : "text-foreground"}>
                        {fu.commitment}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted">
                      {formatIsoDate(fu.dueAt)}
                    </span>
                    <Link
                      href="/followups"
                      className="text-[10px] text-accent hover:underline ml-1"
                      title="View in Follow Up dashboard"
                    >
                      Open
                    </Link>
                  </div>
                </div>

                {fu.sourceExcerpt && (
                  <p className="pl-4 text-[11px] text-muted italic line-clamp-1 border-l-2 border-border/70 ml-1 my-0.5">
                    &ldquo;{fu.sourceExcerpt}&rdquo;
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
