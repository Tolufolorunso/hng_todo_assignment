import type { Metadata } from "next";
import { Suspense } from "react";
import AppHeader from "@/components/app/AppHeader";
import PlanScreen from "@/components/plan/PlanScreen";

export const metadata: Metadata = {
  title: "Plan My Day",
  description:
    "Organize your day with capacity-aware recommendations across tasks and commitments, effort estimation, and safe daily shortlists.",
  alternates: {
    canonical: "/plan",
  },
};

export default function PlanPage() {
  return (
    <>
      <AppHeader active="plan" />
      <Suspense
        fallback={
          <main className="mx-auto flex w-full max-w-4xl flex-1 px-4 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-20" />
        }
      >
        <PlanScreen />
      </Suspense>
    </>
  );
}
