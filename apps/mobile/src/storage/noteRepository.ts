import type { SqliteDatabase } from "../db/driver.js";
import type { Note, CreateNoteInput, UpdateNoteInput } from "../types/note.js";
import { validateNoteInput } from "../services/validation.js";

interface NoteRow {
  id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

function mapRowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class NoteRepository {
  constructor(private db: SqliteDatabase) {}

  async create(input: CreateNoteInput): Promise<Note> {
    const validation = validateNoteInput(input, true);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid note input");
    }

    const id = "note_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();
    const title = input.title.trim();
    const body = input.body ? input.body.trim() : "";

    await this.db.execute(
      "INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, title, body, now, now]
    );

    return {
      id,
      title,
      body,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getById(id: string): Promise<Note | null> {
    const row = await this.db.queryFirst<NoteRow>(
      "SELECT * FROM notes WHERE id = ?",
      [id]
    );
    return row ? mapRowToNote(row) : null;
  }

  async list(search?: string): Promise<Note[]> {
    const rows = await this.db.query<NoteRow>(
      "SELECT * FROM notes ORDER BY updated_at DESC"
    );
    let notes = rows.map(mapRowToNote);

    if (search) {
      const q = search.toLowerCase();
      notes = notes.filter(
        (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
      );
    }

    return notes;
  }

  async update(id: string, input: UpdateNoteInput): Promise<Note> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Note ${id} not found`);
    }

    const validation = validateNoteInput(input, false);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid note update");
    }

    const now = new Date().toISOString();
    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const body = input.body !== undefined ? input.body.trim() : existing.body;

    await this.db.execute(
      "UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?",
      [title, body, now, id]
    );

    return {
      id,
      title,
      body,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    await this.db.execute("DELETE FROM notes WHERE id = ?", [id]);
    return true;
  }
}
