import type { Metadata } from "next";
import { Suspense } from "react";
import AppHeader from "@/components/app/AppHeader";
import NotesScreen from "@/components/notes/NotesScreen";

export const metadata: Metadata = {
  title: "Notes Workspace",
  description:
    "Capture thoughts, documentation, and ideas with Microsoft Word-style WYSIWYG rich text formatting and instant search.",
  alternates: {
    canonical: "/notes",
  },
};

export default function NotesPage() {
  return (
    <>
      <AppHeader active="notes" />
      <Suspense fallback={<main className="mx-auto flex w-full max-w-6xl flex-1 px-4 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-10" />}>
        <NotesScreen />
      </Suspense>
    </>
  );
}


