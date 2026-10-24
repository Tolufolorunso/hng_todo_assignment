import type { Metadata } from "next";
import { Suspense } from "react";
import AppHeader from "@/components/app/AppHeader";
import FollowUpsScreen from "@/components/followups/FollowUpsScreen";

export const metadata: Metadata = {
  title: "Follow Up Commitments",
  description:
    "Track commitments to people, recurring check-ins, snooze schedules, and direct communication launchers.",
  alternates: {
    canonical: "/followups",
  },
};

export default function FollowUpsPage() {
  return (
    <>
      <AppHeader active="followups" />
      <Suspense
        fallback={
          <main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-20" />
        }
      >
        <FollowUpsScreen />
      </Suspense>
    </>
  );
}
