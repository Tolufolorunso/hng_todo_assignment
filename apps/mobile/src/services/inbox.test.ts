import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySqliteDatabase } from "../db/driver.js";
import { runMigrations } from "../db/migrations.js";
import { TaskRepository } from "../storage/taskRepository.js";
import { NoteRepository } from "../storage/noteRepository.js";
import { FollowUpRepository } from "../storage/followUpRepository.js";
import { InboxRepository } from "../storage/inboxRepository.js";
import { InboxTriageService } from "./inbox.js";
import {
  createTaskFromNoteExcerpt,
  createFollowUpFromNoteExcerpt,
  getNoteBacklinks,
} from "./actionableNotes.js";

describe("Inbox and Actionable Notes Services", () => {
  let db: InMemorySqliteDatabase;
  let taskRepo: TaskRepository;
  let noteRepo: NoteRepository;
  let followUpRepo: FollowUpRepository;
  let inboxRepo: InboxRepository;
  let triageService: InboxTriageService;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);
    taskRepo = new TaskRepository(db);
    noteRepo = new NoteRepository(db);
    followUpRepo = new FollowUpRepository(db);
    inboxRepo = new InboxRepository(db);
    triageService = new InboxTriageService(inboxRepo, taskRepo, noteRepo, followUpRepo);
  });

  it("captures items and triages them to a Task", async () => {
    const capture = await inboxRepo.create({
      text: "Draft weekly sprint report\nMake sure to check Jira metrics",
      sharedUrl: "https://jira.example.com/sprint-12",
      sourceAppLabel: "Slack",
    });

    expect(capture.state).toBe("pending");

    const result = await triageService.triageToTask(capture.id, {
      priority: "high",
    });

    expect(result.capture.state).toBe("processed");
    expect(result.capture.resultEntityType).toBe("task");
    expect(result.task.title).toBe("Draft weekly sprint report");
    expect(result.task.priority).toBe("high");
    expect(result.task.description).toContain("https://jira.example.com/sprint-12");
  });

  it("triages capture to a Note", async () => {
    const capture = await inboxRepo.create({
      text: "Product strategy ideas\n1. Focus on mobile experience\n2. Add offline sync",
    });

    const result = await triageService.triageToNote(capture.id);

    expect(result.capture.state).toBe("processed");
    expect(result.note.title).toBe("Product strategy ideas");
    expect(result.note.body).toContain("Focus on mobile experience");
  });

  it("triages capture to a FollowUp", async () => {
    const capture = await inboxRepo.create({
      text: "Call Sarah regarding invoice approval",
    });

    const result = await triageService.triageToFollowUp(capture.id, {
      personName: "Sarah Connor",
      commitment: "Review and approve invoice",
      dueAt: "2026-10-26T15:00:00Z",
      emailAddress: "sarah@cyberdyne.com",
      preferredAction: "email",
    });

    expect(result.capture.state).toBe("processed");
    expect(result.followUp.personName).toBe("Sarah Connor");
    expect(result.followUp.emailAddress).toBe("sarah@cyberdyne.com");
  });

  it("supports discarding inbox captures", async () => {
    const capture = await inboxRepo.create({
      text: "Random ephemeral thought",
    });

    const discarded = await triageService.discard(capture.id);
    expect(discarded.state).toBe("discarded");
  });

  it("spawns tasks and follow-ups from note excerpts with backlinks", async () => {
    const note = await noteRepo.create({
      title: "Quarterly Strategy Review",
      body:
        "Discussed market positioning and team expansion.\nAction item: Hire two senior frontend developers by end of month.\nAlso remember: Follow up with Bob about contractor rates.",
    });

    const taskExcerpt = "Hire two senior frontend developers by end of month.";
    const spawnedTask = await createTaskFromNoteExcerpt(taskRepo, note, taskExcerpt, {
      priority: "high",
    });

    expect(spawnedTask.sourceNoteId).toBe(note.id);
    expect(spawnedTask.sourceExcerpt).toBe(taskExcerpt);
    expect(spawnedTask.title).toBe(taskExcerpt);

    const fuExcerpt = "Follow up with Bob about contractor rates.";
    const spawnedFollowUp = await createFollowUpFromNoteExcerpt(followUpRepo, note, fuExcerpt, {
      personName: "Bob Smith",
      commitment: "Confirm contractor rates for Q4",
      dueAt: "2026-10-28T12:00:00Z",
    });

    expect(spawnedFollowUp.sourceNoteId).toBe(note.id);
    expect(spawnedFollowUp.sourceExcerpt).toBe(fuExcerpt);

    const backlinks = await getNoteBacklinks(taskRepo, followUpRepo, note.id);
    expect(backlinks.noteId).toBe(note.id);
    expect(backlinks.tasks.length).toBe(1);
    expect(backlinks.tasks[0].id).toBe(spawnedTask.id);
    expect(backlinks.followups.length).toBe(1);
    expect(backlinks.followups[0].id).toBe(spawnedFollowUp.id);
  });
});
