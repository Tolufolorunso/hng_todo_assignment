import AppHeader from "@/components/app/AppHeader";
import StandaloneNoteView from "@/components/notes/StandaloneNoteView";

interface NotePageProps {
  params: Promise<{
    id: string;
  }>;
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
