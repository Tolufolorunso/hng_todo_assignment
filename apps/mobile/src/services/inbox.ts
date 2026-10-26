import type { InboxRepository } from "../storage/inboxRepository.js";
import type { TaskRepository } from "../storage/taskRepository.js";
import type { NoteRepository } from "../storage/noteRepository.js";
import type { FollowUpRepository } from "../storage/followUpRepository.js";
import type { InboxCapture } from "../types/inbox.js";
import type { Task, CreateTaskInput } from "../types/task.js";
import type { Note } from "../types/note.js";
import type { FollowUp, CreateFollowUpInput } from "../types/followup.js";

export class InboxTriageService {
  constructor(
    private inboxRepo: InboxRepository,
    private taskRepo: TaskRepository,
    private noteRepo: NoteRepository,
    private followUpRepo: FollowUpRepository
  ) {}

  async triageToTask(
    captureId: string,
    overrides: Partial<CreateTaskInput> = {}
  ): Promise<{ capture: InboxCapture; task: Task }> {
    const capture = await this.inboxRepo.getById(captureId);
    if (!capture) {
      throw new Error(`Capture ${captureId} not found`);
    }

    if (capture.state === "processed" && capture.resultEntityId) {
      const existingTask = await this.taskRepo.getById(capture.resultEntityId);
      if (existingTask) {
        return { capture, task: existingTask };
      }
    }

    const firstLine = capture.text.split("\n")[0].trim();
    const title = overrides.title || (firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine);
    let description = overrides.description || capture.text;
    if (capture.sharedUrl && !description.includes(capture.sharedUrl)) {
      description += `\n\nLink: ${capture.sharedUrl}`;
    }

    const task = await this.taskRepo.create({
      title,
      description,
      category: overrides.category || "work",
      priority: overrides.priority || "medium",
      dueDate: overrides.dueDate || null,
      estimatedMinutes: overrides.estimatedMinutes || 30,
      sourceExcerpt: capture.text,
    });

    const updatedCapture = await this.inboxRepo.markProcessed(captureId, "task", task.id);
    return { capture: updatedCapture, task };
  }

  async triageToNote(
    captureId: string,
    overrides: { title?: string } = {}
  ): Promise<{ capture: InboxCapture; note: Note }> {
    const capture = await this.inboxRepo.getById(captureId);
    if (!capture) {
      throw new Error(`Capture ${captureId} not found`);
    }

    if (capture.state === "processed" && capture.resultEntityId) {
      const existingNote = await this.noteRepo.getById(capture.resultEntityId);
      if (existingNote) {
        return { capture, note: existingNote };
      }
    }

    const firstLine = capture.text.split("\n")[0].trim();
    const title = overrides.title || (firstLine.length > 60 ? firstLine.slice(0, 57) + "..." : firstLine);
    let body = capture.text;
    if (capture.sharedUrl && !body.includes(capture.sharedUrl)) {
      body += `\n\nLink: ${capture.sharedUrl}`;
    }

    const note = await this.noteRepo.create({
      title,
      body,
    });

    const updatedCapture = await this.inboxRepo.markProcessed(captureId, "note", note.id);
    return { capture: updatedCapture, note };
  }

  async triageToFollowUp(
    captureId: string,
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
  ): Promise<{ capture: InboxCapture; followUp: FollowUp }> {
    const capture = await this.inboxRepo.getById(captureId);
    if (!capture) {
      throw new Error(`Capture ${captureId} not found`);
    }

    if (capture.state === "processed" && capture.resultEntityId) {
      const existingFollowUp = await this.followUpRepo.getById(capture.resultEntityId);
      if (existingFollowUp) {
        return { capture, followUp: existingFollowUp };
      }
    }

    const commitment = input.commitment?.trim() || capture.text.split("\n")[0].trim();
    let details = capture.text;
    if (capture.sharedUrl && !details.includes(capture.sharedUrl)) {
      details += `\n\nLink: ${capture.sharedUrl}`;
    }

    const followUp = await this.followUpRepo.create({
      personName: input.personName,
      commitment,
      details,
      dueAt: input.dueAt,
      timeZone: input.timeZone || "UTC",
      emailAddress: input.emailAddress || null,
      phoneNumber: input.phoneNumber || null,
      whatsAppNumber: input.whatsAppNumber || null,
      preferredAction: input.preferredAction || null,
      sourceExcerpt: capture.text,
    });

    const updatedCapture = await this.inboxRepo.markProcessed(captureId, "followup", followUp.id);
    return { capture: updatedCapture, followUp };
  }

  async discard(captureId: string): Promise<InboxCapture> {
    return this.inboxRepo.discard(captureId);
  }
}
