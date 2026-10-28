"use client";

import { memo, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import OfflineIndicator from "@/components/app/OfflineIndicator";
import BackupModal from "@/components/backup/BackupModal";
import FastCaptureModal from "@/components/inbox/FastCaptureModal";
import ThemeToggle from "@/components/app/ThemeToggle";
import TaskFlowLogo from "@/components/brand/TaskFlowLogo";
import MobileNavBar from "@/components/app/MobileNavBar";
import MorePopover from "@/components/app/MorePopover";
import MobileBottomSheet from "@/components/app/MobileBottomSheet";
import CommandPalette from "@/components/app/CommandPalette";
import AboutDeveloperModal from "@/components/app/AboutDeveloperModal";
import AccountModal from "@/components/auth/AccountModal";
import DataAdoptionModal from "@/components/auth/DataAdoptionModal";
import SyncStatusIndicator from "@/components/sync/SyncStatusIndicator";
import OverlayHost from "@/components/app/OverlayHost";
import { useAuth } from "@/components/auth/AuthProvider";
import { hasLocalDataToAdopt, getAccountWorkspaceId } from "@/lib/adoption";
import { setActiveWorkspaceId } from "@/lib/repository";
import { triggerSyncNow } from "@/lib/sync";
import { getDueFollowUpsCount } from "@/lib/followups";
import { getPendingCapturesCount } from "@/lib/inbox";
import { onSyncEvent, broadcastSyncEvent } from "@/lib/broadcast";
import { isPrimaryActive } from "@/lib/navigation";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import type { AuthUser } from "@/types/auth";

interface AppHeaderProps {
  active?: "tasks" | "notes" | "calendar" | "analytics" | "privacy" | "followups" | "plan" | "inbox";
}

function AppHeader({ active }: AppHeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAdoptionOpen, setIsAdoptionOpen] = useState(false);
  const [adoptionAccountId, setAdoptionAccountId] = useState<string | null>(null);
  const [isDesktopMoreOpen, setIsDesktopMoreOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [dueFollowUpsCount, setDueFollowUpsCount] = useState<number>(0);
  const [pendingCapturesCount, setPendingCapturesCount] = useState<number>(0);

  const handleOpenCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const handleCloseCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);
  const handleToggleCommandPalette = useCallback(() => setIsCommandPaletteOpen((prev) => !prev), []);

  const handleOpenQuickCapture = useCallback(() => setIsCaptureOpen(true), []);
  const handleCloseCapture = useCallback(() => setIsCaptureOpen(false), []);

  const handleOpenBackup = useCallback(() => setIsBackupOpen(true), []);
  const handleCloseBackup = useCallback(() => setIsBackupOpen(false), []);

  const handleOpenAccount = useCallback(() => setIsAccountOpen(true), []);
  const handleCloseAccount = useCallback(() => setIsAccountOpen(false), []);

  const handleOpenAbout = useCallback(() => setIsAboutOpen(true), []);
  const handleCloseAbout = useCallback(() => setIsAboutOpen(false), []);

  const handleOpenMobileMore = useCallback(() => setIsMobileMoreOpen(true), []);
  const handleCloseMobileMore = useCallback(() => setIsMobileMoreOpen(false), []);

  const handleCloseDesktopMore = useCallback(() => setIsDesktopMoreOpen(false), []);
  const handleToggleDesktopMore = useCallback(() => setIsDesktopMoreOpen((prev) => !prev), []);

  const handleCloseAdoption = useCallback(() => {
    setIsAdoptionOpen(false);
    setAdoptionAccountId(null);
  }, []);

  const refreshBadgeCounts = useCallback(() => {
    getDueFollowUpsCount()
      .then((count) => setDueFollowUpsCount(count))
      .catch(() => {});
    getPendingCapturesCount()
      .then((count) => setPendingCapturesCount(count))
      .catch(() => {});
  }, []);

  const handleCaptured = useCallback(() => {
    refreshBadgeCounts();
  }, [refreshBadgeCounts]);

  const isAnyModalOpen =
    isBackupOpen ||
    isCaptureOpen ||
    isAccountOpen ||
    isAdoptionOpen ||
    isCommandPaletteOpen ||
    isAboutOpen ||
    isMobileMoreOpen;

  const handleToggleMore = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileMoreOpen((prev) => !prev);
    } else {
      setIsDesktopMoreOpen((prev) => !prev);
    }
  }, []);

  // Global Keyboard Shortcuts (Cmd+K / Ctrl+K, G-sequences, Alt+C)
  useGlobalShortcuts({
    onToggleCommandPalette: handleToggleCommandPalette,
    onOpenQuickCapture: handleOpenQuickCapture,
    onToggleMore: handleToggleMore,
    enabled: !isAnyModalOpen,
  });

  const handleAuthenticated = useCallback(async (authUser: AuthUser) => {
    if (authUser) {
      setAdoptionAccountId(authUser.id);
      const hasData = await hasLocalDataToAdopt();
      if (hasData) {
        setIsAccountOpen(false);
        setIsAdoptionOpen(true);
      } else {
        const wsId = getAccountWorkspaceId(authUser.id);
        setActiveWorkspaceId(wsId);
        broadcastSyncEvent({ type: "WORKSPACE_CHANGED", workspaceId: wsId });
        void triggerSyncNow();
        setIsAccountOpen(false);
      }
    } else {
      setIsAccountOpen(false);
    }
  }, []);

  useEffect(() => {
    refreshBadgeCounts();
    const unsubscribe = onSyncEvent((event) => {
      if (
        event.type === "DATA_MUTATED" ||
        event.type === "SYNC_COMPLETED" ||
        event.type === "WORKSPACE_CHANGED"
      ) {
        refreshBadgeCounts();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refreshBadgeCounts]);

  const isTasksActive = isPrimaryActive("tasks", active);
  const isFollowUpsActive = isPrimaryActive("followups", active);
  const isNotesActive = isPrimaryActive("notes", active);
  const isMoreActive = isDesktopMoreOpen || isMobileMoreOpen || isPrimaryActive("more", active);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
          {/* Brand */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-text outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0"
            aria-label="TaskFlow home"
          >
            <div className="flex h-8 w-8 items-center justify-center transition-transform group-hover:scale-105">
              <TaskFlowLogo size={32} />
            </div>
            <span className="text-base font-semibold tracking-tight text-text">
              Task<span className="text-accent">Flow</span>
            </span>
          </Link>

          {/* Consolidated 4-Destination Desktop Navigation */}
          <nav
            aria-label="Main navigation"
            className="hidden md:flex items-center gap-1 rounded-xl border border-border bg-surface-muted/80 p-1"
          >
            {/* 1. Tasks */}
            <Link
              href="/"
              aria-current={isTasksActive ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                isTasksActive
                  ? "border border-border/60 bg-surface text-text shadow-sm"
                  : "text-muted hover:bg-surface/50 hover:text-text"
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isTasksActive ? "text-accent" : "text-faint"}
                aria-hidden="true"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>Tasks</span>
            </Link>

            {/* 2. Follow Ups */}
            <Link
              href="/followups"
              aria-current={isFollowUpsActive ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                isFollowUpsActive
                  ? "border border-border/60 bg-surface text-text shadow-sm"
                  : "text-muted hover:bg-surface/50 hover:text-text"
              }`}
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
                className={isFollowUpsActive ? "text-accent" : "text-faint"}
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
              <span>Follow Ups</span>
              {dueFollowUpsCount > 0 && (
                <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-500">
                  {dueFollowUpsCount > 9 ? "9+" : dueFollowUpsCount}
                </span>
              )}
            </Link>

            {/* 3. Notes */}
            <Link
              href="/notes"
              aria-current={isNotesActive ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                isNotesActive
                  ? "border border-border/60 bg-surface text-text shadow-sm"
                  : "text-muted hover:bg-surface/50 hover:text-text"
              }`}
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
                className={isNotesActive ? "text-accent" : "text-faint"}
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
              <span>Notes</span>
            </Link>

            {/* 4. More (Desktop Anchored Popover) */}
            <div className="relative">
              <button
                type="button"
                onClick={handleToggleDesktopMore}
                aria-expanded={isDesktopMoreOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isMoreActive
                    ? "border border-border/60 bg-surface text-text shadow-sm"
                    : "text-muted hover:bg-surface/50 hover:text-text"
                }`}
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
                  className={isMoreActive ? "text-accent" : "text-faint"}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
                <span>More</span>
                {pendingCapturesCount > 0 && (
                  <span className="rounded-full bg-accent/20 px-1.5 py-0.2 text-[10px] font-bold text-accent">
                    {pendingCapturesCount > 9 ? "9+" : pendingCapturesCount}
                  </span>
                )}
              </button>

              <MorePopover
                isOpen={isDesktopMoreOpen}
                onClose={handleCloseDesktopMore}
                active={active}
                inboxCount={pendingCapturesCount}
                dueCount={dueFollowUpsCount}
                onOpenCapture={handleOpenQuickCapture}
                onOpenBackup={handleOpenBackup}
                onOpenAccount={handleOpenAccount}
                onOpenAbout={handleOpenAbout}
              />
            </div>
          </nav>

          {/* Header Right Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Command Palette Button */}
            <button
              type="button"
              onClick={handleOpenCommandPalette}
              title="Search & Commands (Cmd+K)"
              aria-label="Search & Commands (Cmd+K)"
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface p-1.5 sm:px-2.5 sm:py-1.5 text-xs text-muted shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted hover:text-text active:scale-95"
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
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span className="hidden xl:inline">Search...</span>
              <kbd className="hidden lg:inline rounded bg-surface-muted px-1 py-0.2 font-mono text-[9px] text-muted border border-border/60">
                ⌘K
              </kbd>
            </button>

            {/* Quick Capture */}
            <button
              type="button"
              onClick={handleOpenQuickCapture}
              title="Quick Capture (Alt+C)"
              aria-label="Quick Capture (Alt+C)"
              className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-accent shadow-sm transition-all hover:bg-accent/20 active:scale-95"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden sm:inline">Capture</span>
              <kbd className="hidden md:inline rounded bg-accent/20 px-1 py-0.2 font-mono text-[9px] text-accent">
                Alt+C
              </kbd>
            </button>

            <ThemeToggle />
            <SyncStatusIndicator />
            <OfflineIndicator />

            {/* Account / Sign In */}
            <button
              type="button"
              onClick={handleOpenAccount}
              aria-label={isAuthenticated ? "Manage Account" : "Sign In"}
              title={isAuthenticated ? user?.email : "Sign In"}
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted active:scale-95"
            >
              {isAuthenticated ? (
                <>
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                    {user?.email?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <span className="hidden md:inline max-w-[100px] truncate">
                    {user?.email || "Account"}
                  </span>
                </>
              ) : (
                <>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="hidden sm:inline">Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <OverlayHost>
        {/* Mobile Bottom Sheet for Small Viewports */}
        {isMobileMoreOpen && (
          <MobileBottomSheet
            isOpen={isMobileMoreOpen}
            onClose={handleCloseMobileMore}
            active={active}
            inboxCount={pendingCapturesCount}
            dueCount={dueFollowUpsCount}
            onOpenCapture={handleOpenQuickCapture}
            onOpenBackup={handleOpenBackup}
            onOpenAccount={handleOpenAccount}
            onOpenAbout={handleOpenAbout}
          />
        )}

        {/* Global Command Palette */}
        {isCommandPaletteOpen && (
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={handleCloseCommandPalette}
            dueCount={dueFollowUpsCount}
            inboxCount={pendingCapturesCount}
            onOpenCapture={handleOpenQuickCapture}
            onOpenBackup={handleOpenBackup}
            onOpenAccount={handleOpenAccount}
            onOpenAbout={handleOpenAbout}
          />
        )}

        {isBackupOpen && (
          <BackupModal
            isOpen={isBackupOpen}
            onClose={handleCloseBackup}
          />
        )}

        {isCaptureOpen && (
          <FastCaptureModal
            isOpen={isCaptureOpen}
            onClose={handleCloseCapture}
            onCaptured={handleCaptured}
          />
        )}

        {isAccountOpen && (
          <AccountModal
            isOpen={isAccountOpen}
            onClose={handleCloseAccount}
            onAuthenticated={handleAuthenticated}
          />
        )}

        {(user || adoptionAccountId) && isAdoptionOpen && (
          <DataAdoptionModal
            isOpen={isAdoptionOpen}
            accountId={adoptionAccountId || user?.id || ""}
            onClose={handleCloseAdoption}
          />
        )}

        {isAboutOpen && (
          <AboutDeveloperModal
            isOpen={isAboutOpen}
            onClose={handleCloseAbout}
          />
        )}
      </OverlayHost>

      {/* Mobile Bottom Navigation Bar (strictly 4 tabs) */}
      <MobileNavBar
        active={active}
        dueCount={dueFollowUpsCount}
        inboxCount={pendingCapturesCount}
        onOpenMore={handleOpenMobileMore}
        isMoreOpen={isMobileMoreOpen}
      />
    </>
  );
}

export default memo(AppHeader);
