import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDb } from "@/lib/db";
import {
  TaskNotFoundError,
  TaskValidationError,
  createTask,
  deleteTask,
  getTask,
  isOverdue,
  listTasks,
  todayIsoDate,
  updateTask,
} from "@/lib/tasks";
import type { Task } from "@/types/task";

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

describe("createTask", () => {
  it("generates an id, defaults, and matching timestamps", async () => {
    const task = await createTask({ title: "Write the spec" });

    expect(task.id).toMatch(UUID_PATTERN);
    expect(task.title).toBe("Write the spec");
    expect(task.description).toBe("");
    expect(task.completed).toBe(false);
    expect(task.priority).toBe("medium");
    expect(task.dueDate).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(task.updatedAt).toBe(task.createdAt);
  });

  it("trims the title and keeps a provided description", async () => {
    const task = await createTask({ title: "  Ship it  ", description: " details " });
    expect(task.title).toBe("Ship it");
    expect(task.description).toBe("details");
  });

  it("generates unique ids across tasks", async () => {
    const first = await createTask({ title: "One" });
    const second = await createTask({ title: "Two" });
    expect(first.id).not.toBe(second.id);
  });

  it("persists the task so it can be read back", async () => {
    const task = await createTask({ title: "Persisted" });
    expect(await getTask(task.id)).toEqual(task);
  });

  it("rejects an empty title with a validation error", async () => {
    await expect(createTask({ title: "   " })).rejects.toBeInstanceOf(TaskValidationError);
    expect(await listTasks()).toEqual([]);
  });
});

describe("getTask", () => {
  it("returns undefined for a missing id", async () => {
    expect(await getTask("nope")).toBeUndefined();
  });
});

describe("listTasks", () => {
  it("returns an empty array when there are no tasks", async () => {
    expect(await listTasks()).toEqual([]);
  });

  it("orders by createdAt descending", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const oldest = await createTask({ title: "Oldest" });
    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
    const middle = await createTask({ title: "Middle" });
    vi.setSystemTime(new Date("2026-01-03T00:00:00.000Z"));
    const newest = await createTask({ title: "Newest" });

    const ids = (await listTasks()).map((task) => task.id);
    expect(ids).toEqual([newest.id, middle.id, oldest.id]);
  });

  it("breaks a createdAt tie by id ascending", async () => {
    const a = await createTask({ title: "A" });
    const b = await createTask({ title: "B" });
    const c = await createTask({ title: "C" });

    const expected = [a, b, c].sort((x, y) => (x.id < y.id ? -1 : 1)).map((t) => t.id);
    expect((await listTasks()).map((task) => task.id)).toEqual(expected);
  });
});

describe("updateTask", () => {
  it("updates the title and advances updatedAt", async () => {
    const task = await createTask({ title: "Before" });
    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));

    const updated = await updateTask(task.id, { title: "After" });

    expect(updated.title).toBe("After");
    expect(updated.createdAt).toBe(task.createdAt);
    expect(updated.updatedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(await getTask(task.id)).toEqual(updated);
  });

  it("updates the description", async () => {
    const task = await createTask({ title: "Task" });
    const updated = await updateTask(task.id, { description: "Notes" });
    expect(updated.description).toBe("Notes");
  });

  it("sets completedAt when completed becomes true", async () => {
    const task = await createTask({ title: "Task" });
    vi.setSystemTime(new Date("2026-01-05T00:00:00.000Z"));

    const done = await updateTask(task.id, { completed: true });

    expect(done.completed).toBe(true);
    expect(done.completedAt).toBe("2026-01-05T00:00:00.000Z");
  });

  it("clears completedAt when completed becomes false again", async () => {
    const task = await createTask({ title: "Task" });
    const done = await updateTask(task.id, { completed: true });

    const reopened = await updateTask(task.id, { completed: false });

    expect(reopened.completed).toBe(false);
    expect(reopened.completedAt).toBeNull();
    expect(done.completedAt).not.toBeNull();
  });

  it("leaves completedAt untouched on a non-completed update", async () => {
    const task = await createTask({ title: "Task" });
    const done = await updateTask(task.id, { completed: true });

    const renamed = await updateTask(task.id, { title: "Renamed" });

    expect(renamed.completedAt).toBe(done.completedAt);
  });

  it("throws TaskNotFoundError for a missing id", async () => {
    await expect(updateTask("missing", { title: "x" })).rejects.toBeInstanceOf(
      TaskNotFoundError,
    );
  });

  it("rejects an invalid patch with a validation error", async () => {
    const task = await createTask({ title: "Task" });
    await expect(updateTask(task.id, { title: "  " })).rejects.toBeInstanceOf(
      TaskValidationError,
    );
    expect((await getTask(task.id))?.title).toBe("Task");
  });
});

describe("deleteTask", () => {
  it("removes the task", async () => {
    const task = await createTask({ title: "Task" });
    await deleteTask(task.id);
    expect(await getTask(task.id)).toBeUndefined();
  });

  it("is idempotent for a missing id", async () => {
    await expect(deleteTask("missing")).resolves.toBeUndefined();
  });
});

describe("createTask priority and due date", () => {
  it("accepts a priority and due date", async () => {
    const task = await createTask({
      title: "Ship it",
      priority: "high",
      dueDate: "2026-03-01",
    });
    expect(task.priority).toBe("high");
    expect(task.dueDate).toBe("2026-03-01");
  });

  it("updates priority and due date through a patch", async () => {
    const task = await createTask({ title: "Task" });
    const updated = await updateTask(task.id, { priority: "low", dueDate: "2026-04-02" });
    expect(updated.priority).toBe("low");
    expect(updated.dueDate).toBe("2026-04-02");

    const cleared = await updateTask(task.id, { dueDate: null });
    expect(cleared.dueDate).toBeNull();
  });
});

describe("todayIsoDate", () => {
  it("formats a date as a zero-padded date-only string", () => {
    expect(todayIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(todayIsoDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("isOverdue", () => {
  function task(overrides: Partial<Task>): Task {
    return {
      id: "1",
      title: "Task",
      description: "",
      completed: false,
      priority: "medium",
      dueDate: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
      ...overrides,
    };
  }

  it("is not overdue with no due date", () => {
    expect(isOverdue(task({ dueDate: null }), "2026-06-01")).toBe(false);
  });

  it("is overdue when the due date is before today", () => {
    expect(isOverdue(task({ dueDate: "2026-05-31" }), "2026-06-01")).toBe(true);
  });

  it("is not overdue when it is due today", () => {
    expect(isOverdue(task({ dueDate: "2026-06-01" }), "2026-06-01")).toBe(false);
  });

  it("is not overdue when the due date is in the future", () => {
    expect(isOverdue(task({ dueDate: "2026-06-02" }), "2026-06-01")).toBe(false);
  });

  it("is not overdue when the task is completed", () => {
    expect(
      isOverdue(task({ dueDate: "2026-05-31", completed: true }), "2026-06-01"),
    ).toBe(false);
  });
});
