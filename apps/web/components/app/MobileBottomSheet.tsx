"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/app/ThemeToggle";
import {
  SECONDARY_NAV_ITEMS,
  QUICK_ACTION_ITEMS,
  type SecondaryNavKey,
} from "@/lib/navigation";

interface MobileBottomSheetProps {
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

export default function MobileBottomSheet({
  isOpen,
  onClose,
  active,
  inboxCount = 0,
  dueCount = 0,
  onOpenCapture,
  onOpenBackup,
  onOpenAccount,
  onOpenAbout,
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
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
      role="dialog"
      aria-modal="true"
      aria-label="More navigation and tools"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Up Bottom Sheet */}
      <div
        ref={sheetRef}
        className="relative z-10 flex w-full flex-col max-h-[85vh] rounded-t-3xl border-t border-border bg-surface shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-200"
      >
        {/* Grab Handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="h-1.5 w-12 rounded-full bg-border-strong/70" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <svg
                width="16"
                height="16"
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
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-text">
                More Workflows
              </h2>
              <p className="text-[11px] text-muted">
                Tools and preferences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-surface text-muted transition-colors hover:bg-surface-muted hover:text-text active:scale-95"
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
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
          {/* Workflows */}
          <section>
            <span className="text-[11px] font-semibold tracking-wider text-faint uppercase px-2">
              Workflows
            </span>
            <div className="mt-2 space-y-1.5">
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
                    className={`flex items-center justify-between rounded-xl p-3 min-h-[48px] transition-all active:scale-[0.99] ${
                      isItemActive
                        ? "border border-accent/30 bg-accent/10 text-accent font-medium shadow-xs"
                        : "border border-border/60 bg-surface/70 hover:bg-surface text-text"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isItemActive
                            ? "bg-accent/20 text-accent"
                            : "bg-surface-muted text-muted"
                        }`}
                      >
                        {item.key === "inbox" && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                          </svg>
                        )}
                        {item.key === "plan" && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        )}
                        {item.key === "calendar" && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        )}
                        {item.key === "analytics" && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 3v18h18" />
                            <path d="m19 9-5 5-4-4-3 3" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className="text-[11px] text-muted">
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {badge > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white shadow-xs">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Tools & Settings */}
          <section>
            <span className="text-[11px] font-semibold tracking-wider text-faint uppercase px-2">
              Tools and Settings
            </span>
            <div className="mt-2 space-y-1.5">
              {QUICK_ACTION_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleActionClick(item.key)}
                  className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-surface/70 p-3 min-h-[48px] text-left transition-all hover:bg-surface active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted">
                      {item.key === "capture" && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      )}
                      {item.key === "backup" && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      )}
                      {item.key === "account" && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                      {item.key === "about" && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-muted">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-faint shrink-0"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
