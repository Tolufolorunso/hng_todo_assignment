"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OfflineIndicator from "@/components/app/OfflineIndicator";
import BackupModal from "@/components/backup/BackupModal";
import ThemeToggle from "@/components/app/ThemeToggle";
import TaskFlowLogo from "@/components/brand/TaskFlowLogo";
import MobileNavBar from "@/components/app/MobileNavBar";
import { getDueFollowUpsCount } from "@/lib/followups";

interface AppHeaderProps {
  active?: "tasks" | "notes" | "calendar" | "analytics" | "privacy" | "followups" | "plan";
}

const NAV_ITEMS = [
  {
    key: "tasks",
    href: "/",
    label: "Tasks",
    icon: (
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
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  {
    key: "notes",
    href: "/notes",
    label: "Notes",
    icon: (
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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    key: "followups",
    href: "/followups",
    label: "Follow Ups",
    icon: (
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
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
      </svg>
    ),
  },
  {
    key: "plan",
    href: "/plan",
    label: "Plan",
    icon: (
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
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: "calendar",
    href: "/calendar",
    label: "Calendar",
    icon: (
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
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    key: "analytics",
    href: "/analytics",
    label: "Analytics",
    icon: (
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
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
];

export default function AppHeader({ active }: AppHeaderProps) {
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [dueFollowUpsCount, setDueFollowUpsCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    getDueFollowUpsCount()
      .then((count) => {
        if (mounted) setDueFollowUpsCount(count);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

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

          {/* Desktop Navigation Tabs */}
          <nav
            aria-label="Main navigation"
            className="hidden sm:flex items-center gap-1 rounded-xl border border-border bg-surface-muted/80 p-1"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.key;
              const hasDueBadge = item.key === "followups" && dueFollowUpsCount > 0;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "border border-border/60 bg-surface text-text shadow-sm"
                      : "text-muted hover:bg-surface/50 hover:text-text"
                  }`}
                >
                  <span className={isActive ? "text-accent" : "text-faint"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {hasDueBadge && (
                    <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-500">
                      {dueFollowUpsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Header Right Utilities */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setIsBackupOpen(true)}
              aria-label="Backup and restore data"
              className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface px-2.5 py-1.5 text-xs font-semibold text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted active:scale-95"
            >
              <svg
                width="14"
                height="14"
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
              <span>Data</span>
            </button>
            <OfflineIndicator />
          </div>
        </div>

        <BackupModal
          isOpen={isBackupOpen}
          onClose={() => setIsBackupOpen(false)}
        />
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavBar active={active} dueCount={dueFollowUpsCount} />
    </>
  );
}

