import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppServices, useAppServicesState } from "../src/context/AppContext";
import { NoteEditScreen } from "../src/screens/NoteEditScreen";

export default function NoteEditRoute(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ noteId?: string }>();
  const noteId = typeof params.noteId === "string" ? params.noteId : undefined;
  const { noteRepo } = useAppServices();
  const { notifyDataChanged } = useAppServicesState();

  return (
    <NoteEditScreen
      noteRepo={noteRepo}
      noteId={noteId}
      onDone={() => {
        notifyDataChanged();
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}
