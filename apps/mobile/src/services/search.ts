import type { Task } from "../types/task.js";
import type { Note } from "../types/note.js";
import type { TaskRepository } from "../storage/taskRepository.js";
import type { NoteRepository } from "../storage/noteRepository.js";

export interface SearchResults {
  query: string;
  tasks: Task[];
  notes: Note[];
  totalCount: number;
}

export class SearchService {
  constructor(
    private taskRepo: TaskRepository,
    private noteRepo: NoteRepository
  ) {}

  async search(query: string, options?: { limit?: number }): Promise<SearchResults> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return {
        query,
        tasks: [],
        notes: [],
        totalCount: 0,
      };
    }

    const allTasks = await this.taskRepo.list();
    const allNotes = await this.noteRepo.list();

    const matchingTasks = allTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(trimmed) ||
        (t.description && t.description.toLowerCase().includes(trimmed))
    );

    const matchingNotes = allNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(trimmed) ||
        (n.body && n.body.toLowerCase().includes(trimmed))
    );

    // Score/sort tasks: title matches rank above description-only matches
    matchingTasks.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(trimmed);
      const bTitle = b.title.toLowerCase().includes(trimmed);
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return 0;
    });

    // Score/sort notes: title matches rank above body-only matches
    matchingNotes.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(trimmed);
      const bTitle = b.title.toLowerCase().includes(trimmed);
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return 0;
    });

    const limit = options?.limit ?? 50;
    const tasks = matchingTasks.slice(0, limit);
    const notes = matchingNotes.slice(0, limit);

    return {
      query,
      tasks,
      notes,
      totalCount: tasks.length + notes.length,
    };
  }
}
