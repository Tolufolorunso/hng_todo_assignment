import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX_LENGTH,
  NOTE_BODY_MAX_LENGTH,
  NOTE_TITLE_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  validateNoteInput,
  validateNotePatch,
  validateTaskInput,
  validateTaskPatch,
} from "@/lib/validation";

describe("validateTaskInput", () => {
  it("accepts a valid task and trims the title", () => {
    const result = validateTaskInput({ title: "  Buy milk  ", description: " 2 litres " });
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Buy milk",
        description: "2 litres",
        priority: "medium",
        dueDate: null,
        category: null,
      },
    });
  });

  it("accepts an optional numeric order in input", () => {
    const result = validateTaskInput({ title: "Task with order", order: 2 });
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Task with order",
        description: "",
        priority: "medium",
        dueDate: null,
        category: null,
        order: 2,
      },
    });
  });

  it("accepts valid categories in input", () => {
    const categories = ["work", "personal", "urgent", "study", "ideas"] as const;
    for (const cat of categories) {
      const result = validateTaskInput({ title: "Categorized", category: cat });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.category).toBe(cat);
      }
    }
  });

  it("rejects an invalid category in input", () => {
    const result = validateTaskInput({ title: "Invalid", category: "other" as never });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Category must be");
    }
  });

  it("defaults a missing description to an empty string", () => {
    const result = validateTaskInput({ title: "Buy milk" });
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Buy milk",
        description: "",
        priority: "medium",
        dueDate: null,
        category: null,
      },
    });
  });

  it("rejects a whitespace-only title", () => {
    const result = validateTaskInput({ title: "   " });
    expect(result.ok).toBe(false);
  });

  it("rejects an empty title", () => {
    const result = validateTaskInput({ title: "" });
    expect(result).toEqual({ ok: false, error: "Title is required." });
  });

  it("accepts a title exactly at the limit", () => {
    const result = validateTaskInput({ title: "a".repeat(TITLE_MAX_LENGTH) });
    expect(result.ok).toBe(true);
  });

  it("rejects a title over the limit", () => {
    const result = validateTaskInput({ title: "a".repeat(TITLE_MAX_LENGTH + 1) });
    expect(result.ok).toBe(false);
  });

  it("accepts a description exactly at the limit", () => {
    const result = validateTaskInput({
      title: "Task",
      description: "a".repeat(DESCRIPTION_MAX_LENGTH),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a description over the limit", () => {
    const result = validateTaskInput({
      title: "Task",
      description: "a".repeat(DESCRIPTION_MAX_LENGTH + 1),
    });
    expect(result.ok).toBe(false);
  });

  it("defaults a missing priority to medium and a missing due date to null", () => {
    expect(validateTaskInput({ title: "Task" })).toEqual({
      ok: true,
      value: {
        title: "Task",
        description: "",
        priority: "medium",
        dueDate: null,
        category: null,
      },
    });
  });

  it("accepts each valid priority", () => {
    for (const priority of ["low", "medium", "high"] as const) {
      const result = validateTaskInput({ title: "Task", priority });
      expect(result.ok && result.value.priority).toBe(priority);
    }
  });

  it("rejects an unknown priority", () => {
    expect(validateTaskInput({ title: "Task", priority: "urgent" as never }).ok).toBe(
      false,
    );
  });

  it("accepts a real date-only due date", () => {
    const result = validateTaskInput({ title: "Task", dueDate: "2026-02-28" });
    expect(result.ok && result.value.dueDate).toBe("2026-02-28");
  });

  it("clears an empty due date to null", () => {
    const result = validateTaskInput({ title: "Task", dueDate: "" });
    expect(result.ok && result.value.dueDate).toBeNull();
  });

  it("rejects malformed and impossible due dates", () => {
    for (const dueDate of ["2026-2-3", "2026-13-01", "2026-02-30", "nope", "2026/02/03"]) {
      expect(validateTaskInput({ title: "Task", dueDate }).ok).toBe(false);
    }
  });
});

