import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySqliteDatabase, createDatabase } from "./driver.js";
import { runMigrations, getMigrationVersion, migrations } from "./migrations.js";

describe("Mobile SQLite Database and Migration Runner", () => {
  let db: InMemorySqliteDatabase;

  beforeEach(() => {
    db = new InMemorySqliteDatabase();
  });

  it("initializes empty database", async () => {
    const version = await getMigrationVersion(db);
    expect(version).toBe(0);
  });

  it("applies migrations cleanly and sets schema version to 1", async () => {
    const result = await runMigrations(db);
    expect(result.applied).toEqual([1]);
    expect(result.total).toBe(migrations.length);

    const version = await getMigrationVersion(db);
    expect(version).toBe(1);

    // Verify tasks and notes tables exist by inserting test rows
    await db.execute(
      "INSERT INTO tasks (id, title, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ["t1", "Test Task", "high", "2026-10-25T00:00:00.000Z", "2026-10-25T00:00:00.000Z"]
    );
    const task = await db.queryFirst<{ id: string; title: string }>(
      "SELECT id, title FROM tasks WHERE id = ?",
      ["t1"]
    );
    expect(task).toEqual({ id: "t1", title: "Test Task" });

    await db.execute(
      "INSERT INTO notes (id, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ["n1", "Test Note", "Sample body", "2026-10-25T00:00:00.000Z", "2026-10-25T00:00:00.000Z"]
    );
    const note = await db.queryFirst<{ id: string; title: string; body: string }>(
      "SELECT id, title, body FROM notes WHERE id = ?",
      ["n1"]
    );
    expect(note).toEqual({ id: "n1", title: "Test Note", body: "Sample body" });
  });

  it("is idempotent when re-running migrations", async () => {
    const firstRun = await runMigrations(db);
    expect(firstRun.applied).toEqual([1]);

    const secondRun = await runMigrations(db);
    expect(secondRun.applied).toEqual([]);

    const version = await getMigrationVersion(db);
    expect(version).toBe(1);
  });

  it("rolls back transactions on error", async () => {
    await runMigrations(db);

    await expect(
      db.transaction(async (tx) => {
        await tx.execute(
          "INSERT INTO tasks (id, title, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          ["t_tx", "Temporary Task", "medium", "2026-10-25T00:00:00.000Z", "2026-10-25T00:00:00.000Z"]
        );
        throw new Error("Simulated failure inside transaction");
      })
    ).rejects.toThrow("Simulated failure inside transaction");

    const task = await db.queryFirst("SELECT id FROM tasks WHERE id = ?", ["t_tx"]);
    expect(task).toBeNull();
  });

  it("supports factory helper createDatabase", async () => {
    const instance = createDatabase("memory");
    expect(instance).toBeDefined();
    await runMigrations(instance);
    const version = await getMigrationVersion(instance);
    expect(version).toBe(1);
  });
});
