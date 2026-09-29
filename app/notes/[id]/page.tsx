import type { Metadata } from "next";
import AppHeader from "@/components/app/AppHeader";
import StandaloneNoteView from "@/components/notes/StandaloneNoteView";

interface NotePageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: NotePageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Document View",
    description:
      "Distraction-free standalone document reader for TaskFlow notes with word count, reading time, and print export.",
    alternates: {
      canonical: `/notes/${id}`,
    },
  };
}

export default async function StandaloneNotePage({ params }: NotePageProps) {
  const { id } = await params;

  return (
    <>
      <div className="print:hidden">
        <AppHeader active="notes" />
      </div>
      <StandaloneNoteView id={id} />
    </>
  );
}
