import type { Metadata } from "next";
import AppHeader from "@/components/app/AppHeader";
import AnalyticsScreen from "@/components/analytics/AnalyticsScreen";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Productivity Analytics & Insights",
  description: "Productivity metrics, velocity, and completion trends in TaskFlow.",
  alternates: {
    canonical: "/analytics",
  },
};


export default function AnalyticsPage() {
  return (
    <>
      <AppHeader active="analytics" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-20">
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

        <AnalyticsScreen />
      </main>
    </>
  );
}
