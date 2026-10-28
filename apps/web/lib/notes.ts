import { stripHtmlToText } from "@/lib/html";
import {
  validateNoteInput,
  validateNotePatch,
  type NoteInput,
  type NotePatch,
} from "@/lib/validation";
import {
  getActiveWorkspaceId,
  createNote as repoCreateNote,
  getNote as repoGetNote,
  listNotes as repoListNotes,
  updateNote as repoUpdateNote,
  deleteNote as repoDeleteNote,
  listTasks as repoListTasks,
  listFollowUps as repoListFollowUps,
} from "@/lib/repository";
import type { Note } from "@/types/note";
import type { Task } from "@/types/task";
import type { FollowUp } from "@/types/followup";

export class NoteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoteValidationError";
  }
}

export class NoteNotFoundError extends Error {
  constructor(id: string) {
    super(`Note not found: ${id}`);
    this.name = "NoteNotFoundError";
  }
}

export async function createNote(input: NoteInput): Promise<Note> {
  const validation = validateNoteInput(input);
  if (!validation.ok) {
    throw new NoteValidationError(validation.error);
  }

  const workspaceId = getActiveWorkspaceId();
  return repoCreateNote(
    { title: validation.value.title, body: validation.value.body },
    { workspaceId }
  );
}

export async function getNote(id: string): Promise<Note | undefined> {
  const workspaceId = getActiveWorkspaceId();
  const note = await repoGetNote(id, { workspaceId });
  return note ?? undefined;
}

export async function listNotes(): Promise<Note[]> {
  const workspaceId = getActiveWorkspaceId();
  const notes = await repoListNotes({ workspaceId });
  return notes.sort((a, b) => {
    if (a.updatedAt !== b.updatedAt) {
      return a.updatedAt < b.updatedAt ? 1 : -1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export async function updateNote(id: string, patch: NotePatch): Promise<Note> {
  const validation = validateNotePatch(patch);
  if (!validation.ok) {
    throw new NoteValidationError(validation.error);
  }

  const workspaceId = getActiveWorkspaceId();
  try {
    return await repoUpdateNote(id, validation.value, { workspaceId });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Note not found")) {
      throw new NoteNotFoundError(id);
    }
    throw err;
  }
}

export async function deleteNote(id: string): Promise<void> {
  const workspaceId = getActiveWorkspaceId();
  await repoDeleteNote(id, { workspaceId });
}

export function filterNotes(notes: Note[], query: string): Note[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    return notes;
  }
  return notes.filter((note) => {
    if (note.title.toLowerCase().includes(needle)) {
      return true;
    }
    const plain = stripHtmlToText(note.body).toLowerCase();
    return plain.includes(needle) || note.body.toLowerCase().includes(needle);
  });
}

export interface NoteBacklinks {
  tasks: Task[];
  followups: FollowUp[];
}

export async function getNoteBacklinks(noteId: string): Promise<NoteBacklinks> {
  const workspaceId = getActiveWorkspaceId();
  const allTasks = await repoListTasks({ workspaceId });
  const tasks = allTasks.filter((t) => t.sourceNoteId === noteId);

  const allFollowups = await repoListFollowUps({ workspaceId });
  const followups = allFollowups.filter((f) => f.sourceNoteId === noteId);

  tasks.sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? 1 : -1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  followups.sort((a, b) => (a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : 0));

  return { tasks, followups };
}
