import AppHeader from "@/components/app/AppHeader";
import Link from "next/link";

export const metadata = {
  title: "Analytics | TaskFlow",
  description: "Productivity metrics, velocity, and completion trends in TaskFlow.",
};

export default function AnalyticsPage() {
  return (
    <>
      <AppHeader active="analytics" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-1 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              Productivity & Analytics
            </h1>
            <p className="mt-1 text-sm text-muted">
              Deep insights into task completion rate, category balance, and productivity trends.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start rounded-control border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text shadow-sm transition-all hover:border-border-strong hover:bg-surface-muted"
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Manage Tasks
          </Link>
        </div>

        {/* Preview Shell / Coming Soon card for Feature 13 */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-surface p-12 text-center shadow-card">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <svg
              width="32"
              height="32"
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
          </div>
          <h2 className="mt-5 text-lg font-semibold text-text">
            Analytics & Velocity Insights
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            The completion rate velocity gauges, category breakdown bars, and priority distribution charts are being provisioned in Milestone E.
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3.5 py-1 text-xs font-medium text-accent">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            Scheduled for Milestone E Feature 13
          </div>
        </div>
      </main>
    </>
  );
}
