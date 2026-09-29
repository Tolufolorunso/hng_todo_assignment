"use client";

import { useState } from "react";
import TaskFlowLogo from "@/components/brand/TaskFlowLogo";
import AboutDeveloperModal from "@/components/app/AboutDeveloperModal";

export default function AppFooter() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <footer className="mt-auto border-t border-border bg-surface/30 backdrop-blur-xs py-6 px-4 text-xs text-muted transition-colors mb-16 sm:mb-0 sm:fixed sm:bottom-0 sm:left-0 sm:right-0 sm:z-20 sm:border-t sm:border-border sm:bg-bg/85 sm:backdrop-blur-md sm:py-2.5 sm:px-6 print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row sm:items-center">
        {/* Left: Brand & Architecture note */}
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-2 text-text font-semibold">
            <TaskFlowLogo size={18} />
            <span>
              Task<span className="text-accent">Flow</span>
            </span>
            <span className="text-[10px] text-faint font-normal">•</span>
            <span className="text-xs font-normal text-muted">
              Personal Productivity Suite
            </span>
          </div>
          <span className="hidden lg:inline text-[10px] text-faint font-normal">•</span>
          <p className="text-[11px] text-faint sm:hidden lg:block">
            Offline-first architecture with browser-persisted storage. No cloud required.
          </p>
        </div>

        {/* Right: Creator Attribution & Modal Trigger */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
          <div className="flex items-center gap-1 text-text">
            <span className="text-muted">Crafted by</span>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="font-semibold text-text underline decoration-accent/60 underline-offset-4 transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xs"
            >
              Tolulope Folorunso
            </button>
            <span className="text-[11px] text-accent">(@Tolulope_builds)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-label="View developer profile modal"
            className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-xs font-semibold text-text shadow-xs transition-all hover:border-border-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>About Developer</span>
          </button>

          {/* Direct Social Links */}
          <div className="flex items-center gap-1.5 border-l border-border pl-3">
            <a
              href="https://linkedin.com/in/tolulopebuilds/"
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn: in/tolulopebuilds"
              aria-label="Tolulope Folorunso LinkedIn"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-surface text-muted transition-all hover:border-[#0a66c2]/60 hover:bg-[#0a66c2]/10 hover:text-[#0a66c2]"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
            </a>
            <a
              href="https://x.com/tolulopebuilds"
              target="_blank"
              rel="noopener noreferrer"
              title="X: @tolulopebuilds"
              aria-label="Tolulope Folorunso X"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-surface text-muted transition-all hover:border-text hover:bg-surface-muted hover:text-text"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://github.com/Tolufolorunso"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub: Tolufolorunso"
              aria-label="Tolulope Folorunso GitHub"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-surface text-muted transition-all hover:border-accent hover:bg-accent-soft hover:text-accent"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <AboutDeveloperModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </footer>
  );
}
