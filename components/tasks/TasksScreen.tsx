"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TaskControls from "@/components/tasks/TaskControls";
import TaskForm from "@/components/tasks/TaskForm";
import TaskItem from "@/components/tasks/TaskItem";
import TaskSidebar from "@/components/tasks/TaskSidebar";
import {
  TaskNotFoundError,
  deleteTask,
  filterTasksByCategory,
  filterTasksByStatus,
  listTasks,
  reorderTasks,
  searchTasks,
  sortTasks,
  todayIsoDate,
  updateTask,
  type TaskCategoryFilter,
  type TaskSortKey,
  type TaskStatusFilter,
} from "@/lib/tasks";
import type { Task, TaskCategory, TaskPriority } from "@/types/task";

type Status = "loading" | "ready" | "error";

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    id: string;
    edge: "top" | "bottom";
  } | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const [todayIso] = useState(() => todayIsoDate());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategoryFilter>("all");
  const [sort, setSort] = useState<TaskSortKey>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("taskflow:sort-preference");
        if (
          saved === "manual" ||
          saved === "created" ||
          saved === "dueDate" ||
          saved === "priority"
        ) {
          return saved;
        }
      } catch {
        // ignore
      }
    }
    return "manual";
  });

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
      category?: TaskCategory | null;
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
    filterTasksByCategory(
      filterTasksByStatus(searchTasks(tasks, query), statusFilter),
      categoryFilter,
    ),
    sort,
  );

  function handleSortChange(newSort: TaskSortKey) {
    setSort(newSort);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("taskflow:sort-preference", newSort);
      } catch {
        // ignore
      }
    }
  }

  function handleDragStart(event: React.DragEvent<HTMLLIElement>, task: Task) {
    draggingIdRef.current = task.id;
    event.dataTransfer.setData("text/plain", task.id);
    event.dataTransfer.effectAllowed = "move";
    requestAnimationFrame(() => {
      setDraggingId(task.id);
    });
  }

  function handleDragOver(event: React.DragEvent<HTMLLIElement>, task: Task) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const sourceId = draggingIdRef.current || draggingId;
    if (sourceId === task.id) {
      if (dropIndicator !== null) {
        setDropIndicator(null);
      }
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const edge: "top" | "bottom" = event.clientY < midpoint ? "top" : "bottom";

    if (dropIndicator?.id !== task.id || dropIndicator?.edge !== edge) {
      setDropIndicator({ id: task.id, edge });
    }
  }

  function handleDragLeave(event: React.DragEvent<HTMLLIElement>, task: Task) {
    const related = event.relatedTarget as Node | null;
    if (!related || !event.currentTarget.contains(related)) {
      if (dropIndicator?.id === task.id) {
        setDropIndicator(null);
      }
    }
  }

  function handleDragEnd() {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDropIndicator(null);
  }

  async function handleDrop(
    event: React.DragEvent<HTMLLIElement>,
    targetTask: Task,
  ) {
    event.preventDefault();
    const sourceId = draggingIdRef.current || draggingId || event.dataTransfer.getData("text/plain");
    const currentIndicator = dropIndicator;

    draggingIdRef.current = null;
    setDraggingId(null);
    setDropIndicator(null);

    if (!sourceId || sourceId === targetTask.id) {
      return;
    }

    const fromIndex = visibleTasks.findIndex((t) => t.id === sourceId);
    const targetIndex = visibleTasks.findIndex((t) => t.id === targetTask.id);
    if (fromIndex === -1 || targetIndex === -1) {
      return;
    }

    const edge = currentIndicator?.id === targetTask.id ? currentIndicator.edge : "top";

    const reorderedVisible = [...visibleTasks];
    const [moved] = reorderedVisible.splice(fromIndex, 1);
    const newTargetIndex = reorderedVisible.findIndex((t) => t.id === targetTask.id);
    const insertIndex = edge === "top" ? newTargetIndex : newTargetIndex + 1;
    reorderedVisible.splice(insertIndex, 0, moved);

    const visibleIdSet = new Set(reorderedVisible.map((t) => t.id));
    const remainingTasks = tasks.filter((t) => !visibleIdSet.has(t.id));
    const combined = [...reorderedVisible, ...remainingTasks];

    // Synchronize order index directly in memory so UI never snaps back
    const updatedTasks = combined.map((task, index) => ({
      ...task,
      order: index,
    }));

    setTasks(updatedTasks);
    setSort("manual");
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("taskflow:sort-preference", "manual");
      } catch {
        // ignore
      }
    }

    try {
      await reorderTasks(updatedTasks.map((t) => t.id));
    } catch {
      setMutationError("Could not save task order. Please try again.");
      await load();
    }
  }

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    handleSortChange("manual");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-20">
      {/* Workspace Title Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Workspace</h1>
          <p className="mt-1 text-sm text-muted">
            Track daily tasks, deadlines, and priorities with browser-local privacy.
          </p>
        </div>
      </div>

      {/* Responsive Two-Column Layout */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left / Main Task Feed (8 cols on desktop) */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {status === "error" ? (
            <div className="rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger" role="alert">
              Could not load your tasks. Reload the page to try again.
            </div>
          ) : (
            <div className="rounded-2xl border border-border/80 bg-surface p-5 shadow-card transition-all">
              <TaskForm onAdded={refresh} onWriteError={setMutationError} />
            </div>
          )}

          {mutationError !== null && (
            <div className="rounded-xl border border-danger/40 bg-danger-soft p-3.5 text-sm text-danger" role="alert">
              {mutationError}
            </div>
          )}

          {status === "loading" && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              Loading tasks...
            </div>
          )}

          {status === "ready" && tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">No tasks yet</h3>
              <p className="mt-1 max-w-xs text-xs text-muted">
                Your workspace is clear. Add your first task above to start tracking your goals.
              </p>
            </div>
          )}

          {status === "ready" && tasks.length > 0 && (
            <>
              <TaskControls
                query={query}
                status={statusFilter}
                category={categoryFilter}
                sort={sort}
                disabled={pendingId !== null}
                onQueryChange={setQuery}
                onStatusChange={setStatusFilter}
                onCategoryChange={setCategoryFilter}
                onSortChange={handleSortChange}
              />

              {visibleTasks.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
                  <h3 className="text-sm font-semibold text-text">
                    No tasks match your view
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {query.trim() !== ""
                      ? `Nothing matches "${query.trim()}".`
                      : categoryFilter !== "all"
                      ? `No tasks found in the ${categoryFilter} category.`
                      : "No tasks match the active filters."}
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-control border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {visibleTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      todayIso={todayIso}
                      disabled={pendingId !== null}
                      isDragging={draggingId === task.id}
                      dropEdge={
                        dropIndicator?.id === task.id && draggingId !== task.id
                          ? dropIndicator.edge
                          : null
                      }
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      onToggle={handleToggle}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Right / Productivity Sidebar (4 cols on desktop) */}
        <div className="lg:col-span-4">
          <TaskSidebar tasks={tasks} todayIso={todayIso} />
        </div>
      </div>
    </main>
  );
}
