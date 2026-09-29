"use client";

import { useEffect, useState } from "react";
import {
  exportDatabaseBackup,
  parseAndValidateBackup,
  restoreDatabaseBackup,
  triggerDownload,
  type BackupPayload,
  type RestoreMode,
} from "@/lib/backup";
import { getDb } from "@/lib/db";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export default function BackupModal({
  isOpen,
  onClose,
  onDataRestored,
}: BackupModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "restore">("export");

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [workspaceStats, setWorkspaceStats] = useState<{ tasks: number; notes: number }>({
    tasks: 0,
    notes: 0,
  });
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Restore State
  const [file, setFile] = useState<File | null>(null);
  const [validatedPayload, setValidatedPayload] = useState<BackupPayload | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("merge");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  // Load workspace counts when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    void getDb().then(async (db) => {
      const taskCount = await db.count("tasks");
      const noteCount = await db.count("notes");
      if (mounted) {
        setWorkspaceStats({ tasks: taskCount, notes: noteCount });
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleExport() {
    setIsExporting(true);
    setExportSuccess(null);
    try {
      const { jsonString, filename } = await exportDatabaseBackup();
      triggerDownload(jsonString, filename);
      setExportSuccess(`Backup saved as ${filename}`);
    } catch {
      setValidationError("Failed to generate backup export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    setValidationError(null);
    setValidatedPayload(null);
    setRestoreSuccess(null);

    try {
      const text = await selectedFile.text();
      const result = parseAndValidateBackup(text);
      if (result.ok) {
        setValidatedPayload(result.value);
      } else {
        setValidationError(result.error);
      }
    } catch {
      setValidationError("Could not read the selected file. Please select a valid JSON backup.");
    }
  }

  async function handleRestore() {
    if (!validatedPayload || isRestoring) return;
    if (restoreMode === "replace" && !confirmReplace) return;

    setIsRestoring(true);
    setValidationError(null);
    try {
      const result = await restoreDatabaseBackup(validatedPayload, restoreMode);
      setRestoreSuccess(
        `Successfully restored ${result.tasksCount} tasks and ${result.notesCount} notes.`,
      );
      setValidatedPayload(null);
      setFile(null);
      setConfirmReplace(false);

      if (onDataRestored) {
        onDataRestored();
      } else {
        // Trigger fresh reload to update all views
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch {
      setValidationError("Failed to restore data from backup. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <h2 id="backup-modal-title" className="text-base font-bold text-text">
                Backup & Restore
              </h2>
              <p className="text-xs text-muted">Manage your local workspace data portability</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-text"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Controls */}
        <div className="mt-4 flex rounded-xl border border-border bg-surface-muted/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === "export"
                ? "border border-border/60 bg-surface text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Export Backup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("restore")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === "restore"
                ? "border border-border/60 bg-surface text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            Restore Backup
          </button>
        </div>

        {/* Tab 1: Export Panel */}
        {activeTab === "export" && (
          <div className="mt-5 flex flex-col gap-4">
            <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-4">
              <span className="text-xs font-semibold text-text">Current Workspace Snapshot</span>
              <div className="mt-2.5 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-border/60 bg-surface p-2.5">
                  <span className="text-[11px] text-muted">Stored Tasks</span>
                  <p className="mt-0.5 font-mono text-base font-bold text-text">
                    {workspaceStats.tasks}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-surface p-2.5">
                  <span className="text-[11px] text-muted">Stored Notes</span>
                  <p className="mt-0.5 font-mono text-base font-bold text-text">
                    {workspaceStats.notes}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Your data stays 100% private in your browser. Exporting produces a standard JSON file containing all tasks, priorities, categories, and notes.
              </p>
            </div>

            {exportSuccess && (
              <div
                role="status"
                className="rounded-xl border border-success/30 bg-success-soft p-3 text-xs font-medium text-success"
              >
                {exportSuccess}
              </div>
            )}

            <button
              type="button"
              disabled={isExporting}
              onClick={handleExport}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover disabled:opacity-60"
            >
              {isExporting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating JSON Backup...
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download JSON Backup
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Restore Panel */}
        {activeTab === "restore" && (
          <div className="mt-5 flex flex-col gap-4">
            {/* File Dropzone */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted/30 p-6 text-center transition-colors hover:border-accent">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <label
                htmlFor="backup-file-input"
                className="mt-3 cursor-pointer text-xs font-semibold text-accent hover:underline"
              >
                Choose a JSON backup file
              </label>
              <input
                id="backup-file-input"
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    void handleFileSelect(e.target.files[0]);
                  }
                }}
                className="sr-only"
              />
              <span className="mt-1 text-[11px] text-faint">
                {file ? file.name : "or drag and drop a TaskFlow .json file here"}
              </span>
            </div>

            {/* Error Banner */}
            {validationError && (
              <div
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger-soft p-3 text-xs font-medium text-danger"
              >
                {validationError}
              </div>
            )}

            {/* Success Banner */}
            {restoreSuccess && (
              <div
                role="status"
                className="rounded-xl border border-success/30 bg-success-soft p-3 text-xs font-medium text-success"
              >
                {restoreSuccess}
              </div>
            )}

            {/* Validated Backup Preview & Mode Selector */}
            {validatedPayload && (
              <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-surface-muted/40 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text">Backup Snapshot Validated</span>
                  <span className="font-mono text-[10px] text-faint">
                    {new Date(validatedPayload.exportedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border/60 bg-surface p-2">
                    <span className="text-[10px] text-muted">Tasks in file</span>
                    <p className="font-mono font-bold text-text">
                      {validatedPayload.data.tasks.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-surface p-2">
                    <span className="text-[10px] text-muted">Notes in file</span>
                    <p className="font-mono font-bold text-text">
                      {validatedPayload.data.notes.length}
                    </p>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="mt-2 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-text">Restore Mode</span>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 bg-surface p-2.5 text-xs">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="merge"
                      checked={restoreMode === "merge"}
                      onChange={() => setRestoreMode("merge")}
                      className="mt-0.5 accent-accent"
                    />
                    <div>
                      <span className="font-semibold text-text">Merge with existing data</span>
                      <p className="text-[11px] text-muted">
                        Safely adds backup items and updates any matching IDs while keeping your current tasks intact.
                      </p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 bg-surface p-2.5 text-xs">
                    <input
                      type="radio"
                      name="restoreMode"
                      value="replace"
                      checked={restoreMode === "replace"}
                      onChange={() => setRestoreMode("replace")}
                      className="mt-0.5 accent-accent"
                    />
                    <div>
                      <span className="font-semibold text-danger">Replace current workspace</span>
                      <p className="text-[11px] text-muted">
                        Wipes existing tasks and notes, replacing them entirely with the backup file snapshot.
                      </p>
                    </div>
                  </label>

                  {restoreMode === "replace" && (
                    <label className="mt-1 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft p-2.5 text-xs text-danger">
                      <input
                        type="checkbox"
                        checked={confirmReplace}
                        onChange={(e) => setConfirmReplace(e.target.checked)}
                        className="rounded accent-danger"
                      />
                      <span>I understand this will overwrite my current tasks and notes.</span>
                    </label>
                  )}
                </div>

                {/* Restore Button */}
                <button
                  type="button"
                  disabled={
                    isRestoring || (restoreMode === "replace" && !confirmReplace)
                  }
                  onClick={handleRestore}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-accent-hover disabled:opacity-50"
                >
                  {isRestoring ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Restoring Data...
                    </>
                  ) : (
                    "Confirm & Restore Data"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
