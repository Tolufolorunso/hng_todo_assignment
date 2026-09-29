import type { Metadata } from "next";
import AppHeader from "@/components/app/AppHeader";
import CalendarScreen from "@/components/calendar/CalendarScreen";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Calendar & Schedule",
  description: "Schedule and due date mapping for TaskFlow tasks.",
  alternates: {
    canonical: "/calendar",
  },
};


export default function CalendarPage() {
  return (
    <>
      <AppHeader active="calendar" />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-10">
        <div className="flex flex-col gap-1 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              Calendar & Schedule
            </h1>
            <p className="mt-1 text-sm text-muted">
              Map, track, and inspect tasks by their scheduled due dates.
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

        <CalendarScreen />
      </main>
    </>
  );
}
