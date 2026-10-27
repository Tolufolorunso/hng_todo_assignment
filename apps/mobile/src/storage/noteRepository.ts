import type { SqliteDatabase } from "../db/driver";
import type { Note, CreateNoteInput, UpdateNoteInput } from "../types/note";
import { validateNoteInput } from "../services/validation";
import { SyncRepository, type RepositoryOptions } from "./syncRepository";

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

  private getExecutor(options?: RepositoryOptions): SqliteDatabase {
    return options?.tx || this.db;
  }

  async create(input: CreateNoteInput, options?: RepositoryOptions): Promise<Note> {
    const validation = validateNoteInput(input, true);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid note input");
    }

    const executor = this.getExecutor(options);
    const id = "note_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const now = new Date().toISOString();
    const title = input.title.trim();
    const body = input.body ? input.body.trim() : "";

    await executor.execute(
      "INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [id, title, body, now, now]
    );

    const note: Note = {
      id,
      title,
      body,
      createdAt: now,
      updatedAt: now,
    };

    if (options?.enqueueOutbox) {
      const syncRepo = new SyncRepository(executor);
      await syncRepo.enqueueOutbox(
        {
          entityType: "note",
          entityId: id,
          action: "put",
          payload: JSON.stringify(note),
        },
        executor
      );
    }

    return note;
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

  async update(id: string, input: UpdateNoteInput, options?: RepositoryOptions): Promise<Note> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Note ${id} not found`);
    }

    const validation = validateNoteInput(input, false);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid note update");
    }

    const executor = this.getExecutor(options);
    const now = new Date().toISOString();
    const title = input.title !== undefined ? input.title.trim() : existing.title;
    const body = input.body !== undefined ? input.body.trim() : existing.body;

    await executor.execute(
      "UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?",
      [title, body, now, id]
    );

    const updatedNote: Note = {
      id,
      title,
      body,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    if (options?.enqueueOutbox) {
      const syncRepo = new SyncRepository(executor);
      const baseRev = await syncRepo.getServerRevision("note", id);
      await syncRepo.enqueueOutbox(
        {
          entityType: "note",
          entityId: id,
          action: "put",
          baseRevision: baseRev,
          payload: JSON.stringify(updatedNote),
        },
        executor
      );
    }

    return updatedNote;
  }

  async delete(id: string, options?: RepositoryOptions): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    const executor = this.getExecutor(options);
    await executor.execute("DELETE FROM notes WHERE id = ?", [id]);

    if (options?.enqueueOutbox) {
      const syncRepo = new SyncRepository(executor);
      const baseRev = await syncRepo.getServerRevision("note", id);
      await syncRepo.enqueueOutbox(
        {
          entityType: "note",
          entityId: id,
          action: "delete",
          baseRevision: baseRev,
        },
        executor
      );
      await syncRepo.recordTombstone("local", "note", id, executor);
    }

    return true;
  }

  async putRaw(note: Note, tx?: SqliteDatabase): Promise<void> {
    const executor = tx || this.db;
    const existing = await executor.queryFirst<{ id: string }>("SELECT id FROM notes WHERE id = ?", [note.id]);
    if (existing) {
      await executor.execute(
        "UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?",
        [note.title, note.body, note.updatedAt, note.id]
      );
    } else {
      await executor.execute(
        "INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [note.id, note.title, note.body, note.createdAt, note.updatedAt]
      );
    }
  }
}
