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
    expect(result).toEqual({ ok: false, error: "Title is required.", field: "title" });
  });

  it("rejects an empty title", () => {
    const result = validateTaskInput({ title: "" });
    expect(result).toEqual({ ok: false, error: "Title is required.", field: "title" });
  });

  it("accepts a title exactly at the limit", () => {
    const result = validateTaskInput({ title: "a".repeat(TITLE_MAX_LENGTH) });
    expect(result.ok).toBe(true);
  });

  it("rejects a title over the limit", () => {
    const result = validateTaskInput({ title: "a".repeat(TITLE_MAX_LENGTH + 1) });
    expect(result).toEqual({
      ok: false,
      error: `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`,
      field: "title",
    });
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
    expect(result).toEqual({
      ok: false,
      error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,
      field: "description",
    });
  });

  it("accepts rich HTML markup in task description up to the limit", () => {
    const htmlDescription = "<p>Task details with <b>bold text</b> and <i>formatting</i></p>";
    const result = validateTaskInput({
      title: "Task with HTML",
      description: htmlDescription,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toBe(htmlDescription);
    }
  });

  it("sanitizes dangerous HTML markup in task description", () => {
    const dangerousHtml = '<p>Safe</p><script>alert("xss")</script><img src="x" onerror="alert(1)">';
    const result = validateTaskInput({
      title: "Task with dangerous HTML",
      description: dangerousHtml,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toBe("<p>Safe</p>");
    }
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
    const result = validateTaskInput({ title: "Task", priority: "urgent" as never });
    expect(result).toEqual({
      ok: false,
      error: "Priority must be low, medium, or high.",
      field: "priority",
    });
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
      const result = validateTaskInput({ title: "Task", dueDate });
      expect(result).toEqual({
        ok: false,
        error: "Due date must be a valid date.",
        field: "dueDate",
      });
    }
  });

  it("rejects an invalid category", () => {
    const result = validateTaskInput({ title: "Task", category: "invalid" as never });
    expect(result).toEqual({
      ok: false,
      error: "Category must be work, personal, urgent, study, ideas, or null.",
      field: "category",
    });
  });

  it("rejects an invalid order", () => {
    const result = validateTaskInput({ title: "Task", order: "invalid" as never });
    expect(result).toEqual({
      ok: false,
      error: "Order must be a valid number.",
      field: "order",
    });
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

  it("sanitizes dangerous HTML markup in task patch description", () => {
    const result = validateTaskPatch({
      description: '<b>Important</b><iframe src="https://evil.com"></iframe>',
    });
    expect(result).toEqual({
      ok: true,
      value: { description: "<b>Important</b>" },
    });
  });

  it("rejects an empty title in a patch", () => {
    const result = validateTaskPatch({ title: "  " });
    expect(result).toEqual({
      ok: false,
      error: "Title is required.",
      field: "title",
    });
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
    expect(validateTaskPatch({ priority: "urgent" as never })).toEqual({
      ok: false,
      error: "Priority must be low, medium, or high.",
      field: "priority",
    });
    expect(validateTaskPatch({ dueDate: "2026-13-01" })).toEqual({
      ok: false,
      error: "Due date must be a valid date.",
      field: "dueDate",
    });
  });

  it("validates order in a patch", () => {
    expect(validateTaskPatch({ order: 5 })).toEqual({
      ok: true,
      value: { order: 5 },
    });
    expect(validateTaskPatch({ order: "5" as never })).toEqual({
      ok: false,
      error: "Order must be a valid number.",
      field: "order",
    });
    expect(validateTaskPatch({ order: Number.NaN })).toEqual({
      ok: false,
      error: "Order must be a valid number.",
      field: "order",
    });
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
    expect(validateTaskPatch({ category: "invalid" as never })).toEqual({
      ok: false,
      error: "Category must be work, personal, urgent, study, ideas, or null.",
      field: "category",
    });
  });

  it("validates completed in a patch", () => {
    expect(validateTaskPatch({ completed: "true" as never })).toEqual({
      ok: false,
      error: "Completed must be a boolean.",
      field: "completed",
    });
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
      field: "title",
    });
  });

  it("rejects a whitespace-only title", () => {
    const result = validateNoteInput({ title: "   " });
    expect(result).toEqual({
      ok: false,
      error: "Title is required.",
      field: "title",
    });
  });

  it("accepts a title exactly at the limit", () => {
    const result = validateNoteInput({ title: "a".repeat(NOTE_TITLE_MAX_LENGTH) });
    expect(result.ok).toBe(true);
  });

  it("rejects a title over the limit", () => {
    const result = validateNoteInput({ title: "a".repeat(NOTE_TITLE_MAX_LENGTH + 1) });
    expect(result).toEqual({
      ok: false,
      error: `Title must be ${NOTE_TITLE_MAX_LENGTH} characters or fewer.`,
      field: "title",
    });
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
    expect(result).toEqual({
      ok: false,
      error: `Body must be ${NOTE_BODY_MAX_LENGTH} characters or fewer.`,
      field: "body",
    });
  });

  it("sanitizes dangerous HTML markup in note body", () => {
    const result = validateNoteInput({
      title: "Note",
      body: '<p>Note text</p><script>alert(1)</script><a href="javascript:alert(2)">Link</a>',
    });
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Note",
        body: "<p>Note text</p><a>Link</a>",
      },
    });
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
    expect(validateNotePatch({ title: "  " })).toEqual({
      ok: false,
      error: "Title is required.",
      field: "title",
    });
  });

  it("rejects a body over the limit in a patch", () => {
    expect(validateNotePatch({ body: "a".repeat(NOTE_BODY_MAX_LENGTH + 1) })).toEqual({
      ok: false,
      error: `Body must be ${NOTE_BODY_MAX_LENGTH} characters or fewer.`,
      field: "body",
    });
  });

  it("sanitizes dangerous HTML markup in note patch body", () => {
    expect(validateNotePatch({ body: "<b>Note</b><script>alert(1)</script>" })).toEqual({
      ok: true,
      value: { body: "<b>Note</b>" },
    });
  });

  it("accepts a body-only patch", () => {
    expect(validateNotePatch({ body: "Only body" })).toEqual({
      ok: true,
      value: { body: "Only body" },
    });
  });
});
