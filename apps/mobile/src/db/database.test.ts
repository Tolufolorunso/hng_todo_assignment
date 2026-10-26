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

  it("applies migrations cleanly and sets schema version to 3", async () => {
    const result = await runMigrations(db);
    expect(result.applied).toEqual([1, 2, 3]);
    expect(result.total).toBe(migrations.length);

    const version = await getMigrationVersion(db);
    expect(version).toBe(3);

    // Verify tasks, notes, followups, daily_plans exist
    await db.execute(
      "INSERT INTO tasks (id, title, priority, estimated_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      ["t1", "Test Task", "high", 45, "2026-10-25T00:00:00.000Z", "2026-10-25T00:00:00.000Z"]
    );
    const task = await db.queryFirst<{ id: string; title: string; estimated_minutes: number }>(
      "SELECT id, title, estimated_minutes FROM tasks WHERE id = ?",
      ["t1"]
    );
    expect(task).toEqual({ id: "t1", title: "Test Task", estimated_minutes: 45 });

    await db.execute(
      "INSERT INTO followups (id, person_name, commitment, due_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["fu1", "Alice", "Review contract", "2026-10-28T14:00:00.000Z", "open", "2026-10-25T00:00:00.000Z", "2026-10-25T00:00:00.000Z"]
    );
    const followup = await db.queryFirst<{ id: string; person_name: string; commitment: string }>(
      "SELECT id, person_name, commitment FROM followups WHERE id = ?",
      ["fu1"]
    );
    expect(followup).toEqual({ id: "fu1", person_name: "Alice", commitment: "Review contract" });
  });

  it("is idempotent when re-running migrations", async () => {
    const firstRun = await runMigrations(db);
    expect(firstRun.applied).toEqual([1, 2, 3]);

    const secondRun = await runMigrations(db);
    expect(secondRun.applied).toEqual([]);

    const version = await getMigrationVersion(db);
    expect(version).toBe(3);
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
    expect(version).toBe(3);
  });
});
