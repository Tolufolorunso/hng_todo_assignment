import { Suspense } from "react";
import AppHeader from "@/components/app/AppHeader";
import NotesScreen from "@/components/notes/NotesScreen";

export default function NotesPage() {
  return (
    <>
      <AppHeader active="notes" />
      <Suspense fallback={<main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-10" />}>
        <NotesScreen />
      </Suspense>
    </>
  );
}

