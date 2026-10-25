import { afterEach, describe, expect, it } from "vitest";
import { deleteDb } from "@/lib/db";
import {
  createCapture,
  getCapture,
  listCaptures,
  getPendingCapturesCount,
  discardCapture,
  deleteCapture,
  processCapture,
} from "@/lib/inbox";
import { getTask } from "@/lib/tasks";
import { getNote } from "@/lib/notes";
import { getFollowUp } from "@/lib/followups";

afterEach(async () => {
  await deleteDb();
});

describe("inbox", () => {
  it("creates a capture with text and automatically extracts URL", async () => {
    const capture = await createCapture({
      text: "Check out this documentation https://nextjs.org/docs for setup",
    });

    expect(capture.id).toBeDefined();
    expect(capture.text).toBe("Check out this documentation https://nextjs.org/docs for setup");
    expect(capture.sharedUrl).toBe("https://nextjs.org/docs");
    expect(capture.state).toBe("pending");
    expect(capture.targetType).toBeNull();
    expect(capture.targetId).toBeNull();

    const fetched = await getCapture(capture.id);
    expect(fetched).toEqual(capture);
  });

  it("fails to create capture with empty text", async () => {
    await expect(createCapture({ text: "   " })).rejects.toThrow("Capture content cannot be empty.");
  });

  it("lists captures and filters by state", async () => {
    const c1 = await createCapture({ text: "Item 1" });
    const c2 = await createCapture({ text: "Item 2" });
    await discardCapture(c2.id);

    const pending = await listCaptures({ state: "pending" });
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe(c1.id);

    const discarded = await listCaptures({ state: "discarded" });
    expect(discarded.length).toBe(1);
    expect(discarded[0].id).toBe(c2.id);

    const all = await listCaptures();
    expect(all.length).toBe(2);
  });

  it("counts pending captures accurately", async () => {
    expect(await getPendingCapturesCount()).toBe(0);

    const c1 = await createCapture({ text: "Item 1" });
    await createCapture({ text: "Item 2" });
    expect(await getPendingCapturesCount()).toBe(2);

    await discardCapture(c1.id);
    expect(await getPendingCapturesCount()).toBe(1);
  });

  it("deletes a capture", async () => {
    const capture = await createCapture({ text: "To delete" });
    expect(await getCapture(capture.id)).not.toBeNull();

    await deleteCapture(capture.id);
    expect(await getCapture(capture.id)).toBeNull();
  });

  describe("processCapture", () => {
    it("converts capture into a task and preserves capture text", async () => {
      const capture = await createCapture({
        text: "Buy groceries\nMilk, eggs, and bread",
        sharedUrl: null,
      });

      const result = await processCapture(capture.id, {
        targetType: "task",
        priority: "high",
        category: "personal",
      });

      expect(result.targetType).toBe("task");
      expect(result.isExisting).toBe(false);
      expect(result.capture.state).toBe("processed");
      expect(result.capture.targetId).toBe(result.targetId);

      const task = await getTask(result.targetId);
      expect(task).not.toBeNull();
      expect(task?.title).toBe("Buy groceries");
      expect(task?.description).toContain("Milk, eggs, and bread");
      expect(task?.priority).toBe("high");
      expect(task?.category).toBe("personal");

      // Verify original text preserved
      const updatedCapture = await getCapture(capture.id);
      expect(updatedCapture?.text).toBe("Buy groceries\nMilk, eggs, and bread");
    });

    it("converts capture into a note", async () => {
      const capture = await createCapture({
        text: "Meeting notes\nDiscussed Q4 roadmap and deliverables.",
        sharedUrl: "https://example.com/meeting",
      });

      const result = await processCapture(capture.id, {
        targetType: "note",
      });

      expect(result.targetType).toBe("note");
      expect(result.isExisting).toBe(false);

      const note = await getNote(result.targetId);
      expect(note).not.toBeNull();
      expect(note?.title).toBe("Meeting notes");
      expect(note?.body).toContain("Discussed Q4 roadmap");
      expect(note?.body).toContain("https://example.com/meeting");
    });

    it("converts capture into a follow-up", async () => {
      const capture = await createCapture({
        text: "Send proposal to Sarah by Thursday",
      });

      const result = await processCapture(capture.id, {
        targetType: "followup",
        personName: "Sarah",
        commitment: "Send proposal by Thursday",
      });

      expect(result.targetType).toBe("followup");
      expect(result.isExisting).toBe(false);

      const fu = await getFollowUp(result.targetId);
      expect(fu).not.toBeNull();
      expect(fu?.personName).toBe("Sarah");
      expect(fu?.commitment).toBe("Send proposal by Thursday");
    });

    it("is idempotent when called repeatedly", async () => {
      const capture = await createCapture({
        text: "Important client invoice",
      });

      const firstResult = await processCapture(capture.id, {
        targetType: "task",
        title: "Process invoice",
      });
      expect(firstResult.isExisting).toBe(false);

      const secondResult = await processCapture(capture.id, {
        targetType: "task",
        title: "Process invoice",
      });
      expect(secondResult.isExisting).toBe(true);
      expect(secondResult.targetId).toBe(firstResult.targetId);
    });
  });
});