describe("validateTaskPatch", () => {
  it("returns an empty patch for an empty input", () => {
    const result = validateTaskPatch({});
    expect(result).toEqual({ ok: true, value: {} });
  });

  it("normalizes a provided title and description", () => {
    const result = validateTaskPatch({ title: " New title ", description: " body " });
    expect(result).toEqual({
      ok: true,
      value: { title: "New title", description: "body" },
    });
  });

  it("rejects an empty title in a patch", () => {
    const result = validateTaskPatch({ title: "  " });
    expect(result.ok).toBe(false);
  });

  it("passes a boolean completed through", () => {
    expect(validateTaskPatch({ completed: true })).toEqual({
      ok: true,
      value: { completed: true },
    });
    expect(validateTaskPatch({ completed: false })).toEqual({
      ok: true,
      value: { completed: false },
    });
  });

  it("leaves untouched fields out of the result", () => {
    const result = validateTaskPatch({ completed: true });
    expect(result.ok && Object.keys(result.value)).toEqual(["completed"]);
  });

  it("does not inject priority or due date defaults into a patch", () => {
    const result = validateTaskPatch({ title: "Keep" });
    expect(result.ok && Object.keys(result.value)).toEqual(["title"]);
  });

  it("normalizes a provided priority and due date", () => {
    expect(validateTaskPatch({ priority: "high", dueDate: "2026-05-01" })).toEqual({
      ok: true,
      value: { priority: "high", dueDate: "2026-05-01" },
    });
  });

  it("clears a due date with an empty string", () => {
    expect(validateTaskPatch({ dueDate: "" })).toEqual({
      ok: true,
      value: { dueDate: null },
    });
  });

  it("rejects an unknown priority and a malformed due date in a patch", () => {
    expect(validateTaskPatch({ priority: "urgent" as never }).ok).toBe(false);
    expect(validateTaskPatch({ dueDate: "2026-13-01" }).ok).toBe(false);
  });

  it("validates order in a patch", () => {
    expect(validateTaskPatch({ order: 5 })).toEqual({
      ok: true,
      value: { order: 5 },
    });
    expect(validateTaskPatch({ order: "5" as never }).ok).toBe(false);
    expect(validateTaskPatch({ order: Number.NaN }).ok).toBe(false);
  });

  it("validates category in a patch", () => {
    expect(validateTaskPatch({ category: "work" })).toEqual({
      ok: true,
      value: { category: "work" },
    });
    expect(validateTaskPatch({ category: null })).toEqual({
      ok: true,
      value: { category: null },
    });
    expect(validateTaskPatch({ category: "invalid" as never }).ok).toBe(false);
  });
});

describe("validateNoteInput", () => {
  it("accepts a valid note and trims the title and body", () => {
    const result = validateNoteInput({ title: "  Meeting  ", body: " Agenda " });
    expect(result).toEqual({ ok: true, value: { title: "Meeting", body: "Agenda" } });
  });

  it("defaults a missing body to an empty string", () => {
    const result = validateNoteInput({ title: "Meeting" });
    expect(result).toEqual({ ok: true, value: { title: "Meeting", body: "" } });
  });

  it("rejects an empty title with a required error", () => {
    expect(validateNoteInput({ title: "" })).toEqual({
      ok: false,
      error: "Title is required.",
    });
  });

  it("rejects a whitespace-only title", () => {
    const result = validateNoteInput({ title: "   " });
    expect(result.ok).toBe(false);
  });

  it("accepts a title exactly at the limit", () => {
    const result = validateNoteInput({ title: "a".repeat(NOTE_TITLE_MAX_LENGTH) });
    expect(result.ok).toBe(true);
  });

  it("rejects a title over the limit", () => {
    const result = validateNoteInput({ title: "a".repeat(NOTE_TITLE_MAX_LENGTH + 1) });
    expect(result.ok).toBe(false);
  });

  it("accepts a body exactly at the limit", () => {
    const result = validateNoteInput({
      title: "Note",
      body: "a".repeat(NOTE_BODY_MAX_LENGTH),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a body over the limit", () => {
    const result = validateNoteInput({
      title: "Note",
      body: "a".repeat(NOTE_BODY_MAX_LENGTH + 1),
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateNotePatch", () => {
  it("returns an empty patch for an empty input", () => {
    expect(validateNotePatch({})).toEqual({ ok: true, value: {} });
  });

  it("normalizes a provided title and body", () => {
    expect(validateNotePatch({ title: " New ", body: " Body " })).toEqual({
      ok: true,
      value: { title: "New", body: "Body" },
    });
  });

  it("rejects an empty title in a patch", () => {
    expect(validateNotePatch({ title: "  " }).ok).toBe(false);
  });

  it("accepts a body-only patch", () => {
    expect(validateNotePatch({ body: "Only body" })).toEqual({
      ok: true,
      value: { body: "Only body" },
    });
  });
});
