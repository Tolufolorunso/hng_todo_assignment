import { getDb } from "@/lib/db";
import {
  validateNoteInput,
  validateNotePatch,
  type NoteInput,
  type NotePatch,
} from "@/lib/validation";
import { stripHtmlToText } from "@/lib/html";
import type { Note } from "@/types/note";

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

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export async function createNote(input: NoteInput): Promise<Note> {
  const validation = validateNoteInput(input);
  if (!validation.ok) {
    throw new NoteValidationError(validation.error);
  }

  const timestamp = now();
  const note: Note = {
    id: newId(),
    title: validation.value.title,
    body: validation.value.body,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const db = await getDb();
  await db.put("notes", note);
  return note;
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDb();
  return db.get("notes", id);
}

export async function listNotes(): Promise<Note[]> {
  const db = await getDb();
  const notes = await db.getAll("notes");
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

  const db = await getDb();
  const existing = await db.get("notes", id);
  if (existing === undefined) {
    throw new NoteNotFoundError(id);
  }

  const updated: Note = { ...existing, ...validation.value, updatedAt: now() };
  await db.put("notes", updated);
  return updated;
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("notes", id);
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
