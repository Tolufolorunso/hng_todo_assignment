"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  FollowUp,
  CreateFollowUpInput,
  RecurrenceFrequency,
  RecurrenceMode,
  PreferredAction,
} from "@/types/followup";

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateFollowUpInput) => Promise<void>;
  initialData?: FollowUp | null;
}

function toLocalDatetimeString(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const WEEKDAY_NAMES = [
  { day: 0, label: "Sun" },
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
];

export default function FollowUpModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: FollowUpModalProps) {
  const [personName, setPersonName] = useState(() => initialData?.personName ?? "");
  const [commitment, setCommitment] = useState(() => initialData?.commitment ?? "");
  const [details, setDetails] = useState(() => initialData?.details ?? "");
  const [dueAtLocal, setDueAtLocal] = useState(() => {
    if (initialData?.dueAt) return toLocalDatetimeString(initialData.dueAt);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toLocalDatetimeString(tomorrow.toISOString());
  });
  const [emailAddress, setEmailAddress] = useState(() => initialData?.emailAddress ?? "");
  const [phoneNumber, setPhoneNumber] = useState(() => initialData?.phoneNumber ?? "");
  const [whatsAppNumber, setWhatsAppNumber] = useState(() => initialData?.whatsAppNumber ?? "");
  const [preferredAction, setPreferredAction] = useState<PreferredAction | "">(
    () => initialData?.preferredAction ?? ""
  );

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(() => Boolean(initialData?.recurrence));
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    () => initialData?.recurrence?.frequency ?? "weekly"
  );
  const [interval, setIntervalVal] = useState(() => initialData?.recurrence?.interval ?? 1);
  const [mode, setMode] = useState<RecurrenceMode>(
    () => initialData?.recurrence?.mode ?? "calendarAnchored"
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(
    () => initialData?.recurrence?.weekdays ?? []
  );
  const [endDate, setEndDate] = useState(() => initialData?.recurrence?.endDate ?? "");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  function toggleWeekday(day: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!personName.trim()) {
      setError("Please enter the contact or person name.");
      return;
    }

    if (!commitment.trim()) {
      setError("Please describe the commitment or follow-up action.");
      return;
    }

    if (!dueAtLocal) {
      setError("Please select a due date and time.");
      return;
    }

    const parsedDue = new Date(dueAtLocal);
    if (Number.isNaN(parsedDue.getTime())) {
      setError("Please select a valid date and time.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateFollowUpInput = {
        personName: personName.trim(),
        commitment: commitment.trim(),
        details: details.trim() ? details.trim() : null,
        dueAt: parsedDue.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        emailAddress: emailAddress.trim() ? emailAddress.trim() : null,
        phoneNumber: phoneNumber.trim() ? phoneNumber.trim() : null,
        whatsAppNumber: whatsAppNumber.trim() ? whatsAppNumber.trim() : null,
        preferredAction: preferredAction ? (preferredAction as PreferredAction) : null,
        recurrence: isRecurring
          ? {
              frequency,
              interval: Math.max(1, Number(interval) || 1),
              mode,
              weekdays: frequency === "weekly" && selectedWeekdays.length > 0 ? selectedWeekdays : undefined,
              monthDay: frequency === "monthly" ? parsedDue.getDate() : undefined,
              endDate: endDate ? new Date(endDate).toISOString() : undefined,
            }
          : null,
        sourceNoteId: initialData?.sourceNoteId || null,
        sourceExcerpt: initialData?.sourceExcerpt || null,
      };

      await onSave(payload);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save follow-up commitment.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="followup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="followup-modal-title" className="text-lg font-semibold text-text">
            {initialData ? "Edit Follow Up" : "New Follow Up"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-text transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Source Note Context */}
        {initialData?.sourceNoteId && (
          <div className="mx-6 mt-4 rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs flex items-start gap-2.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent shrink-0 mt-0.5"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Linked to Note</span>
                <Link
                  href={`/notes?id=${encodeURIComponent(initialData.sourceNoteId)}`}
                  className="text-accent hover:underline font-medium"
                >
                  View Note
                </Link>
              </div>
              {initialData.sourceExcerpt && (
                <p className="italic text-[11px] text-muted line-clamp-2">
                  &ldquo;{initialData.sourceExcerpt}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 font-medium">
              {error}
            </div>
          )}

          {/* Person Name */}
          <div>
            <label htmlFor="personName" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Person or Contact <span className="text-rose-500">*</span>
            </label>
            <input
              id="personName"
              type="text"
              required
              maxLength={200}
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="e.g. Sarah Connor, Dr. Peterson"
              className="w-full rounded-xl border border-border bg-surface-muted/60 px-3.5 py-2.5 text-sm text-text placeholder-muted/60 focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          {/* Commitment */}
          <div>
            <label htmlFor="commitment" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Commitment / Follow Up <span className="text-rose-500">*</span>
            </label>
            <input
              id="commitment"
              type="text"
              required
              maxLength={500}
              value={commitment}
              onChange={(e) => setCommitment(e.target.value)}
              placeholder="e.g. Send updated budget proposal, review draft"
              className="w-full rounded-xl border border-border bg-surface-muted/60 px-3.5 py-2.5 text-sm text-text placeholder-muted/60 focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          {/* Due Date & Time */}
          <div>
            <label htmlFor="dueAtLocal" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Due Date & Time <span className="text-rose-500">*</span>
            </label>
            <input
              id="dueAtLocal"
              type="datetime-local"
              required
              value={dueAtLocal}
              onChange={(e) => setDueAtLocal(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-muted/60 px-3.5 py-2.5 text-sm text-text focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          {/* Details / Notes */}
          <div>
            <label htmlFor="details" className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Details & Context
            </label>
            <textarea
              id="details"
              rows={3}
              maxLength={5000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Include background context, links, or discussion notes..."
              className="w-full rounded-xl border border-border bg-surface-muted/60 px-3.5 py-2.5 text-sm text-text placeholder-muted/60 focus:border-accent focus:outline-hidden focus:ring-1 focus:ring-accent transition-colors resize-none"
            />
          </div>

          {/* Contact Details & Launchers */}
          <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">
              Communication Launchers (Optional)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="emailAddress" className="block text-[11px] font-medium text-muted mb-1">
                  Email
                </label>
                <input
                  id="emailAddress"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text placeholder-muted/50 focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-[11px] font-medium text-muted mb-1">
                  Phone
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text placeholder-muted/50 focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="whatsAppNumber" className="block text-[11px] font-medium text-muted mb-1">
                  WhatsApp
                </label>
                <input
                  id="whatsAppNumber"
                  type="tel"
                  value={whatsAppNumber}
                  onChange={(e) => setWhatsAppNumber(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text placeholder-muted/50 focus:border-accent focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label htmlFor="preferredAction" className="block text-[11px] font-medium text-muted mb-1">
                Preferred Action Launcher
              </label>
              <select
                id="preferredAction"
                value={preferredAction}
                onChange={(e) => setPreferredAction(e.target.value as PreferredAction | "")}
                className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-accent focus:outline-hidden"
              >
                <option value="">None (manual launcher choice)</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone call</option>
              </select>
            </div>
          </div>

          {/* Recurrence Settings */}
          <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="isRecurring" className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="isRecurring"
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-border text-accent focus:ring-accent"
                />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Recurring Commitment
                </span>
              </label>
            </div>

            {isRecurring && (
              <div className="pt-2 space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="frequency" className="block text-[11px] font-medium text-muted mb-1">
                      Frequency
                    </label>
                    <select
                      id="frequency"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                      className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-accent focus:outline-hidden"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="customDays">Every N days</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="interval" className="block text-[11px] font-medium text-muted mb-1">
                      Interval ({frequency === "daily" ? "days" : frequency === "weekly" ? "weeks" : frequency === "monthly" ? "months" : "days"})
                    </label>
                    <input
                      id="interval"
                      type="number"
                      min={1}
                      max={365}
                      value={interval}
                      onChange={(e) => setIntervalVal(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-accent focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="mode" className="block text-[11px] font-medium text-muted mb-1">
                    Scheduling Mode
                  </label>
                  <select
                    id="mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as RecurrenceMode)}
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-accent focus:outline-hidden"
                  >
                    <option value="calendarAnchored">
                      Calendar-anchored (strict schedule, preserves planned calendar slot)
                    </option>
                    <option value="completionRelative">
                      Completion-relative (advances from the day completed)
                    </option>
                  </select>
                </div>

                {frequency === "weekly" && (
                  <div>
                    <span className="block text-[11px] font-medium text-muted mb-1.5">
                      Specific Weekdays (Optional)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAY_NAMES.map(({ day, label }) => {
                        const isSelected = selectedWeekdays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleWeekday(day)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                              isSelected
                                ? "bg-accent text-white font-semibold"
                                : "border border-border bg-surface text-muted hover:bg-surface-muted hover:text-text"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="endDate" className="block text-[11px] font-medium text-muted mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-text focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? "Saving..." : initialData ? "Save Changes" : "Create Follow Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
