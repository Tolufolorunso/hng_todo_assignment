import React, { useState, useEffect } from "react";
import type { Task, TaskCategory } from "../types/task.js";
import type { TaskRepository } from "../storage/taskRepository.js";
import { TaskItemCard } from "../components/TaskItemCard.js";
import { TouchButton, EmptyState } from "../components/primitives.js";

export interface TasksScreenProps {
  taskRepo: TaskRepository;
  onNavigateToEdit: (taskId?: string) => void;
}

const CATEGORIES: (TaskCategory | "all")[] = ["all", "work", "personal", "urgent", "study", "ideas"];

export function TasksScreen({ taskRepo, onNavigateToEdit }: TasksScreenProps): React.JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");

  const loadTasks = async () => {
    setLoading(true);
    try {
      const all = await taskRepo.list();
      setTasks(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleToggleComplete = async (id: string) => {
    await taskRepo.toggleComplete(id);
    await loadTasks();
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === "active" && t.completed) return false;
    if (statusFilter === "completed" && !t.completed) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div
      role="region"
      aria-label="Tasks screen"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#09090b",
        color: "#f4f4f5",
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>Tasks</h1>
        <TouchButton
          label="+ New Task"
          onPress={() => onNavigateToEdit()}
          variant="primary"
          accessibilityLabel="Create a new task"
        />
      </div>

      {/* Status Filter Tabs */}
      <div
        role="tablist"
        aria-label="Filter tasks by completion status"
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "12px",
          backgroundColor: "#18181b",
          padding: "4px",
          borderRadius: "8px",
        }}
      >
        {(["all", "active", "completed"] as const).map((status) => (
          <button
            key={status}
            role="tab"
            aria-selected={statusFilter === status}
            onClick={() => setStatusFilter(status)}
            style={{
              flex: 1,
              minHeight: "44px",
              border: "none",
              borderRadius: "6px",
              backgroundColor: statusFilter === status ? "#27272a" : "transparent",
              color: statusFilter === status ? "#ffffff" : "#a1a1aa",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Category Filter Chips */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          paddingBottom: "12px",
          marginBottom: "12px",
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              minHeight: "44px",
              padding: "4px 12px",
              borderRadius: "9999px",
              border: "1px solid",
              borderColor: categoryFilter === cat ? "#3b82f6" : "#27272a",
              backgroundColor: categoryFilter === cat ? "#1e3a8a" : "#18181b",
              color: categoryFilter === cat ? "#93c5fd" : "#a1a1aa",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              textTransform: "capitalize",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "32px", color: "#a1a1aa" }}>Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description={
            statusFilter !== "all" || categoryFilter !== "all"
              ? "Try clearing filters to see more tasks."
              : "Capture your first task to start planning your day."
          }
          actionLabel="+ Create Task"
          onAction={() => onNavigateToEdit()}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filteredTasks.map((task) => (
            <TaskItemCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onPress={onNavigateToEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
