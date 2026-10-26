"use client";

import { memo } from "react";
import Link from "next/link";
import { isPrimaryActive } from "@/lib/navigation";

interface MobileNavBarProps {
  active?: "tasks" | "notes" | "calendar" | "analytics" | "privacy" | "followups" | "plan" | "inbox";
  dueCount?: number;
  inboxCount?: number;
  onOpenMore: () => void;
  isMoreOpen?: boolean;
}

function MobileNavBar({
  active,
  dueCount = 0,
  inboxCount = 0,
  onOpenMore,
  isMoreOpen = false,
}: MobileNavBarProps) {
  const isTasksActive = isPrimaryActive("tasks", active);
  const isFollowUpsActive = isPrimaryActive("followups", active);
  const isNotesActive = isPrimaryActive("notes", active);
  const isMoreActive = isMoreOpen || isPrimaryActive("more", active);

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-bg/95 backdrop-blur-lg transition-colors sm:hidden print:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-3 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* 1. Tasks */}
        <Link
          href="/"
          aria-current={isTasksActive ? "page" : undefined}
          aria-label="Tasks"
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 min-h-[44px] transition-all active:scale-95 ${
            isTasksActive
              ? "bg-accent/10 font-semibold text-accent shadow-xs ring-1 ring-accent/20"
              : "text-muted hover:bg-surface/50 hover:text-text"
          }`}
        >
          <div className="relative flex h-6 w-6 items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <span className="text-[11px] leading-tight tracking-tight">Tasks</span>
        </Link>

        {/* 2. Follow Ups */}
        <Link
          href="/followups"
          aria-current={isFollowUpsActive ? "page" : undefined}
          aria-label={`Follow Ups${dueCount > 0 ? `, ${dueCount} due` : ""}`}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 min-h-[44px] transition-all active:scale-95 ${
            isFollowUpsActive
              ? "bg-accent/10 font-semibold text-accent shadow-xs ring-1 ring-accent/20"
              : "text-muted hover:bg-surface/50 hover:text-text"
          }`}
        >
          <div className="relative flex h-6 w-6 items-center justify-center">
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
            {dueCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs">
                {dueCount > 9 ? "9+" : dueCount}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight tracking-tight">
            Follow Ups
          </span>
        </Link>

        {/* 3. Notes */}
        <Link
          href="/notes"
          aria-current={isNotesActive ? "page" : undefined}
          aria-label="Notes"
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 min-h-[44px] transition-all active:scale-95 ${
            isNotesActive
              ? "bg-accent/10 font-semibold text-accent shadow-xs ring-1 ring-accent/20"
              : "text-muted hover:bg-surface/50 hover:text-text"
          }`}
        >
          <div className="relative flex h-6 w-6 items-center justify-center">
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          </div>
          <span className="text-[11px] leading-tight tracking-tight">Notes</span>
        </Link>

        {/* 4. More */}
        <button
          type="button"
          onClick={onOpenMore}
          aria-expanded={isMoreOpen}
          aria-label={`More tools and workflows${inboxCount > 0 ? `, ${inboxCount} new captures` : ""}`}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 min-h-[44px] transition-all active:scale-95 ${
            isMoreActive
              ? "bg-accent/10 font-semibold text-accent shadow-xs ring-1 ring-accent/20"
              : "text-muted hover:bg-surface/50 hover:text-text"
          }`}
        >
          <div className="relative flex h-6 w-6 items-center justify-center">
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
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
            {inboxCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white shadow-xs">
                {inboxCount > 9 ? "9+" : inboxCount}
              </span>
            )}
          </div>
          <span className="text-[11px] leading-tight tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
}

export default memo(MobileNavBar);
