"use client";

import { useCallback, useEffect, useState } from "react";
import TaskForm from "@/components/tasks/TaskForm";
import TaskItem from "@/components/tasks/TaskItem";
import { TaskNotFoundError, listTasks, updateTask } from "@/lib/tasks";
import type { Task } from "@/types/task";

type Status = "loading" | "ready" | "error";

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>

      {status === "error" ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Could not load your tasks. Reload the page to try again.
        </p>
      ) : (
        <TaskForm onAdded={refresh} onWriteError={setMutationError} />
      )}

      {mutationError !== null && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {mutationError}
        </p>
      )}

      {status === "loading" && (
        <p role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
          Loading tasks...
        </p>
      )}

      {status === "ready" && tasks.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No tasks yet.</p>
      )}

      {status === "ready" && tasks.length > 0 && (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              disabled={pendingId !== null}
              onToggle={handleToggle}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
