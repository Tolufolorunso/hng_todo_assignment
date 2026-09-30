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
  it("opens the database at the current version", async () => {
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

  it("creates the dueDate, updatedAt, and category indexes on tasks", async () => {
    const db = await getDb();
    const tx = db.transaction("tasks");
    expect(tx.objectStore("tasks").indexNames.contains("dueDate")).toBe(true);
    expect(tx.objectStore("tasks").indexNames.contains("updatedAt")).toBe(true);
    expect(tx.objectStore("tasks").indexNames.contains("category")).toBe(true);
    expect((tx.objectStore("tasks").indexNames as unknown as DOMStringList).contains("completed")).toBe(false);
    await tx.done;
  });

  it("round-trips a record through the tasks store", async () => {
    const db = await getDb();
    const task = {
      id: "t1",
      title: "Write the spec",
      description: "",
      completed: false,
      priority: "medium" as const,
      dueDate: null,
      category: "work" as const,
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
      priority: "medium" as const,
      dueDate: null,
      category: null,
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

describe("version upgrades", () => {
  it("upgrades version 1 databases, backfilling priority, dueDate, category, and indexes", async () => {
    // Create a v1 database with the old schema and a task lacking the new fields.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        const tasks = database.createObjectStore("tasks", { keyPath: "id" });
        tasks.createIndex("updatedAt", "updatedAt");
        const notes = database.createObjectStore("notes", { keyPath: "id" });
        notes.createIndex("updatedAt", "updatedAt");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const tx = database.transaction("tasks", "readwrite");
        tx.objectStore("tasks").put({
          id: "legacy-v1",
          title: "Legacy v1 task",
          description: "",
          completed: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
        });
        tx.oncomplete = () => {
          database.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });

    const db = await getDb();
    expect(db.version).toBe(4);

    const migrated = await db.get("tasks", "legacy-v1");
    expect(migrated?.priority).toBe("medium");
    expect(migrated?.dueDate).toBeNull();
    expect(migrated?.category).toBeNull();

    const tx = db.transaction("tasks");
    expect((tx.objectStore("tasks").indexNames as unknown as DOMStringList).contains("completed")).toBe(false);
    expect(tx.objectStore("tasks").indexNames.contains("dueDate")).toBe(true);
    expect(tx.objectStore("tasks").indexNames.contains("category")).toBe(true);
    await tx.done;
  });

  it("upgrades version 2 databases, backfilling category, adding category index, and removing completed index", async () => {
    // Create a v2 database
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        const database = request.result;
        const tasks = database.createObjectStore("tasks", { keyPath: "id" });
        tasks.createIndex("updatedAt", "updatedAt");
        tasks.createIndex("completed", "completed");
        tasks.createIndex("dueDate", "dueDate");
        const notes = database.createObjectStore("notes", { keyPath: "id" });
        notes.createIndex("updatedAt", "updatedAt");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const tx = database.transaction("tasks", "readwrite");
        tx.objectStore("tasks").put({
          id: "legacy-v2",
          title: "Legacy v2 task",
          description: "",
          completed: false,
          priority: "high",
          dueDate: "2026-06-01",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          completedAt: null,
        });
        tx.oncomplete = () => {
          database.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });

    const db = await getDb();
    expect(db.version).toBe(4);

    const migrated = await db.get("tasks", "legacy-v2");
    expect(migrated?.priority).toBe("high");
    expect(migrated?.dueDate).toBe("2026-06-01");
    expect(migrated?.category).toBeNull();

    const tx = db.transaction("tasks");
    expect((tx.objectStore("tasks").indexNames as unknown as DOMStringList).contains("completed")).toBe(false);
    expect(tx.objectStore("tasks").indexNames.contains("category")).toBe(true);
    await tx.done;
  });

  it("upgrades version 3 databases, removing the completed index", async () => {
    // Create a v3 database
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 3);
      request.onupgradeneeded = () => {
        const database = request.result;
        const tasks = database.createObjectStore("tasks", { keyPath: "id" });
        tasks.createIndex("updatedAt", "updatedAt");
        tasks.createIndex("completed", "completed");
        tasks.createIndex("dueDate", "dueDate");
        tasks.createIndex("category", "category");
        const notes = database.createObjectStore("notes", { keyPath: "id" });
        notes.createIndex("updatedAt", "updatedAt");
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        database.close();
        resolve();
      };
    });

    const db = await getDb();
    expect(db.version).toBe(4);

    const tx = db.transaction("tasks");
    expect((tx.objectStore("tasks").indexNames as unknown as DOMStringList).contains("completed")).toBe(false);
    expect(tx.objectStore("tasks").indexNames.contains("dueDate")).toBe(true);
    expect(tx.objectStore("tasks").indexNames.contains("category")).toBe(true);
    await tx.done;
  });
});
