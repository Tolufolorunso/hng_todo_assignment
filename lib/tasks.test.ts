import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDb } from "@/lib/db";
import {
  TaskNotFoundError,
  TaskValidationError,
  createTask,
  deleteTask,
  filterTasksByStatus,
  getTask,
  isOverdue,
  listTasks,
  reorderTasks,
  searchTasks,
  sortTasks,
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

describe("reorderTasks", () => {
  it("persists custom order indices across tasks", async () => {
    const task1 = await createTask({ title: "Task 1" });
    const task2 = await createTask({ title: "Task 2" });
    const task3 = await createTask({ title: "Task 3" });

    await reorderTasks([task3.id, task1.id, task2.id]);

    const updated1 = await getTask(task1.id);
    const updated2 = await getTask(task2.id);
    const updated3 = await getTask(task3.id);

    expect(updated3?.order).toBe(0);
    expect(updated1?.order).toBe(1);
    expect(updated2?.order).toBe(2);
  });

  it("gracefully ignores non-existent ids", async () => {
    const task1 = await createTask({ title: "Task 1" });
    await expect(reorderTasks(["non-existent", task1.id])).resolves.toBeUndefined();
    const updated1 = await getTask(task1.id);
    expect(updated1?.order).toBe(1);
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

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: `Task ${overrides.id}`,
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

describe("searchTasks", () => {
  const tasks = [
    makeTask({ id: "1", title: "Buy milk", description: "and eggs" }),
    makeTask({ id: "2", title: "Write report", description: "about Milk prices" }),
    makeTask({ id: "3", title: "Call plumber" }),
  ];

  it("returns the input for a blank query", () => {
    expect(searchTasks(tasks, "   ")).toBe(tasks);
  });

  it("matches titles case-insensitively", () => {
    expect(searchTasks(tasks, "REPORT").map((t) => t.id)).toEqual(["2"]);
  });

  it("matches descriptions case-insensitively", () => {
    expect(searchTasks(tasks, "eggs").map((t) => t.id)).toEqual(["1"]);
  });

  it("trims the query and matches across title and description", () => {
    expect(searchTasks(tasks, "  milk  ").map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchTasks(tasks, "zzz")).toEqual([]);
  });
});

describe("filterTasksByStatus", () => {
  const tasks = [
    makeTask({ id: "1", completed: false }),
    makeTask({ id: "2", completed: true }),
    makeTask({ id: "3", completed: false }),
  ];

  it("returns the input for all", () => {
    expect(filterTasksByStatus(tasks, "all")).toBe(tasks);
  });

  it("keeps incomplete tasks for active", () => {
    expect(filterTasksByStatus(tasks, "active").map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("keeps completed tasks for completed", () => {
    expect(filterTasksByStatus(tasks, "completed").map((t) => t.id)).toEqual(["2"]);
  });
});

describe("sortTasks", () => {
  it("sorts by order ascending in manual mode", () => {
    const tasks = [
      makeTask({ id: "3", order: 2 }),
      makeTask({ id: "1", order: 0 }),
      makeTask({ id: "2", order: 1 }),
    ];
    expect(sortTasks(tasks, "manual").map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("falls back to created descending when manual orders are equal or undefined", () => {
    const tasks = [
      makeTask({ id: "b", order: 0, createdAt: "2026-01-01T00:00:00.000Z" }),
      makeTask({ id: "c", order: 0, createdAt: "2026-01-02T00:00:00.000Z" }),
      makeTask({ id: "a", createdAt: "2026-01-03T00:00:00.000Z" }),
    ];
    // a has order undefined -> defaults to 0. c has order 0, b has order 0.
    // Sorted by created desc: a (01-03), c (01-02), b (01-01).
    expect(sortTasks(tasks, "manual").map((t) => t.id)).toEqual(["a", "c", "b"]);
  });

  it("sorts by created descending with id tie-break", () => {
    const tasks = [
      makeTask({ id: "b", createdAt: "2026-01-02T00:00:00.000Z" }),
      makeTask({ id: "a", createdAt: "2026-01-02T00:00:00.000Z" }),
      makeTask({ id: "c", createdAt: "2026-01-03T00:00:00.000Z" }),
    ];
    expect(sortTasks(tasks, "created").map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by priority high, then medium, then low", () => {
    const tasks = [
      makeTask({ id: "low", priority: "low" }),
      makeTask({ id: "high", priority: "high" }),
      makeTask({ id: "medium", priority: "medium" }),
    ];
    expect(sortTasks(tasks, "priority").map((t) => t.id)).toEqual([
      "high",
      "medium",
      "low",
    ]);
  });

  it("sorts by due date ascending with null dates last", () => {
    const tasks = [
      makeTask({ id: "none", dueDate: null }),
      makeTask({ id: "late", dueDate: "2026-06-01" }),
      makeTask({ id: "soon", dueDate: "2026-05-01" }),
    ];
    expect(sortTasks(tasks, "dueDate").map((t) => t.id)).toEqual([
      "soon",
      "late",
      "none",
    ]);
  });

  it("breaks equal sort keys by created descending then id ascending", () => {
    const tasks = [
      makeTask({ id: "b", dueDate: "2026-05-01", createdAt: "2026-01-01T00:00:00.000Z" }),
      makeTask({ id: "a", dueDate: "2026-05-01", createdAt: "2026-01-01T00:00:00.000Z" }),
      makeTask({ id: "c", dueDate: "2026-05-01", createdAt: "2026-01-02T00:00:00.000Z" }),
    ];
    expect(sortTasks(tasks, "dueDate").map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the input array", () => {
    const tasks = [
      makeTask({ id: "1", priority: "low" }),
      makeTask({ id: "2", priority: "high" }),
    ];
    const before = tasks.map((t) => t.id);
    sortTasks(tasks, "priority");
    expect(tasks.map((t) => t.id)).toEqual(before);
  });
});
