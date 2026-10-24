import type { Metadata } from "next";
import Link from "next/link";
import AppHeader from "@/components/app/AppHeader";

export const metadata: Metadata = {
  title: "Privacy & Architecture Notice",
  description:
    "TaskFlow privacy model, local-first architecture, optional cloud synchronization, notification limitations, and non-goals.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <AppHeader active="privacy" />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-20">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-3 border-b border-border pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
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
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Tasks
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
              Privacy & Architecture Notice
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">
              A comprehensive overview of TaskFlow&apos;s local-first architecture, optional cloud
              synchronization, data protection boundaries, notification delivery realities, and
              platform policies.
            </p>
          </div>
        </div>

        {/* Section 1: Core Architectural Principle */}
        <section aria-labelledby="architecture-heading" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-xs font-bold text-accent">
              1
            </span>
            <h2 id="architecture-heading" className="text-lg font-bold tracking-tight text-text sm:text-xl">
              Core Architectural Principle: Local-First by Design
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-surface/50 p-5 leading-relaxed text-muted sm:p-6">
            <p className="text-sm sm:text-base">
              TaskFlow is engineered from the ground up to operate offline on your device first.
              All tasks, Microsoft Word-style rich notes, category filters, calendar calculations,
              and productivity metrics are stored and computed locally.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/80 bg-surface p-3.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text">
                  Local-Only Integrity
                </h3>
                <p className="mt-1 text-xs text-muted">
                  No account registration is required to use TaskFlow. Your data lives exclusively
                  in your browser&apos;s IndexedDB or native device SQLite database.
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-surface p-3.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text">
                  User-Custody Backups
                </h3>
                <p className="mt-1 text-xs text-muted">
                  You retain complete custody of your data with timestamped JSON export and validated
                  import with merge or replacement capabilities.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Local-Only vs Synchronized Mode */}
        <section aria-labelledby="sync-mode-heading" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-xs font-bold text-accent">
              2
            </span>
            <h2 id="sync-mode-heading" className="text-lg font-bold tracking-tight text-text sm:text-xl">
              Local-Only vs. Optional Synchronized Mode
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-surface/50 p-5 leading-relaxed text-muted sm:p-6">
            <p className="text-sm sm:text-base">
              TaskFlow supports two clear operational models so you always know where your data lives:
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <div className="rounded-lg border border-border/80 bg-surface p-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <h3 className="text-sm font-bold text-text">Local-Only Mode (Default)</h3>
                </div>
                <p className="mt-1.5 text-xs text-muted leading-relaxed">
                  No sign-up or email is required. Zero data is uploaded to remote servers. All
                  features run on your device. Clearing browser site data or uninstalling without a
                  JSON backup will remove local data.
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-surface p-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-indigo-400" />
                  <h3 className="text-sm font-bold text-text">Optional Synchronized Mode</h3>
                </div>
                <p className="mt-1.5 text-xs text-muted leading-relaxed">
                  Accounts are optional and authenticated using passwordless email one-time passwords
                  (OTP). Synchronized account data is transmitted over HTTPS and persisted in
                  managed PostgreSQL.
                </p>
                <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <span className="font-semibold text-amber-100">Important Disclosure:</span> In
                  this phase, cloud synchronization is not end-to-end encrypted. The backend API
                  validates, sanitizes, and indexes your account data in PostgreSQL to schedule
                  reminders and maintain multi-device state. If your workflow requires mathematical
                  confidentiality against server access, please remain in local-only mode.
                </div>
                <p className="mt-2 text-xs text-muted">
                  Anonymous local tasks and notes are never uploaded silently; synchronizing existing
                  local items requires explicit user confirmation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Follow Up Contact Data and Launchers */}
        <section aria-labelledby="contact-heading" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-xs font-bold text-accent">
              3
            </span>
            <h2 id="contact-heading" className="text-lg font-bold tracking-tight text-text sm:text-xl">
              Follow Up Contact Data and Communication Launchers
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-surface/50 p-5 leading-relaxed text-muted sm:p-6">
            <p className="text-sm sm:text-base">
              TaskFlow helps you remember commitments to people without turning into a heavy CRM or
              marketing platform:
            </p>
            <ul className="mt-3 flex flex-col gap-2.5 text-xs sm:text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                <span>
                  <strong className="text-text">Local-First Storage:</strong> Contact names, email
                  addresses, and phone numbers remain strictly on your device in local-only mode,
                  and synchronize to PostgreSQL only within an active account.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                <span>
                  <strong className="text-text">URI Launchers Only:</strong> Communication actions
                  (Email, WhatsApp, Phone) invoke standard URI schemes (mailto:, https://wa.me/,
                  tel:) to hand off to your installed client.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                <span>
                  <strong className="text-text">No Delivery Tracking:</strong> TaskFlow never
                  monitors whether an email was sent, a message was delivered, or a phone call was
                  completed. Opening a launcher never automatically completes or deletes a
                  commitment.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
                <span>
                  <strong className="text-text">Zero Autonomous Messaging:</strong> TaskFlow never
                  sends background messages, marketing blasts, or automated communications without
                  your direct manual action.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Notifications & Delivery Realities */}
        <section aria-labelledby="notifications-heading" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-xs font-bold text-accent">
              4
            </span>
            <h2 id="notifications-heading" className="text-lg font-bold tracking-tight text-text sm:text-xl">
              Notification Limitations and Privacy
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-surface/50 p-5 leading-relaxed text-muted sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border/80 bg-surface p-4">
                <h3 className="text-sm font-bold text-text">Mobile & Windows Clients</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Schedule notifications directly through native operating system APIs from local
                  SQLite databases. They fire reliably offline without needing cloud servers or an
                  account.
                </p>
              </div>
              <div className="rounded-lg border border-border/80 bg-surface p-4">
                <h3 className="text-sm font-bold text-text">Web Application</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  In-app banners work when the tab is open. Closed-app notifications require an
                  account, Web Push subscription, browser permissions, and an active internet
                  connection.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border/80 bg-surface p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text">
                Delivery Realities and Lock-Screen Privacy
              </h3>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                Notification delivery is inherently best effort. Operating systems and browsers
                retain ultimate control over notifications: focus modes, battery optimization, and
                background execution rules may delay or silence alerts.
              </p>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                To protect your privacy, lock-screen notifications show generic previews by default
                (e.g., &quot;Follow-up due&quot;) without revealing contact names or sensitive note text.
                Detailed previews require explicit activation in settings.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Platform Support Policy */}
        <section aria-labelledby="platform-heading" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-xs font-bold text-accent">
              5
            </span>
            <h2 id="platform-heading" className="text-lg font-bold tracking-tight text-text sm:text-xl">
              Platform Support Policy
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-surface/50 p-5 leading-relaxed text-muted sm:p-6">
            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between border-b border-border/60 pb-2.5">
                <span className="font-semibold text-text">Web Client</span>
                <span className="text-xs text-muted">
                  Evergreen Chrome, Edge, Firefox, Safari, and standard PWA runtimes.
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between border-b border-border/60 pb-2.5">
                <span className="font-semibold text-text">Windows Client</span>
                <span className="text-xs text-muted">
                  Windows 11 and Windows 10 Enterprise / IoT LTSC (build 17763+). Consumer Windows 10 is best effort.
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between border-b border-border/60 pb-2.5">
                <span className="font-semibold text-text">Mobile Clients</span>
                <span className="text-xs text-muted">
                  Supported Android and iOS versions maintained by current React Native and Expo releases.
                </span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <span className="font-semibold text-text">API Compatibility</span>
                <span className="text-xs text-muted">
                  API v1 preserves backward compatibility for older native client releases.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Explicit Non-Goals */}
        <section aria-labelledby="nongoals-heading" className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-xs font-bold text-accent">
              6
            </span>
            <h2 id="nongoals-heading" className="text-lg font-bold tracking-tight text-text sm:text-xl">
              Explicit Non-Goals
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-surface/50 p-5 leading-relaxed text-muted sm:p-6">
            <p className="text-sm sm:text-base">
              To remain focused, fast, and personal, TaskFlow intentionally excludes:
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-surface px-3 py-2 text-muted">
                <span className="text-red-400 font-bold">✕</span> No mandatory sign-up or account requirement
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-surface px-3 py-2 text-muted">
                <span className="text-red-400 font-bold">✕</span> No automatic upload of anonymous local data
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-surface px-3 py-2 text-muted">
                <span className="text-red-400 font-bold">✕</span> No team workspaces, assignments, or comments
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-surface px-3 py-2 text-muted">
                <span className="text-red-400 font-bold">✕</span> No CRM features or contact book synchronization
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-surface px-3 py-2 text-muted">
                <span className="text-red-400 font-bold">✕</span> No marketing campaigns or bulk messaging
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-surface px-3 py-2 text-muted">
                <span className="text-red-400 font-bold">✕</span> No autonomous background communications
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-surface px-3 py-2 text-muted">
                <span className="text-red-400 font-bold">✕</span> No advertising, trackers, or behavioral analytics
              </div>
              <div className="flex items-center gap-2 rounded-md border border-border/70 bg-surface px-3 py-2 text-muted">
                <span className="text-red-400 font-bold">✕</span> No shared runtime code among web, mobile, and Windows
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
