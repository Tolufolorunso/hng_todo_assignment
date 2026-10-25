import React, { useState, useEffect } from "react";
import type { TaskPriority, TaskCategory } from "../types/task.js";
import type { TaskRepository } from "../storage/taskRepository.js";
import { TouchButton } from "../components/primitives.js";

export interface TaskEditScreenProps {
  taskRepo: TaskRepository;
  taskId?: string;
  onDone: () => void;
  onCancel: () => void;
}

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const CATEGORIES: TaskCategory[] = ["work", "personal", "urgent", "study", "ideas"];

export function TaskEditScreen({
  taskRepo,
  taskId,
  onDone,
  onCancel,
}: TaskEditScreenProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (taskId) {
      taskRepo.getById(taskId).then((task) => {
        if (task) {
          setTitle(task.title);
          setDescription(task.description);
          setPriority(task.priority);
          setCategory(task.category);
          setDueDate(task.dueDate || "");
        }
      });
    }
  }, [taskId, taskRepo]);

  const handleSave = async () => {
    setErrorMessage(null);
    setSaving(true);
    try {
      if (taskId) {
        await taskRepo.update(taskId, {
          title,
          description,
          priority,
          category,
          dueDate: dueDate ? dueDate : null,
        });
      } else {
        await taskRepo.create({
          title,
          description,
          priority,
          category,
          dueDate: dueDate ? dueDate : null,
        });
      }
      onDone();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    if (confirm("Are you sure you want to delete this task?")) {
      await taskRepo.delete(taskId);
      onDone();
    }
  };

  return (
    <div
      role="region"
      aria-label={taskId ? "Edit task screen" : "New task screen"}
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
          marginBottom: "20px",
        }}
      >
        <TouchButton label="← Back" onPress={onCancel} variant="ghost" accessibilityLabel="Cancel and return to tasks" />
        <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: 0 }}>
          {taskId ? "Edit Task" : "New Task"}
        </h1>
        <TouchButton
          label={saving ? "Saving..." : "Save"}
          onPress={handleSave}
          disabled={saving}
          variant="primary"
          accessibilityLabel="Save task"
        />
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: "12px",
            backgroundColor: "#7f1d1d",
            color: "#fecaca",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Title Input */}
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="task-title"
          style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#a1a1aa", marginBottom: "6px" }}
        >
          Title *
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title (e.g. Finish report)"
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #3f3f46",
            backgroundColor: "#18181b",
            color: "#ffffff",
            fontSize: "15px",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Description Input */}
      <div style={{ marginBottom: "16px" }}>
        <label
          htmlFor="task-desc"
          style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#a1a1aa", marginBottom: "6px" }}
        >
          Description
        </label>
        <textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes or details"
          rows={3}
          style={{
            width: "100%",
            minHeight: "88px",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #3f3f46",
            backgroundColor: "#18181b",
            color: "#ffffff",
            fontSize: "14px",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
      </div>

      {/* Priority Selector */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#a1a1aa", marginBottom: "6px" }}>
          Priority
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={priority === p}
              onClick={() => setPriority(p)}
              style={{
                flex: 1,
                minHeight: "44px",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: priority === p ? "#3b82f6" : "#3f3f46",
                backgroundColor: priority === p ? "#1e3a8a" : "#18181b",
                color: priority === p ? "#93c5fd" : "#a1a1aa",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Category Selector */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#a1a1aa", marginBottom: "6px" }}>
          Category
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setCategory(null)}
            style={{
              minHeight: "44px",
              padding: "6px 12px",
              borderRadius: "9999px",
              border: "1px solid",
              borderColor: category === null ? "#3b82f6" : "#3f3f46",
              backgroundColor: category === null ? "#1e3a8a" : "#18181b",
              color: category === null ? "#93c5fd" : "#a1a1aa",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            None
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              style={{
                minHeight: "44px",
                padding: "6px 12px",
                borderRadius: "9999px",
                border: "1px solid",
                borderColor: category === cat ? "#3b82f6" : "#3f3f46",
                backgroundColor: category === cat ? "#1e3a8a" : "#18181b",
                color: category === cat ? "#93c5fd" : "#a1a1aa",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Due Date Input */}
      <div style={{ marginBottom: "24px" }}>
        <label
          htmlFor="task-due-date"
          style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#a1a1aa", marginBottom: "6px" }}
        >
          Due Date (YYYY-MM-DD)
        </label>
        <input
          id="task-due-date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #3f3f46",
            backgroundColor: "#18181b",
            color: "#ffffff",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Delete Action if editing */}
      {taskId && (
        <div style={{ marginTop: "auto", paddingTop: "24px" }}>
          <TouchButton
            label="Delete Task"
            onPress={handleDelete}
            variant="danger"
            accessibilityLabel="Delete this task permanently"
          />
        </div>
      )}
    </div>
  );
}
