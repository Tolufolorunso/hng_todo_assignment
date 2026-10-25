"use client";

import { useEffect, useRef, useState } from "react";
import { createCapture } from "@/lib/inbox";
import { extractFirstUrl } from "@/lib/validation";
import type { InboxCapture } from "@/types/inbox";

interface FastCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptured?: (capture: InboxCapture) => void;
  initialText?: string;
  initialUrl?: string;
  initialSource?: string;
}

export default function FastCaptureModal({
  isOpen,
  onClose,
  onCaptured,
  initialText = "",
  initialUrl = "",
  initialSource = "Quick Capture",
}: FastCaptureModalProps) {
  const [text, setText] = useState(() => initialText);
  const [sourceAppLabel] = useState(initialSource);
  const [detectedUrl, setDetectedUrl] = useState<string | null>(
    () => initialUrl || extractFirstUrl(initialText)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSubmit();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function handleTextChange(val: string) {
    setText(val);
    setError(null);
    const foundUrl = extractFirstUrl(val);
    setDetectedUrl(foundUrl);
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please enter some text or a link to capture.");
      textareaRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const capture = await createCapture({
        text: trimmed,
        sharedUrl: detectedUrl,
        sourceAppLabel: sourceAppLabel || "Quick Capture",
      });

      setSuccess(true);
      onCaptured?.(capture);

      setTimeout(() => {
        onClose();
        setText("");
        setSuccess(false);
      }, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save capture.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fast-capture-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border/80 bg-surface p-5 shadow-2xl transition-all duration-150 scale-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </svg>
            </span>
            <div>
              <h2 id="fast-capture-title" className="text-sm font-bold text-foreground">
                Quick Capture
              </h2>
              <p className="text-[11px] text-muted">
                Save ideas, links, or notes instantly to your offline inbox
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
            aria-label="Close capture modal"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <textarea
              ref={textareaRef}
              rows={4}
              value={text}
              disabled={isSubmitting || success}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="What is on your mind? Paste a link, jot down a thought, or record a task..."
              className="w-full resize-none rounded-xl border border-border bg-surface-muted/40 p-3 text-xs leading-relaxed text-foreground placeholder:text-muted/60 focus:border-accent focus:bg-surface focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            />
          </div>

          {detectedUrl && (
            <div className="flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1.5 text-[11px] text-accent">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span className="font-medium shrink-0">Link detected:</span>
              <span className="truncate underline font-mono text-[10px]">{detectedUrl}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500 flex items-center gap-2"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-500 flex items-center gap-2 animate-in fade-in">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="font-semibold">Captured to Inbox!</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <kbd className="rounded border border-border/70 bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
              Ctrl+Enter
            </kbd>
            <span>to save</span>
            <span className="text-border">&bull;</span>
            <kbd className="rounded border border-border/70 bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
              Esc
            </kbd>
            <span>to cancel</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting || success}
              onClick={onClose}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || success}
              onClick={() => void handleSubmit()}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : success ? (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Saved</span>
                </>
              ) : (
                <span>Save to Inbox</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
