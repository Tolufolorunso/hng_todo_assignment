import type { TaskRepository } from "../storage/taskRepository";
import type { FollowUpRepository } from "../storage/followUpRepository";
import type { Task, CreateTaskInput } from "../types/task";
import type { FollowUp, CreateFollowUpInput } from "../types/followup";
import type { Note } from "../types/note";

export interface NoteBacklinks {
  noteId: string;
  tasks: Task[];
  followups: FollowUp[];
}

export async function createTaskFromNoteExcerpt(
  taskRepo: TaskRepository,
  note: Note,
  excerpt: string,
  overrides: Partial<CreateTaskInput> = {}
): Promise<Task> {
  const trimmedExcerpt = excerpt.trim();
  if (!trimmedExcerpt) {
    throw new Error("Note excerpt cannot be empty");
  }

  // Use first line up to 100 chars as default title
  const firstLine = trimmedExcerpt.split("\n")[0].trim();
  const title = overrides.title || (firstLine.length > 100 ? firstLine.slice(0, 97) + "..." : firstLine);

  return taskRepo.create({
    title,
    description: overrides.description || trimmedExcerpt,
    category: overrides.category || "work",
    priority: overrides.priority || "medium",
    dueDate: overrides.dueDate || null,
    estimatedMinutes: overrides.estimatedMinutes || 30,
    sourceNoteId: note.id,
    sourceExcerpt: trimmedExcerpt,
  });
}

export async function createFollowUpFromNoteExcerpt(
  followUpRepo: FollowUpRepository,
  note: Note,
  excerpt: string,
  input: {
    personName: string;
    commitment?: string;
    dueAt: string;
    timeZone?: string;
    emailAddress?: string | null;
    phoneNumber?: string | null;
    whatsAppNumber?: string | null;
    preferredAction?: FollowUp["preferredAction"];
  }
): Promise<FollowUp> {
  const trimmedExcerpt = excerpt.trim();
  if (!trimmedExcerpt) {
    throw new Error("Note excerpt cannot be empty");
  }

  const commitment = input.commitment?.trim() || trimmedExcerpt.split("\n")[0].trim();

  return followUpRepo.create({
    personName: input.personName,
    commitment,
    details: trimmedExcerpt,
    dueAt: input.dueAt,
    timeZone: input.timeZone || "UTC",
    emailAddress: input.emailAddress || null,
    phoneNumber: input.phoneNumber || null,
    whatsAppNumber: input.whatsAppNumber || null,
    preferredAction: input.preferredAction || null,
    sourceNoteId: note.id,
    sourceExcerpt: trimmedExcerpt,
  });
}

export async function getNoteBacklinks(
  taskRepo: TaskRepository,
  followUpRepo: FollowUpRepository,
  noteId: string
): Promise<NoteBacklinks> {
  const allTasks = await taskRepo.list();
  const linkedTasks = allTasks.filter((t) => t.sourceNoteId === noteId);

  const allFollowUps = await followUpRepo.list();
  const linkedFollowUps = allFollowUps.filter((f) => f.sourceNoteId === noteId);

  return {
    noteId,
    tasks: linkedTasks,
    followups: linkedFollowUps,
  };
}
