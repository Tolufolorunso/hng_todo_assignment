"use client";

import React, { useEffect, useState } from "react";
import type { LocalConflictRecord } from "@/types/storage";
import { getActiveWorkspaceId, listLocalConflicts } from "@/lib/repository";
import { resolveConflict, triggerSyncNow } from "@/lib/sync";

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolved?: () => void;
}

export default function ConflictModal({
  isOpen,
  onClose,
  onResolved,
}: ConflictModalProps) {
  const [conflicts, setConflicts] = useState<LocalConflictRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const wsId = getActiveWorkspaceId();
    void listLocalConflicts(wsId, "open").then((items) => {
      if (mounted) {
        setConflicts(items);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleResolve(
    conflictId: string,
    choice: "keep-server" | "keep-local"
  ) {
    setResolvingId(conflictId);
    const wsId = getActiveWorkspaceId();
    const success = await resolveConflict(conflictId, choice, wsId);
    setResolvingId(null);

    if (success) {
      const remaining = conflicts.filter((c) => c.id !== conflictId);
      setConflicts(remaining);
      if (onResolved) {
        onResolved();
      }
      if (choice === "keep-local") {
        void triggerSyncNow();
      }
      if (remaining.length === 0) {
        onClose();
      }
    }
  }

  function formatEntityPreview(data: unknown): string {
    if (!data || typeof data !== "object") return "None";
    const record = data as Record<string, unknown>;
    if (typeof record.title === "string") return record.title;
    if (typeof record.text === "string") return record.text;
    if (typeof record.personName === "string") return `${record.personName}: ${record.commitment ?? ""}`;
    if (typeof record.planDate === "string") return `Plan: ${record.planDate}`;
    return JSON.stringify(record, null, 2);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 font-bold">
              !
            </div>
            <div>
              <h2 id="conflict-modal-title" className="text-base font-bold text-text">
                Sync Conflicts ({conflicts.length})
              </h2>
              <p className="text-xs text-muted">
                Changes made offline conflict with newer edits from the cloud. Choose which version to keep.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-text transition-colors"
            aria-label="Close dialog"
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

        {/* Conflict List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted">Loading conflicts...</div>
          ) : conflicts.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">No unresolved conflicts found.</div>
          ) : (
            conflicts.map((c) => {
              const isResolving = resolvingId === c.id;
              const serverData = c.currentServerEntity as Record<string, unknown> | undefined;
              const localData = (c.attemptedMutation.payload as Record<string, unknown> | undefined) || {};

              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-surface-muted/30 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-accent px-2 py-0.5 rounded bg-accent/10">
                      {c.entityType}
                    </span>
                    <span className="text-faint font-mono text-[11px]">
                      ID: {c.entityId.slice(0, 16)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Server Version */}
                    <div className="rounded-lg border border-border bg-surface p-3 space-y-1.5">
                      <div className="flex items-center justify-between font-semibold text-text">
                        <span>Server Version</span>
                        <span className="text-[10px] text-faint">Rev {c.serverRevision}</span>
                      </div>
                      <div className="text-muted line-clamp-3 bg-surface-muted/50 p-2 rounded text-[11px] font-mono break-words">
                        {serverData ? formatEntityPreview(serverData) : "Deleted on server"}
                      </div>
                    </div>

                    {/* Local Version */}
                    <div className="rounded-lg border border-border bg-surface p-3 space-y-1.5">
                      <div className="flex items-center justify-between font-semibold text-text">
                        <span>Local Changes</span>
                        <span className="text-[10px] text-faint">Base Rev {c.baseRevision ?? 0}</span>
                      </div>
                      <div className="text-muted line-clamp-3 bg-surface-muted/50 p-2 rounded text-[11px] font-mono break-words">
                        {c.attemptedMutation.action === "delete"
                          ? "Deleted locally"
                          : formatEntityPreview(localData)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => handleResolve(c.id, "keep-server")}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-muted active:scale-95 disabled:opacity-50"
                    >
                      Keep Server
                    </button>
                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => handleResolve(c.id, "keep-local")}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow hover:opacity-90 active:scale-95 disabled:opacity-50"
                    >
                      Keep Local
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-text hover:bg-surface-muted active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
