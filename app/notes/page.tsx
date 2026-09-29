import AppHeader from "@/components/app/AppHeader";
import NotesScreen from "@/components/notes/NotesScreen";

export default function NotesPage() {
  return (
    <>
      <AppHeader active="notes" />
      <NotesScreen />
    </>
  );
}
