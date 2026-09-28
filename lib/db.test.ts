import { afterEach, describe, expect, it } from "vitest";
import { DB_NAME, DB_VERSION, deleteDb, getDb } from "@/lib/db";

afterEach(async () => {
  await deleteDb();
});

describe("test environment", () => {
  it("provides an IndexedDB implementation", () => {
    expect(indexedDB).toBeDefined();
    expect(typeof indexedDB.open).toBe("function");
    expect(IDBKeyRange).toBeDefined();
  });
});

describe("getDb", () => {
  it("opens the database at version 1 with the expected name", async () => {
    const db = await getDb();
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(DB_VERSION);
  });

  it("creates the tasks and notes object stores", async () => {
    const db = await getDb();
    expect(db.objectStoreNames.contains("tasks")).toBe(true);
    expect(db.objectStoreNames.contains("notes")).toBe(true);
  });

  it("creates the updatedAt index on both stores", async () => {
    const db = await getDb();
    const tx = db.transaction(["tasks", "notes"]);
    expect(tx.objectStore("tasks").indexNames.contains("updatedAt")).toBe(true);
    expect(tx.objectStore("notes").indexNames.contains("updatedAt")).toBe(true);
    await tx.done;
  });

  it("round-trips a record through the tasks store", async () => {
    const db = await getDb();
    const task = {
      id: "t1",
      title: "Write the spec",
      description: "",
      completed: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
    };
    await db.put("tasks", task);
    expect(await db.get("tasks", "t1")).toEqual(task);
  });

  it("reuses one open handle across calls", async () => {
    const first = await getDb();
    const second = await getDb();
    expect(second).toBe(first);
  });
});

describe("deleteDb", () => {
  it("removes all data and allows a fresh database", async () => {
    const db = await getDb();
    await db.put("tasks", {
      id: "t2",
      title: "Temporary",
      description: "",
      completed: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      completedAt: null,
    });

    await deleteDb();

    const reopened = await getDb();
    expect(await reopened.count("tasks")).toBe(0);
    expect(await reopened.count("notes")).toBe(0);
  });
});
