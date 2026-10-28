"use client";

import React, { useState } from "react";
import { useModalAccessibility } from "@/hooks/useModalAccessibility";
import { adoptLocalDataIntoAccount, getAccountWorkspaceId } from "@/lib/adoption";
import { setActiveWorkspaceId } from "@/lib/repository";
import { triggerSyncNow } from "@/lib/sync";
import { broadcastSyncEvent } from "@/lib/broadcast";

interface DataAdoptionModalProps {
  isOpen: boolean;
  accountId: string;
  onClose: () => void;
  onCompleted?: () => void;
}

export default function DataAdoptionModal({
  isOpen,
  accountId,
  onClose,
  onCompleted,
}: DataAdoptionModalProps) {
  const { containerRef } = useModalAccessibility({ isOpen, onClose });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleAdopt() {
    setLoading(true);
    setError(null);
    try {
      await adoptLocalDataIntoAccount(accountId);
      const wsId = getAccountWorkspaceId(accountId);
      setActiveWorkspaceId(wsId);
      broadcastSyncEvent({ type: "WORKSPACE_CHANGED", workspaceId: wsId });
      await triggerSyncNow();
      if (onCompleted) {
        onCompleted();
      }
      onClose();
    } catch {
      setError("Failed to adopt local data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleStartFresh() {
    const wsId = getAccountWorkspaceId(accountId);
    setActiveWorkspaceId(wsId);
    broadcastSyncEvent({ type: "WORKSPACE_CHANGED", workspaceId: wsId });
    void triggerSyncNow();
    if (onCompleted) {
      onCompleted();
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adoption-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all"
      >
        <div className="flex items-start gap-3.5 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <h2 id="adoption-modal-title" className="text-lg font-bold text-text">
              Sync Local Data with Your Account?
            </h2>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              You signed in successfully. You have tasks, notes, or follow-ups stored locally on this device.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-surface-muted/50 p-3.5 mb-5 text-xs text-muted space-y-2">
          <p className="font-medium text-text">
            Would you like to copy your local data into your account workspace?
          </p>
          <ul className="list-disc list-inside space-y-1 text-faint">
            <li>Your data will be uploaded and synced to your cloud account.</li>
            <li>Your offline local workspace will remain intact as a backup.</li>
            <li>You can also start fresh with an empty account workspace.</li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={handleStartFresh}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-text hover:bg-surface-muted active:scale-95 disabled:opacity-50"
          >
            Start Fresh
          </button>
          <button
            type="button"
            onClick={handleAdopt}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Adopting Data..." : "Adopt Local Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
