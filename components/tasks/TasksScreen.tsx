"use client";

import { useCallback, useEffect, useState } from "react";
import TaskControls from "@/components/tasks/TaskControls";
import TaskForm from "@/components/tasks/TaskForm";
import TaskItem from "@/components/tasks/TaskItem";
import {
  TaskNotFoundError,
  deleteTask,
  filterTasksByStatus,
  listTasks,
  searchTasks,
  sortTasks,
  todayIsoDate,
  updateTask,
  type TaskSortKey,
  type TaskStatusFilter,
} from "@/lib/tasks";
import type { Task, TaskPriority } from "@/types/task";

type Status = "loading" | "ready" | "error";

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [todayIso] = useState(() => todayIsoDate());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [sort, setSort] = useState<TaskSortKey>("created");

  const load = useCallback(
    () =>
      listTasks().then(
        (loaded) => {
          setTasks(loaded);
          setStatus("ready");
        },
        () => {
          setStatus("error");
        },
      ),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => {
    setMutationError(null);
    return load();
  }, [load]);

  async function handleToggle(task: Task, completed: boolean) {
    setMutationError(null);
    setPendingId(task.id);
    try {
      await updateTask(task.id, { completed });
      await load();
    } catch (caught) {
      setMutationError(
        caught instanceof TaskNotFoundError
          ? "That task no longer exists. Reload the page to refresh the list."
          : "Could not update the task. Please try again.",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function handleUpdate(
    task: Task,
    patch: {
      title: string;
      description: string;
      priority: TaskPriority;
      dueDate: string | null;
    },
  ): Promise<boolean> {
    setMutationError(null);
    setPendingId(task.id);
    try {
      await updateTask(task.id, patch);
      await load();
      return true;
    } catch (caught) {
      setMutationError(
        caught instanceof TaskNotFoundError
          ? "That task no longer exists. Reload the page to refresh the list."
          : "Could not update the task. Please try again.",
      );
      return false;
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(task: Task): Promise<boolean> {
    setMutationError(null);
    setPendingId(task.id);
    try {
      await deleteTask(task.id);
      await load();
      return true;
    } catch {
      setMutationError("Could not delete the task. Please try again.");
      return false;
    } finally {
      setPendingId(null);
    }
  }

  const visibleTasks = sortTasks(
    filterTasksByStatus(searchTasks(tasks, query), statusFilter),
    sort,
  );

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setSort("created");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Tasks</h1>

      {status === "error" ? (
        <p role="alert" className="text-sm text-danger">
          Could not load your tasks. Reload the page to try again.
        </p>
      ) : (
        <TaskForm onAdded={refresh} onWriteError={setMutationError} />
      )}

      {mutationError !== null && (
        <p role="alert" className="text-sm text-danger">
          {mutationError}
        </p>
      )}

      {status === "loading" && (
        <p role="status" className="text-sm text-muted">
          Loading tasks...
        </p>
      )}

      {status === "ready" && tasks.length === 0 && (
        <p className="text-sm text-muted">No tasks yet.</p>
      )}

      {status === "ready" && tasks.length > 0 && (
        <>
          <TaskControls
            query={query}
            status={statusFilter}
            sort={sort}
            disabled={pendingId !== null}
            onQueryChange={setQuery}
            onStatusChange={setStatusFilter}
            onSortChange={setSort}
          />

          {visibleTasks.length === 0 ? (
            <div className="rounded-card border border-border bg-surface p-6 text-center">
              <p className="text-sm font-medium text-text">
                No tasks match your view
              </p>
              <p className="mt-1 text-sm text-muted">
                {query.trim() !== ""
                  ? `Nothing matches "${query.trim()}".`
                  : "No tasks in this status."}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 rounded-control border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-border-strong"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {visibleTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  todayIso={todayIso}
                  disabled={pendingId !== null}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
