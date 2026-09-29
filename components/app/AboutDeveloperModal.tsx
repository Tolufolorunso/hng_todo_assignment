"use client";

import { useEffect, useRef } from "react";

interface AboutDeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOCIAL_LINKS = [
  {
    name: "LinkedIn",
    handle: "in/tolulopebuilds",
    href: "https://linkedin.com/in/tolulopebuilds/",
    color: "hover:border-[#0a66c2]/60 hover:bg-[#0a66c2]/10 hover:text-[#0a66c2]",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
      </svg>
    ),
  },
  {
    name: "X (Twitter)",
    handle: "@tolulopebuilds",
    href: "https://x.com/tolulopebuilds",
    color: "hover:border-text/60 hover:bg-surface-muted hover:text-text",
    icon: (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    handle: "Tolufolorunso",
    href: "https://github.com/Tolufolorunso",
    color: "hover:border-accent/60 hover:bg-accent-soft hover:text-accent",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
];

const SKILL_TAGS = [
  "AI-Powered Applications",
  "Full-Stack Web & Mobile",
  "Offline-First Systems",
  "AI Agent Workflows",
  "High-Performance UI/UX",
];

export default function AboutDeveloperModal({
  isOpen,
  onClose,
}: AboutDeveloperModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="developer-modal-title"
        className="relative flex flex-col w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl text-text transition-all animate-in zoom-in-95 duration-200"
      >
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close developer profile modal"
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-surface-muted text-muted transition-all hover:border-border-strong hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Profile Header */}
        <div className="flex items-start gap-4 pr-10">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-accent to-purple-600 text-white font-bold text-lg shadow-md ring-2 ring-accent/30">
            TF
          </div>
          <div className="flex flex-col">
            <h2
              id="developer-modal-title"
              className="text-xl font-bold tracking-tight text-text"
            >
              Tolulope Folorunso
            </h2>
            <span className="text-xs font-medium text-accent">
              @Tolulope_builds
            </span>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                AI Product Engineer
              </span>
              <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-text">
                AI System Engineer
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                HNG Intern
              </span>
            </div>
          </div>
        </div>

        {/* Bio Narrative */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border/80 bg-surface-muted/50 p-4 text-xs leading-relaxed text-text">
          <p>
            I build intelligent, resilient applications across web and mobile that
            bridge complex AI systems with intuitive human experiences. Focused on
            offline-first architectures, high-performance interfaces, and
            production-grade AI agent workflows.
          </p>
          <p className="text-muted">
            Currently engineering high-velocity solutions as an HNG Intern,
            driving production-grade standards from concept to live deployment.
          </p>
        </div>

        {/* Core Focus Pills */}
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Core Focus Areas
          </h3>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SKILL_TAGS.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted shadow-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Connect & Social Profiles */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Connect & Collaborate
          </h3>
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2.5 rounded-xl border border-border bg-surface p-3 text-xs font-medium text-text shadow-xs transition-all ${item.color}`}
              >
                <span className="shrink-0">{item.icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold truncate">{item.name}</span>
                  <span className="text-[10px] text-muted truncate">
                    {item.handle}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Footer Action */}
        <div className="mt-6 pt-4 border-t border-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-text shadow-xs transition-all hover:border-border-strong hover:bg-surface-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
