"use client";

import { useEffect, useState } from "react";
import { createTask } from "@/lib/tasks";
import { createFollowUp } from "@/lib/followups";
import type { TaskCategory, TaskPriority } from "@/types/task";
import type { PreferredAction } from "@/types/followup";

interface ActionCreationModalProps {
  onClose: () => void;
  noteId: string;
  noteTitle: string;
  initialExcerpt?: string;
  onActionCreated?: () => void;
}

type ActionMode = "task" | "followup";

function toTomorrowDatetimeString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  const hours = String(tomorrow.getHours()).padStart(2, "0");
  const minutes = String(tomorrow.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function truncateForTitle(text: string, maxLen = 80): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen);
}

export default function ActionCreationModal({
  onClose,
  noteId,
  noteTitle,
  initialExcerpt = "",
  onActionCreated,
}: ActionCreationModalProps) {
  const [mode, setMode] = useState<ActionMode>("task");
  const [excerpt, setExcerpt] = useState(initialExcerpt);

  // Task form fields
  const [taskTitle, setTaskTitle] = useState(
    () => truncateForTitle(initialExcerpt) || `Follow up on: ${truncateForTitle(noteTitle, 40)}`
  );
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskCategory, setTaskCategory] = useState<TaskCategory | "">("");
  const [taskEstimatedMinutes, setTaskEstimatedMinutes] = useState("");

  // Follow-up form fields
  const [personName, setPersonName] = useState("");
  const [commitment, setCommitment] = useState(
    () => truncateForTitle(initialExcerpt) || `Review ${truncateForTitle(noteTitle, 40)}`
  );
  const [details, setDetails] = useState("");
  const [dueAtLocal, setDueAtLocal] = useState(() => toTomorrowDatetimeString());
  const [preferredAction, setPreferredAction] = useState<PreferredAction | "">("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!taskTitle.trim()) {
      setError("Task title is required.");
      return;
    }

    setBusy(true);
    try {
      const minutesVal = taskEstimatedMinutes.trim() ? parseInt(taskEstimatedMinutes.trim(), 10) : null;
      await createTask({
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        priority: taskPriority,
        dueDate: taskDueDate || null,
        category: (taskCategory as TaskCategory) || null,
        estimatedMinutes: Number.isFinite(minutesVal) ? minutesVal : null,
        sourceNoteId: noteId,
        sourceExcerpt: excerpt.trim() || null,
      });

      onActionCreated?.();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create task.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateFollowUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!personName.trim()) {
      setError("Person name is required.");
      return;
    }
    if (!commitment.trim()) {
      setError("Commitment description is required.");
      return;
    }
    if (!dueAtLocal) {
      setError("Due date and time is required.");
      return;
    }

    setBusy(true);
    try {
      const parsedDate = new Date(dueAtLocal);
      await createFollowUp({
        personName: personName.trim(),
        commitment: commitment.trim(),
        details: details.trim() || null,
        dueAt: parsedDate.toISOString(),
        preferredAction: preferredAction || null,
        emailAddress: emailAddress.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        whatsAppNumber: whatsAppNumber.trim() || null,
        sourceNoteId: noteId,
        sourceExcerpt: excerpt.trim() || null,
      });

      onActionCreated?.();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create follow up.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-creation-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent font-semibold">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h2 id="action-creation-title" className="text-lg font-bold text-foreground">
                Create Action from Note
              </h2>
              <p className="text-xs text-muted">
                Source: <span className="text-foreground font-medium">{noteTitle || "Untitled Note"}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Context snapshot snippet */}
        <div className="rounded-xl border border-border/80 bg-surface-muted/50 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Context Snapshot (Preserved from note)
            </span>
            <span className="text-[11px] text-muted">
              {excerpt.length} / 2000
            </span>
          </div>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value.slice(0, 2000))}
            rows={2}
            className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-hidden"
            placeholder="Selected text or relevant context from note"
          />
        </div>

        {/* Action mode selector tabs */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1 border border-border/60">
          <button
            type="button"
            onClick={() => setMode("task")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "task"
                ? "bg-surface text-foreground shadow-xs border border-border/80"
                : "text-muted hover:text-foreground"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span>Create Task</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("followup")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "followup"
                ? "bg-surface text-foreground shadow-xs border border-border/80"
                : "text-muted hover:text-foreground"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Create Follow Up</span>
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Task Form */}
        {mode === "task" && (
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label htmlFor="task-title" className="block text-xs font-medium text-foreground mb-1">
                Task Title *
              </label>
              <input
                id="task-title"
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                maxLength={200}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-hidden"
                placeholder="What needs to be done?"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="task-priority" className="block text-xs font-medium text-foreground mb-1">
                  Priority
                </label>
                <select
                  id="task-priority"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div>
                <label htmlFor="task-due-date" className="block text-xs font-medium text-foreground mb-1">
                  Due Date
                </label>
                <input
                  id="task-due-date"
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="task-category" className="block text-xs font-medium text-foreground mb-1">
                  Category
                </label>
                <select
                  id="task-category"
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as TaskCategory | "")}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
                >
                  <option value="">No Category</option>
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="urgent">Urgent</option>
                  <option value="study">Study</option>
                  <option value="ideas">Ideas</option>
                </select>
              </div>

              <div>
                <label htmlFor="task-estimate" className="block text-xs font-medium text-foreground mb-1">
                  Estimated Minutes (Optional)
                </label>
                <input
                  id="task-estimate"
                  type="number"
                  min={1}
                  max={1440}
                  value={taskEstimatedMinutes}
                  onChange={(e) => setTaskEstimatedMinutes(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label htmlFor="task-description" className="block text-xs font-medium text-foreground mb-1">
                Description / Notes (Optional)
              </label>
              <textarea
                id="task-description"
                rows={2}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                maxLength={20000}
                placeholder="Additional instructions or checklist"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {busy ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        )}

        {/* Follow Up Form */}
        {mode === "followup" && (
          <form onSubmit={handleCreateFollowUp} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="followup-person" className="block text-xs font-medium text-foreground mb-1">
                  Person Name *
                </label>
                <input
                  id="followup-person"
                  type="text"
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="followup-due" className="block text-xs font-medium text-foreground mb-1">
                  Due Date & Time *
                </label>
                <input
                  id="followup-due"
                  type="datetime-local"
                  required
                  value={dueAtLocal}
                  onChange={(e) => setDueAtLocal(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label htmlFor="followup-commitment" className="block text-xs font-medium text-foreground mb-1">
                Commitment / Reason *
              </label>
              <input
                id="followup-commitment"
                type="text"
                required
                value={commitment}
                onChange={(e) => setCommitment(e.target.value)}
                maxLength={500}
                placeholder="What did you promise or need to check on?"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="followup-channel" className="block text-xs font-medium text-foreground mb-1">
                  Preferred Channel
                </label>
                <select
                  id="followup-channel"
                  value={preferredAction}
                  onChange={(e) => setPreferredAction(e.target.value as PreferredAction | "")}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
                >
                  <option value="">No preference</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Phone Call</option>
                </select>
              </div>

              <div>
                <label htmlFor="followup-email" className="block text-xs font-medium text-foreground mb-1">
                  Email Address
                </label>
                <input
                  id="followup-email"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="followup-phone" className="block text-xs font-medium text-foreground mb-1">
                  Phone Number
                </label>
                <input
                  id="followup-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="followup-whatsapp" className="block text-xs font-medium text-foreground mb-1">
                  WhatsApp Number
                </label>
                <input
                  id="followup-whatsapp"
                  type="tel"
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label htmlFor="followup-details" className="block text-xs font-medium text-foreground mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                id="followup-details"
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={5000}
                placeholder="Background notes or context"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:border-accent focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {busy ? "Creating..." : "Create Follow Up"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
