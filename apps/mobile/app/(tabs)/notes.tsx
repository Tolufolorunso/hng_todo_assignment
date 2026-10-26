import React from "react";
import { useRouter } from "expo-router";
import { useAppServices, useAppServicesState } from "../../src/context/AppContext.js";
import { NotesScreen } from "../../src/screens/NotesScreen.js";

export default function NotesTabScreen(): React.JSX.Element {
  const router = useRouter();
  const { noteRepo } = useAppServices();
  const { refreshKey } = useAppServicesState();

  return (
    <NotesScreen
      key={`notes_${refreshKey}`}
      noteRepo={noteRepo}
      onNavigateToEdit={(noteId) => {
        router.push({
          pathname: "/note-edit",
          params: noteId ? { noteId } : undefined,
        });
      }}
    />
  );
}
