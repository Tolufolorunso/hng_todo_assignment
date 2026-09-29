import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDb } from "@/lib/db";
import {
  NoteNotFoundError,
  NoteValidationError,
  createNote,
  deleteNote,
  filterNotes,
  getNote,
  listNotes,
  updateNote,
} from "@/lib/notes";
import type { Note } from "@/types/note";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeEach(async () => {
  await deleteDb();
  // Only Date is faked so fake-indexeddb's async scheduling keeps working.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(async () => {
  vi.useRealTimers();
  await deleteDb();
});

describe("createNote", () => {
  it("generates an id, defaults, and matching timestamps", async () => {
    const note = await createNote({ title: "Meeting notes" });

    expect(note.id).toMatch(UUID_PATTERN);
    expect(note.title).toBe("Meeting notes");
    expect(note.body).toBe("");
    expect(note.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(note.updatedAt).toBe(note.createdAt);
  });

  it("trims the title and body", async () => {
    const note = await createNote({ title: "  Agenda  ", body: " Points " });
    expect(note.title).toBe("Agenda");
    expect(note.body).toBe("Points");
  });

  it("generates unique ids across notes", async () => {
    const first = await createNote({ title: "One" });
    const second = await createNote({ title: "Two" });
    expect(first.id).not.toBe(second.id);
  });

  it("persists the note so it can be read back", async () => {
    const note = await createNote({ title: "Persisted", body: "Body" });
    expect(await getNote(note.id)).toEqual(note);
  });

  it("rejects an empty title with a validation error", async () => {
    await expect(createNote({ title: "   " })).rejects.toBeInstanceOf(
      NoteValidationError,
    );
    expect(await listNotes()).toEqual([]);
  });
});

describe("getNote", () => {
  it("returns undefined for a missing id", async () => {
    expect(await getNote("nope")).toBeUndefined();
  });
});

describe("listNotes", () => {
  it("returns an empty array when there are no notes", async () => {
    expect(await listNotes()).toEqual([]);
  });

  it("orders by updatedAt descending", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const oldest = await createNote({ title: "Oldest" });
    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
    const middle = await createNote({ title: "Middle" });
    vi.setSystemTime(new Date("2026-01-03T00:00:00.000Z"));
    const newest = await createNote({ title: "Newest" });

    const ids = (await listNotes()).map((note) => note.id);
    expect(ids).toEqual([newest.id, middle.id, oldest.id]);
  });

  it("breaks an updatedAt tie by id ascending", async () => {
    const a = await createNote({ title: "A" });
    const b = await createNote({ title: "B" });
    const c = await createNote({ title: "C" });

    const expected = [a, b, c]
      .sort((x, y) => (x.id < y.id ? -1 : 1))
      .map((note) => note.id);
    expect((await listNotes()).map((note) => note.id)).toEqual(expected);
  });
});

describe("updateNote", () => {
  it("updates fields and advances updatedAt", async () => {
    const note = await createNote({ title: "Before", body: "Old" });
    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));

    const updated = await updateNote(note.id, { title: "After", body: "New" });

    expect(updated.title).toBe("After");
    expect(updated.body).toBe("New");
    expect(updated.createdAt).toBe(note.createdAt);
    expect(updated.updatedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(await getNote(note.id)).toEqual(updated);
  });

  it("throws NoteNotFoundError for a missing id", async () => {
    await expect(updateNote("missing", { title: "x" })).rejects.toBeInstanceOf(
      NoteNotFoundError,
    );
  });

  it("rejects an invalid patch without writing", async () => {
    const note = await createNote({ title: "Keep" });
    await expect(updateNote(note.id, { title: "  " })).rejects.toBeInstanceOf(
      NoteValidationError,
    );
    expect((await getNote(note.id))?.title).toBe("Keep");
  });
});

describe("deleteNote", () => {
  it("removes the note", async () => {
    const note = await createNote({ title: "Task" });
    await deleteNote(note.id);
    expect(await getNote(note.id)).toBeUndefined();
  });

  it("is idempotent for a missing id", async () => {
    await expect(deleteNote("missing")).resolves.toBeUndefined();
  });
});

describe("filterNotes", () => {
  function note(id: string, title: string, body: string): Note {
    return {
      id,
      title,
      body,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
  }

  const notes = [
    note("1", "Shopping list", "Milk and eggs"),
    note("2", "Meeting", "Discuss the roadmap"),
    note("3", "Ideas", "A MILK crate redesign"),
  ];

  it("returns the input unchanged for a blank query", () => {
    expect(filterNotes(notes, "   ")).toBe(notes);
  });

  it("matches titles case-insensitively", () => {
    expect(filterNotes(notes, "meeting").map((n) => n.id)).toEqual(["2"]);
  });

  it("matches bodies case-insensitively", () => {
    expect(filterNotes(notes, "roadmap").map((n) => n.id)).toEqual(["2"]);
  });

  it("matches a term present in both title and body of different notes", () => {
    expect(filterNotes(notes, "milk").map((n) => n.id)).toEqual(["1", "3"]);
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(filterNotes(notes, "  ideas  ").map((n) => n.id)).toEqual(["3"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterNotes(notes, "budget")).toEqual([]);
  });
});
