"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  COMMAND_PALETTE_ITEMS,
  matchCommand,
  type NavCommand,
} from "@/lib/navigation";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  dueCount?: number;
  inboxCount?: number;
  onOpenCapture: () => void;
  onOpenBackup: () => void;
  onOpenAccount: () => void;
  onOpenAbout: () => void;
}

function CommandPaletteDialog({
  onClose,
  dueCount = 0,
  inboxCount = 0,
  onOpenCapture,
  onOpenBackup,
  onOpenAccount,
  onOpenAbout,
}: Omit<CommandPaletteProps, "isOpen">) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    return COMMAND_PALETTE_ITEMS.filter((item) => matchCommand(item, query));
  }, [query]);

  // Derive clamped selection index during render (no effect needed)
  const clampedIndex = filteredCommands.length === 0
    ? 0
    : Math.min(selectedIndex, filteredCommands.length - 1);

  // Lock body scroll and focus input on mount
  useEffect(() => {
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Execute selected command
  const executeCommand = (cmd: NavCommand) => {
    onClose();
    if (cmd.href) {
      router.push(cmd.href);
      return;
    }

    if (cmd.action) {
      switch (cmd.action) {
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
        case "theme": {
          const isDark = document.documentElement.classList.contains("dark");
          if (isDark) {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("taskflow_theme", "light");
          } else {
            document.documentElement.classList.add("dark");
            localStorage.setItem("taskflow_theme", "dark");
          }
          break;
        }
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredCommands.length === 0 ? 0 : (prev + 1) % filteredCommands.length
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredCommands.length === 0
          ? 0
          : (prev - 1 + filteredCommands.length) % filteredCommands.length
      );
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredCommands[clampedIndex];
      if (current) {
        executeCommand(current);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>("[data-active='true']");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [clampedIndex]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div
        className="relative z-10 w-full max-w-xl flex flex-col rounded-2xl border border-border bg-surface-muted/95 shadow-2xl backdrop-blur-xl overflow-hidden transition-all"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted shrink-0"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, destination, or jump to..."
            className="flex-1 bg-transparent text-sm text-text placeholder:text-muted outline-none"
            aria-label="Search commands"
          />

          <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-mono text-muted">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto p-2 space-y-1 divide-y-0"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              No matching commands found for &quot;{query}&quot;
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === clampedIndex;
              const badge =
                cmd.badgeKey === "followups"
                  ? dueCount
                  : cmd.badgeKey === "inbox"
                  ? inboxCount
                  : 0;

              return (
                <button
                  key={cmd.id}
                  type="button"
                  data-active={isSelected}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all ${
                    isSelected
                      ? "bg-accent/15 border border-accent/30 text-accent font-medium shadow-xs"
                      : "border border-transparent text-text hover:bg-surface/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-accent/25 text-accent"
                          : "bg-surface-muted text-muted"
                      }`}
                    >
                      {cmd.id.includes("tasks") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                      {cmd.id.includes("followups") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <polyline points="16 11 18 13 22 9" />
                        </svg>
                      )}
                      {cmd.id.includes("notes") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                        </svg>
                      )}
                      {cmd.id.includes("inbox") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
                          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                        </svg>
                      )}
                      {cmd.id.includes("plan") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      )}
                      {cmd.id.includes("calendar") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      )}
                      {cmd.id.includes("analytics") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3v18h18" />
                          <path d="m19 9-5 5-4-4-3 3" />
                        </svg>
                      )}
                      {cmd.id.includes("capture") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      )}
                      {cmd.id.includes("backup") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      )}
                      {cmd.id.includes("account") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                      {cmd.id.includes("theme") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                        </svg>
                      )}
                      {cmd.id.includes("about") && (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{cmd.title}</div>
                      <div className="text-[11px] text-muted truncate">
                        {cmd.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {badge > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white shadow-xs">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}

                    {cmd.shortcut && (
                      <kbd className="rounded border border-border/80 bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between border-t border-border/80 bg-surface/50 px-4 py-2 text-[10px] text-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded bg-surface px-1 py-0.5 font-mono">↑</kbd>{" "}
              <kbd className="rounded bg-surface px-1 py-0.5 font-mono">↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded bg-surface px-1.5 py-0.5 font-mono">↵</kbd> select
            </span>
          </div>
          <span>
            <kbd className="rounded bg-surface px-1 py-0.5 font-mono">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CommandPalette(props: CommandPaletteProps) {
  if (!props.isOpen) return null;
  return <CommandPaletteDialog {...props} />;
}
