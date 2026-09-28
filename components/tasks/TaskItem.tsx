"use client";

import type { Task } from "@/types/task";

interface TaskItemProps {
  task: Task;
  disabled: boolean;
  onToggle: (task: Task, completed: boolean) => void;
}

export default function TaskItem({ task, disabled, onToggle }: TaskItemProps) {
  const checkboxId = `task-${task.id}`;

  return (
    <li className="flex items-center gap-3 rounded-xl border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
      <input
        id={checkboxId}
        type="checkbox"
        checked={task.completed}
        disabled={disabled}
        onChange={(event) => onToggle(task, event.target.checked)}
        className="h-4 w-4 shrink-0 accent-indigo-600"
      />
      <label
        htmlFor={checkboxId}
        className={
          task.completed
            ? "cursor-pointer text-sm text-zinc-500 line-through dark:text-zinc-400"
            : "cursor-pointer text-sm"
        }
      >
        {task.title}
      </label>
    </li>
  );
}
