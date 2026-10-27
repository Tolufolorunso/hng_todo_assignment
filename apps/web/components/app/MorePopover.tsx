"use client";

import { memo, useEffect, useRef } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/app/ThemeToggle";
import {
  SECONDARY_NAV_ITEMS,
  QUICK_ACTION_ITEMS,
  type SecondaryNavKey,
} from "@/lib/navigation";

interface MorePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  active?: string;
  inboxCount?: number;
  dueCount?: number;
  onOpenCapture: () => void;
  onOpenBackup: () => void;
  onOpenAccount: () => void;
  onOpenAbout: () => void;
}

function MorePopover({
  isOpen,
  onClose,
  active,
  inboxCount = 0,
  dueCount = 0,
  onOpenCapture,
  onOpenBackup,
  onOpenAccount,
  onOpenAbout,
}: MorePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    // Use mousedown with timeout or check to prevent immediate close on trigger click
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleActionClick = (key: SecondaryNavKey) => {
    onClose();
    switch (key) {
      case "capture":
        onOpenCapture();
        break;
      case "backup":
        onOpenBackup();
        break;
      case "account":
        onOpenAccount();
        break;
      case "about":
        onOpenAbout();
        break;
    }
  };

  return (
    <div
      ref={popoverRef}
      role="menu"
      aria-label="More workflows and tools"
      className="absolute right-0 top-full mt-2.5 z-50 w-76 rounded-2xl border border-border bg-surface p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header with Title and Theme */}
      <div className="flex items-center justify-between border-b border-border/80 px-3 py-2 pb-2.5">
        <div>
          <span className="text-xs font-semibold text-text">More Workflows</span>
          <p className="text-[10px] text-muted">Tools &amp; preferences</p>
        </div>
        <ThemeToggle />
      </div>

      {/* Secondary Workflows Section */}
      <div className="pt-2 pb-1 space-y-0.5">
        <span className="block px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-faint">
          Workflows
        </span>
        {SECONDARY_NAV_ITEMS.map((item) => {
          const isItemActive = active === item.key;
          const badge =
            item.key === "inbox"
              ? inboxCount
              : item.key === "calendar" && dueCount > 0
              ? dueCount
              : 0;

          return (
            <Link
              key={item.key}
              href={item.href || "/"}
              onClick={onClose}
              role="menuitem"
              className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all ${
                isItemActive
                  ? "bg-accent/15 border border-accent/30 text-accent font-medium shadow-xs"
                  : "border border-transparent text-text hover:bg-surface/70"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    isItemActive
                      ? "bg-accent/25 text-accent"
                      : "bg-surface-muted text-muted"
                  }`}
                >
                  {item.key === "inbox" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                    </svg>
                  )}
                  {item.key === "plan" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  )}
                  {item.key === "calendar" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  )}
                  {item.key === "analytics" && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 3v18h18" />
                      <path d="m19 9-5 5-4-4-3 3" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{item.label}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {badge > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white shadow-xs">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {item.shortcut && (
                  <kbd className="rounded border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted">
                    {item.shortcut}
                  </kbd>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tools & Settings Section */}
      <div className="pt-2 border-t border-border/80 space-y-0.5">
        <span className="block px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-faint">
          Tools &amp; Settings
        </span>
        {QUICK_ACTION_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => handleActionClick(item.key)}
            role="menuitem"
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs border border-transparent text-text hover:bg-surface/70 transition-all text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted">
                {item.key === "capture" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
                {item.key === "backup" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
                {item.key === "account" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
                {item.key === "about" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium truncate">{item.label}</div>
              </div>
            </div>

            {item.shortcut && (
              <kbd className="rounded border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-[9px] text-muted ml-2">
                {item.shortcut}
              </kbd>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(MorePopover);
