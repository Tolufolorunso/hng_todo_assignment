import React from "react";
import type { Task } from "../types/task.js";
import { Badge } from "./primitives.js";

export interface TaskItemCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onPress: (id: string) => void;
}

export function TaskItemCard({
  task,
  onToggleComplete,
  onPress,
}: TaskItemCardProps): React.JSX.Element {
  return (
    <div
      role="article"
      aria-label={`Task: ${task.title}`}
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: "12px",
        marginBottom: "8px",
        backgroundColor: "#18181b",
        border: "1px solid #27272a",
        borderRadius: "12px",
        gap: "12px",
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
        onClick={() => onToggleComplete(task.id)}
        style={{
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
          touchAction: "manipulation",
          padding: 0,
        }}
      >
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "6px",
            border: task.completed ? "none" : "2px solid #52525b",
            backgroundColor: task.completed ? "#3b82f6" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: "bold",
          }}
        >
          {task.completed ? "✓" : ""}
        </div>
      </button>

      <div
        onClick={() => onPress(task.id)}
        role="button"
        tabIndex={0}
        aria-label={`Edit task ${task.title}`}
        style={{
          flex: 1,
          cursor: "pointer",
          minHeight: "44px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: "15px",
            fontWeight: 500,
            color: task.completed ? "#71717a" : "#f4f4f5",
            textDecoration: task.completed ? "line-through" : "none",
            marginBottom: "4px",
          }}
        >
          {task.title}
        </div>

        {task.description ? (
          <div
            style={{
              fontSize: "13px",
              color: "#a1a1aa",
              marginBottom: "8px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {task.description}
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          <Badge label={task.priority} variant={task.priority} />
          {task.category ? <Badge label={task.category} variant="category" /> : null}
          {task.dueDate ? (
            <span
              style={{
                fontSize: "11px",
                color: "#a1a1aa",
                marginLeft: "4px",
              }}
            >
              Due {task.dueDate}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
