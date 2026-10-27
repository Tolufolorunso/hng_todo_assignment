import type { Task } from "../types/task.js";
import type { Note } from "../types/note.js";
import type { MobileBackupSnapshot, BackupImportMode, BackupImportResult } from "../types/backup.js";
import type { TaskRepository } from "../storage/taskRepository.js";
import type { NoteRepository } from "../storage/noteRepository.js";
import type { SqliteDatabase } from "../db/driver.js";
import { validateTaskInput, validateNoteInput } from "./validation.js";

export class BackupService {
  constructor(
    private db: SqliteDatabase,
    private taskRepo: TaskRepository,
    private noteRepo: NoteRepository
  ) {}

  async exportSnapshot(): Promise<MobileBackupSnapshot> {
    const tasks = await this.taskRepo.list();
    const notes = await this.noteRepo.list();

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      origin: "taskflow-mobile",
      tasks,
      notes,
    };
  }

  async exportJsonString(): Promise<string> {
    const snapshot = await this.exportSnapshot();
    return JSON.stringify(snapshot, null, 2);
  }

  async importSnapshot(
    rawInput: string | Record<string, unknown>,
    mode: BackupImportMode = "merge"
  ): Promise<BackupImportResult> {
    let payload: Record<string, unknown>;
    if (typeof rawInput === "string") {
      try {
        payload = JSON.parse(rawInput);
      } catch {
        throw new Error("Invalid JSON: failed to parse backup data");
      }
    } else {
      payload = rawInput;
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid backup: payload must be an object");
    }

    const dataObj =
      payload.data && typeof payload.data === "object"
        ? (payload.data as Record<string, unknown>)
        : payload;

    const tasksRaw = Array.isArray(dataObj.tasks)
      ? dataObj.tasks
      : Array.isArray(payload.tasks)
        ? payload.tasks
        : [];
    const notesRaw = Array.isArray(dataObj.notes)
      ? dataObj.notes
      : Array.isArray(payload.notes)
        ? payload.notes
        : [];

    // Validate all tasks
    const validTasks: Task[] = [];
    for (const t of tasksRaw) {
      if (!t || typeof t !== "object") continue;
      const tObj = t as Record<string, unknown>;
      const validation = validateTaskInput(
        {
          title: String(tObj.title || ""),
          description: typeof tObj.description === "string" ? tObj.description : undefined,
          priority: tObj.priority as Task["priority"],
          dueDate: typeof tObj.dueDate === "string" ? tObj.dueDate : (tObj.due_date as string | undefined),
          category: tObj.category as Task["category"],
        },
        true
      );

      if (validation.valid) {
        const id = String(tObj.id || "task_" + Math.random().toString(36).substring(2));
        const now = new Date().toISOString();
        validTasks.push({
          id,
          title: String(tObj.title).trim(),
          description: typeof tObj.description === "string" ? tObj.description.trim() : "",
          completed: Boolean(tObj.completed),
          completedAt: typeof tObj.completedAt === "string" ? tObj.completedAt : (tObj.completed_at as string | null) || null,
          priority: (tObj.priority as Task["priority"]) || "medium",
          dueDate: typeof tObj.dueDate === "string" ? tObj.dueDate : (tObj.due_date as string | null) || null,
          category: (tObj.category as Task["category"]) || null,
          createdAt: typeof tObj.createdAt === "string" ? tObj.createdAt : (tObj.created_at as string | null) || now,
          updatedAt: typeof tObj.updatedAt === "string" ? tObj.updatedAt : (tObj.updated_at as string | null) || now,
        });
      }
    }

    // Validate all notes
    const validNotes: Note[] = [];
    for (const n of notesRaw) {
      if (!n || typeof n !== "object") continue;
      const nObj = n as Record<string, unknown>;
      const validation = validateNoteInput(
        {
          title: String(nObj.title || ""),
          body: typeof nObj.body === "string" ? nObj.body : undefined,
        },
        true
      );

      if (validation.valid) {
        const id = String(nObj.id || "note_" + Math.random().toString(36).substring(2));
        const now = new Date().toISOString();
        validNotes.push({
          id,
          title: String(nObj.title).trim(),
          body: typeof nObj.body === "string" ? nObj.body.trim() : "",
          createdAt: typeof nObj.createdAt === "string" ? nObj.createdAt : (nObj.created_at as string | null) || now,
          updatedAt: typeof nObj.updatedAt === "string" ? nObj.updatedAt : (nObj.updated_at as string | null) || now,
        });
      }
    }

    if (validTasks.length === 0 && validNotes.length === 0) {
      throw new Error("Invalid backup: no valid tasks or notes found in snapshot");
    }

    return await this.db.transaction(async (tx) => {
      let replacedCount = 0;
      if (mode === "replace") {
        await tx.execute("DELETE FROM tasks");
        await tx.execute("DELETE FROM notes");
        replacedCount = validTasks.length + validNotes.length;
      }

      let tasksImported = 0;
      for (const t of validTasks) {
        const existing = await tx.queryFirst<{ id: string }>("SELECT id FROM tasks WHERE id = ?", [t.id]);
        if (!existing) {
          await tx.execute(
            `INSERT INTO tasks (id, title, description, completed, completed_at, priority, due_date, category, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              t.id,
              t.title,
              t.description,
              t.completed ? 1 : 0,
              t.completedAt,
              t.priority,
              t.dueDate,
              t.category,
              t.createdAt,
              t.updatedAt,
            ]
          );
          tasksImported++;
        } else if (mode === "replace") {
          tasksImported++;
        }
      }

      let notesImported = 0;
      for (const n of validNotes) {
        const existing = await tx.queryFirst<{ id: string }>("SELECT id FROM notes WHERE id = ?", [n.id]);
        if (!existing) {
          await tx.execute(
            "INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            [n.id, n.title, n.body, n.createdAt, n.updatedAt]
          );
          notesImported++;
        } else if (mode === "replace") {
          notesImported++;
        }
      }

      return {
        mode,
        tasksImported,
        notesImported,
        replacedCount: mode === "replace" ? replacedCount : undefined,
      };
    });
  }
}
