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
    expect(result).toEqual({ ok: true, value: { title: "Buy milk", description: "2 litres" } });
  });

  it("defaults a missing description to an empty string", () => {
    const result = validateTaskInput({ title: "Buy milk" });
    expect(result).toEqual({ ok: true, value: { title: "Buy milk", description: "" } });
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
