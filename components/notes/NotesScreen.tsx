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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      {/* Title Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Notes Workspace</h1>
          <p className="mt-1 text-sm text-muted">
            Capture free-form context, thoughts, and documentation alongside your tasks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Notes List Column */}
        <div className="lg:col-span-4">
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
        </div>

        {/* Note Editor Column */}
        <div className="flex flex-col gap-4 lg:col-span-8">
          {status === "error" ? (
            <div className="rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger" role="alert">
              Could not load your notes. Reload the page to try again.
            </div>
          ) : (
            <>
              {mutationError !== null && (
                <div className="rounded-xl border border-danger/40 bg-danger-soft p-3.5 text-sm text-danger" role="alert">
                  {mutationError}
                </div>
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
      </div>
    </main>
  );
}
