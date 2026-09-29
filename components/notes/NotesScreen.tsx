"use client";

import { useCallback, useEffect, useState } from "react";
import NoteEditor from "@/components/notes/NoteEditor";
import NoteList from "@/components/notes/NoteList";
import {
  NoteNotFoundError,
  createNote,
  deleteNote,
  filterNotes,
  listNotes,
  updateNote,
} from "@/lib/notes";
import type { Note } from "@/types/note";

type Status = "loading" | "ready" | "error";

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(
    () =>
      listNotes().then(
        (loaded) => {
          setNotes(loaded);
          setStatus("ready");
        },
        () => {
          setStatus("error");
        },
      ),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectedNote =
    selectedId === null ? null : (notes.find((n) => n.id === selectedId) ?? null);
  const visibleNotes = filterNotes(notes, query);

  function reportError(caught: unknown) {
    setMutationError(
      caught instanceof NoteNotFoundError
        ? "That note no longer exists. Reload the page to refresh the list."
        : "Could not save the note. Please try again.",
    );
  }

  async function handleSave(values: {
    title: string;
    body: string;
  }): Promise<boolean> {
    setMutationError(null);
    setPending(true);
    try {
      if (selectedNote === null) {
        const created = await createNote(values);
        await load();
        setSelectedId(created.id);
      } else {
        await updateNote(selectedNote.id, values);
        await load();
      }
      return true;
    } catch (caught) {
      reportError(caught);
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(): Promise<boolean> {
    if (selectedNote === null) {
      return true;
    }
    setMutationError(null);
    setPending(true);
    try {
      await deleteNote(selectedNote.id);
      await load();
      setSelectedId(null);
      return true;
    } catch {
      setMutationError("Could not delete the note. Please try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-4xl flex-1 grid-cols-1 gap-6 px-6 py-8 md:grid-cols-[20rem_1fr]">
      <NoteList
        notes={visibleNotes}
        totalCount={notes.length}
        status={status}
        query={query}
        selectedId={selectedId}
        disabled={pending}
        onQueryChange={setQuery}
        onSelect={(id) => setSelectedId(id)}
        onClearSearch={() => setQuery("")}
        onNew={() => setSelectedId(null)}
      />

      <div className="flex flex-col gap-3">
        {status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            Could not load your notes. Reload the page to try again.
          </p>
        ) : (
          <>
            {mutationError !== null && (
              <p role="alert" className="text-sm text-danger">
                {mutationError}
              </p>
            )}
            <NoteEditor
              key={selectedId ?? "new"}
              note={selectedNote}
              disabled={pending}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>
    </main>
  );
}
