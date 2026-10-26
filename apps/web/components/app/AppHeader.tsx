"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OfflineIndicator from "@/components/app/OfflineIndicator";
import BackupModal from "@/components/backup/BackupModal";
import FastCaptureModal from "@/components/inbox/FastCaptureModal";
import ThemeToggle from "@/components/app/ThemeToggle";
import TaskFlowLogo from "@/components/brand/TaskFlowLogo";
import MobileNavBar from "@/components/app/MobileNavBar";
import MoreDrawer from "@/components/app/MoreDrawer";
import AboutDeveloperModal from "@/components/app/AboutDeveloperModal";
import AccountModal from "@/components/auth/AccountModal";
import DataAdoptionModal from "@/components/auth/DataAdoptionModal";
import SyncStatusIndicator from "@/components/sync/SyncStatusIndicator";
import { useAuth } from "@/components/auth/AuthProvider";
import { hasLocalDataToAdopt, getAccountWorkspaceId } from "@/lib/adoption";
import { setActiveWorkspaceId } from "@/lib/repository";
import { triggerSyncNow } from "@/lib/sync";
import { getDueFollowUpsCount } from "@/lib/followups";
import { getPendingCapturesCount } from "@/lib/inbox";
import { isPrimaryActive } from "@/lib/navigation";

interface AppHeaderProps {
  active?: "tasks" | "notes" | "calendar" | "analytics" | "privacy" | "followups" | "plan" | "inbox";
}

export default function AppHeader({ active }: AppHeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAdoptionOpen, setIsAdoptionOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [dueFollowUpsCount, setDueFollowUpsCount] = useState<number>(0);
  const [pendingCapturesCount, setPendingCapturesCount] = useState<number>(0);

  async function handleAuthenticated() {
    if (user) {
      const hasData = await hasLocalDataToAdopt();
      if (hasData) {
        setIsAccountOpen(false);
        setIsAdoptionOpen(true);
      } else {
        const wsId = getAccountWorkspaceId(user.id);
        setActiveWorkspaceId(wsId);
        void triggerSyncNow();
        setIsAccountOpen(false);
      }
    } else {
      setIsAccountOpen(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    getDueFollowUpsCount()
      .then((count) => {
        if (mounted) setDueFollowUpsCount(count);
      })
      .catch(() => {});

    getPendingCapturesCount()
      .then((count) => {
        if (mounted) setPendingCapturesCount(count);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        setIsCaptureOpen(true);
        return;
      }

      if (e.key === "c" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const tagName = target?.tagName?.toLowerCase();
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        setIsCaptureOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isTasksActive = isPrimaryActive("tasks", active);
  const isFollowUpsActive = isPrimaryActive("followups", active);
  const isNotesActive = isPrimaryActive("notes", active);
  const isMoreActive = isMoreOpen || isPrimaryActive("more", active);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Brand */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 text-text outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            className="hidden sm:flex items-center gap-1 rounded-xl border border-border bg-surface-muted/80 p-1"
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

            {/* 4. More */}
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              aria-expanded={isMoreOpen}
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
          </nav>

          {/* Header Right Utilities */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setIsCaptureOpen(true)}
              title="Quick Capture (Alt+C)"
              aria-label="Quick Capture (Alt+C)"
              className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent shadow-sm transition-all hover:bg-accent/20 active:scale-95"
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
              onClick={() => setIsAccountOpen(true)}
              aria-label={isAuthenticated ? "Manage Account" : "Sign In"}
              title={isAuthenticated ? user?.email : "Sign In"}
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface px-2.5 py-1.5 text-xs font-semibold text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted active:scale-95"
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
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Drawers and Modals */}
        <MoreDrawer
          isOpen={isMoreOpen}
          onClose={() => setIsMoreOpen(false)}
          active={active}
          inboxCount={pendingCapturesCount}
          dueCount={dueFollowUpsCount}
          onOpenCapture={() => setIsCaptureOpen(true)}
          onOpenBackup={() => setIsBackupOpen(true)}
          onOpenAccount={() => setIsAccountOpen(true)}
          onOpenAbout={() => setIsAboutOpen(true)}
        />

        <BackupModal
          isOpen={isBackupOpen}
          onClose={() => setIsBackupOpen(false)}
        />

        {isCaptureOpen && (
          <FastCaptureModal
            isOpen={isCaptureOpen}
            onClose={() => setIsCaptureOpen(false)}
            onCaptured={() => setPendingCapturesCount((c) => c + 1)}
          />
        )}

        <AccountModal
          isOpen={isAccountOpen}
          onClose={() => setIsAccountOpen(false)}
          onAuthenticated={handleAuthenticated}
        />

        {user && (
          <DataAdoptionModal
            isOpen={isAdoptionOpen}
            accountId={user.id}
            onClose={() => setIsAdoptionOpen(false)}
          />
        )}

        <AboutDeveloperModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />
      </header>

      {/* Mobile Bottom Navigation Bar (strictly 4 tabs) */}
      <MobileNavBar
        active={active}
        dueCount={dueFollowUpsCount}
        inboxCount={pendingCapturesCount}
        onOpenMore={() => setIsMoreOpen(true)}
        isMoreOpen={isMoreOpen}
      />
    </>
  );
}
