"use client";

import { useState } from "react";
import type { FollowUp } from "@/types/followup";
import { isFollowUpOverdue } from "@/lib/recurrence";
import { buildEmailUri, buildWhatsAppUri, buildPhoneUri } from "@/lib/launchers";

interface FollowUpCardProps {
  followUp: FollowUp;
  onComplete: (followUp: FollowUp) => Promise<void>;
  onSkip: (followUp: FollowUp) => Promise<void>;
  onSnooze: (followUp: FollowUp, option: string) => Promise<void>;
  onOpenReschedule: (followUp: FollowUp) => void;
  onOpenEdit: (followUp: FollowUp) => void;
  onOpenHistory: (followUp: FollowUp) => void;
  onDelete: (followUp: FollowUp) => Promise<void>;
}

function formatDueDate(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRecurrenceLabel(followUp: FollowUp): string | null {
  const r = followUp.recurrence;
  if (!r) return null;

  const intervalPart = r.interval && r.interval > 1 ? `Every ${r.interval} ` : "Every ";
  let freqName = "";
  if (r.frequency === "daily") freqName = r.interval && r.interval > 1 ? "days" : "day";
  else if (r.frequency === "weekly") freqName = r.interval && r.interval > 1 ? "weeks" : "week";
  else if (r.frequency === "monthly") freqName = r.interval && r.interval > 1 ? "months" : "month";
  else if (r.frequency === "customDays") freqName = `${r.interval || 1} days`;

  const modeName = r.mode === "calendarAnchored" ? "Calendar-anchored" : "Completion-relative";
  return `${intervalPart}${freqName} (${modeName})`;
}

export default function FollowUpCard({
  followUp,
  onComplete,
  onSkip,
  onSnooze,
  onOpenReschedule,
  onOpenEdit,
  onOpenHistory,
  onDelete,
}: FollowUpCardProps) {
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [isConfirmDelete, setIsConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOverdue = isFollowUpOverdue(followUp.dueAt, followUp.status);
  const isCompleted = followUp.status === "completed";
  const recurrenceLabel = getRecurrenceLabel(followUp);

  // Communication launchers
  const emailUri = followUp.emailAddress
    ? buildEmailUri({
        to: followUp.emailAddress,
        subject: `Follow Up: ${followUp.commitment}`,
        body: followUp.details ? `Hi ${followUp.personName},\n\nFollowing up on: ${followUp.commitment}\n\n${followUp.details}` : undefined,
      })
    : null;

  const whatsAppUri = followUp.whatsAppNumber
    ? buildWhatsAppUri({
        phone: followUp.whatsAppNumber,
        message: `Hi ${followUp.personName}, following up on: ${followUp.commitment}`,
      })
    : null;

  const phoneUri = followUp.phoneNumber
    ? buildPhoneUri(followUp.phoneNumber)
    : null;

  let preferredLauncherUri: string | null = null;
  let preferredLauncherLabel = "";
  if (followUp.preferredAction === "email" && emailUri) {
    preferredLauncherUri = emailUri;
    preferredLauncherLabel = "Email";
  } else if (followUp.preferredAction === "whatsapp" && whatsAppUri) {
    preferredLauncherUri = whatsAppUri;
    preferredLauncherLabel = "WhatsApp";
  } else if (followUp.preferredAction === "phone" && phoneUri) {
    preferredLauncherUri = phoneUri;
    preferredLauncherLabel = "Call";
  }

  async function handleToggleComplete() {
    setBusy(true);
    try {
      await onComplete(followUp);
    } finally {
      setBusy(false);
    }
  }

  async function handleSnoozeOption(option: string) {
    setIsSnoozeOpen(false);
    setBusy(true);
    try {
      await onSnooze(followUp, option);
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    setBusy(true);
    try {
      await onSkip(followUp);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteConfirmed() {
    setBusy(true);
    try {
      await onDelete(followUp);
    } finally {
      setBusy(false);
      setIsConfirmDelete(false);
    }
  }

  return (
    <div
      className={`group relative rounded-2xl border p-5 shadow-xs transition-all hover:shadow-md ${
        isCompleted
          ? "border-border/60 bg-surface/40 opacity-75"
          : isOverdue
          ? "border-rose-500/40 bg-surface ring-1 ring-rose-500/15"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left Side: Checkbox & Main Info */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleToggleComplete}
            disabled={busy}
            aria-label={isCompleted ? "Mark follow up incomplete" : "Mark follow up completed"}
            className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
              isCompleted
                ? "border-emerald-500 bg-emerald-500 text-white"
                : isOverdue
                ? "border-rose-500/60 hover:border-emerald-500 hover:bg-emerald-500/10"
                : "border-border hover:border-accent hover:bg-accent/10"
            }`}
          >
            {isCompleted && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Person & Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-text tracking-tight">
                {followUp.personName}
              </h3>

              {isOverdue && !isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-500 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Overdue
                </span>
              )}

              {isCompleted && (
                <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-400">
                  Completed
                </span>
              )}

              {recurrenceLabel && (
                <span className="inline-flex items-center gap-1 rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  {recurrenceLabel}
                </span>
              )}
            </div>

            {/* Commitment */}
            <p className={`text-sm leading-snug ${isCompleted ? "text-muted line-through" : "text-text"}`}>
              {followUp.commitment}
            </p>

            {/* Details */}
            {followUp.details && (
              <p className="text-xs text-muted leading-relaxed line-clamp-2">
                {followUp.details}
              </p>
            )}

            {/* Scheduled Date */}
            <div className="flex items-center gap-2 pt-1 text-xs text-muted">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={isOverdue && !isCompleted ? "text-rose-500" : "text-faint"}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className={isOverdue && !isCompleted ? "font-semibold text-rose-500" : ""}>
                Due: {formatDueDate(followUp.dueAt)}
              </span>
            </div>

            {/* Communication Action Launchers */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {preferredLauncherUri && (
                <a
                  href={preferredLauncherUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${preferredLauncherLabel} ${followUp.personName}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/25 transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  <span>{preferredLauncherLabel}</span>
                </a>
              )}

              {emailUri && followUp.preferredAction !== "email" && (
                <a
                  href={emailUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Email ${followUp.personName}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted/50 px-2 py-1 text-xs text-muted hover:text-text hover:bg-surface-muted transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <span>Email</span>
                </a>
              )}

              {whatsAppUri && followUp.preferredAction !== "whatsapp" && (
                <a
                  href={whatsAppUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp message ${followUp.personName}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted/50 px-2 py-1 text-xs text-muted hover:text-text hover:bg-surface-muted transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <span>WhatsApp</span>
                </a>
              )}

              {phoneUri && followUp.preferredAction !== "phone" && (
                <a
                  href={phoneUri}
                  aria-label={`Call ${followUp.personName}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted/50 px-2 py-1 text-xs text-muted hover:text-text hover:bg-surface-muted transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span>Call</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action Menus */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {/* Snooze Dropdown */}
            {!isCompleted && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSnoozeOpen(!isSnoozeOpen)}
                  aria-label="Snooze follow up"
                  title="Snooze"
                  className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-text transition-colors"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10 2h4M12 14v-4M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 22" />
                  </svg>
                </button>

                {isSnoozeOpen && (
                  <div className="absolute right-0 top-8 z-30 w-36 rounded-xl border border-border bg-surface p-1.5 shadow-xl animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => handleSnoozeOption("1hour")}
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-text hover:bg-surface-muted transition-colors"
                    >
                      +1 Hour
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSnoozeOption("tomorrow")}
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-text hover:bg-surface-muted transition-colors"
                    >
                      Tomorrow 9am
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSnoozeOption("nextWeek")}
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-text hover:bg-surface-muted transition-colors"
                    >
                      Next Week
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Reschedule Button */}
            {!isCompleted && (
              <button
                type="button"
                onClick={() => onOpenReschedule(followUp)}
                aria-label="Reschedule follow up"
                title="Reschedule"
                className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-text transition-colors"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>
            )}

            {/* Skip Occurrence Button (if recurring) */}
            {followUp.recurrence && !isCompleted && (
              <button
                type="button"
                onClick={handleSkip}
                aria-label="Skip this occurrence"
                title="Skip this occurrence"
                className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-text transition-colors"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="5 4 15 12 5 20 5 4" />
                  <line x1="19" y1="5" x2="19" y2="19" />
                </svg>
              </button>
            )}

            {/* History Button */}
            <button
              type="button"
              onClick={() => onOpenHistory(followUp)}
              aria-label="View occurrence history"
              title="Occurrence History"
              className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-text transition-colors"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </button>

            {/* Edit Button */}
            <button
              type="button"
              onClick={() => onOpenEdit(followUp)}
              aria-label="Edit follow up"
              title="Edit"
              className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-text transition-colors"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => setIsConfirmDelete(true)}
              aria-label="Delete follow up"
              title="Delete"
              className="rounded-lg p-1.5 text-muted hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation for Delete */}
      {isConfirmDelete && (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs animate-in fade-in duration-150">
          <div className="font-semibold text-rose-500">
            Delete this follow-up and its occurrence history?
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmDelete(false)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirmed}
              disabled={busy}
              className="rounded-lg bg-rose-500 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
