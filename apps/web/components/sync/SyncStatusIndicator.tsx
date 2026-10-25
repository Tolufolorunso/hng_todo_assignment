"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  getSyncState,
  subscribeSyncState,
  triggerSyncNow,
  type SyncState,
} from "@/lib/sync";
import ConflictModal from "./ConflictModal";

export default function SyncStatusIndicator() {
  const [syncState, setSyncState] = useState<SyncState>(getSyncState());
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeSyncState((next) => {
      setSyncState(next);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleSyncNow() {
    setIsManualSyncing(true);
    try {
      await triggerSyncNow();
    } finally {
      setIsManualSyncing(false);
    }
  }

  function formatTime(iso: string | null): string {
    if (!iso) return "Never";
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Never";
    }
  }

  const { status, lastSyncedAt, pendingOutboxCount, openConflictsCount, errorMessage } = syncState;

  // Status visual cues
  let statusColor = "bg-emerald-500";
  let statusText = "Synced";
  let statusBorder = "border-emerald-500/30";

  if (status === "syncing" || isManualSyncing) {
    statusColor = "bg-blue-500 animate-pulse";
    statusText = "Syncing";
    statusBorder = "border-blue-500/30";
  } else if (status === "conflict" || openConflictsCount > 0) {
    statusColor = "bg-amber-500";
    statusText = "Conflict";
    statusBorder = "border-amber-500/40";
  } else if (status === "offline") {
    statusColor = "bg-zinc-400";
    statusText = "Offline";
    statusBorder = "border-zinc-500/30";
  } else if (status === "error") {
    statusColor = "bg-rose-500";
    statusText = "Sync Error";
    statusBorder = "border-rose-500/30";
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpenMenu((prev) => !prev)}
        aria-label={`Sync Status: ${statusText}. Click for sync details`}
        aria-expanded={isOpenMenu}
        className={`flex items-center gap-1.5 rounded-lg border ${statusBorder} bg-surface px-2.5 py-1.5 text-xs font-medium text-text shadow-sm transition-all hover:bg-surface-muted active:scale-95`}
      >
        <span className={`h-2 w-2 rounded-full ${statusColor}`} aria-hidden="true" />
        <span className="hidden sm:inline">{statusText}</span>
        {pendingOutboxCount > 0 && (
          <span className="rounded-full bg-accent/20 px-1.5 py-0.2 text-[10px] font-bold text-accent">
            {pendingOutboxCount}
          </span>
        )}
        {openConflictsCount > 0 && (
          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-500">
            !
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpenMenu && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-surface p-3 shadow-xl z-50 text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-semibold text-text">Cloud Sync</span>
            <span className="text-[11px] text-faint">
              Last: {formatTime(lastSyncedAt)}
            </span>
          </div>

          <div className="space-y-1 text-muted text-[11px]">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium text-text capitalize">{status}</span>
            </div>
            <div className="flex justify-between">
              <span>Pending changes:</span>
              <span className="font-medium text-text">{pendingOutboxCount}</span>
            </div>
            {openConflictsCount > 0 && (
              <div className="flex justify-between text-amber-500 font-semibold">
                <span>Unresolved conflicts:</span>
                <span>{openConflictsCount}</span>
              </div>
            )}
            {errorMessage && (
              <p className="text-rose-500 text-[10px] pt-1">{errorMessage}</p>
            )}
          </div>

          {openConflictsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsOpenMenu(false);
                setIsConflictModalOpen(true);
              }}
              className="w-full rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 active:scale-95 text-center transition-all"
            >
              Resolve Conflicts ({openConflictsCount})
            </button>
          )}

          <button
            type="button"
            disabled={status === "syncing" || isManualSyncing}
            onClick={handleSyncNow}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-semibold text-white shadow hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={status === "syncing" || isManualSyncing ? "animate-spin" : ""}
              aria-hidden="true"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{status === "syncing" || isManualSyncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        </div>
      )}

      {/* Conflict Modal */}
      <ConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        onResolved={() => {
          // Sync state auto updates via subscribeSyncState
        }}
      />
    </div>
  );
}
