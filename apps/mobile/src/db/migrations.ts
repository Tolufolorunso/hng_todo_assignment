import type { SqliteDatabase } from "./driver.js";

export interface Migration {
  version: number;
  name: string;
  up: (db: SqliteDatabase) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: "001_initial_schema",
    up: async (db: SqliteDatabase) => {
      // 1. schema_migrations
      await db.execute(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        )
      `);

      // 2. tasks table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          completed INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT,
          priority TEXT NOT NULL DEFAULT 'medium',
          due_date TEXT,
          category TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      await db.execute("CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category)");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at)");

      // 3. notes table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          body TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      await db.execute("CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at)");
    },
  },
];

export async function runMigrations(db: SqliteDatabase): Promise<{ applied: number[]; total: number }> {
  // Ensure schema_migrations exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const appliedRows = await db.query<{ version: number }>(
    "SELECT version FROM schema_migrations ORDER BY version ASC"
  );
  const appliedSet = new Set(appliedRows.map((r) => r.version));
  const freshlyApplied: number[] = [];

  for (const migration of migrations) {
    if (!appliedSet.has(migration.version)) {
      await db.transaction(async (tx) => {
        await migration.up(tx);
        await tx.execute(
          "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
          [migration.version, migration.name, new Date().toISOString()]
        );
      });
      freshlyApplied.push(migration.version);
    }
  }

  return {
    applied: freshlyApplied,
    total: migrations.length,
  };
}

export async function getMigrationVersion(db: SqliteDatabase): Promise<number> {
  const row = await db.queryFirst<{ max_version: number | null }>(
    "SELECT MAX(version) AS max_version FROM schema_migrations"
  );
  return row?.max_version ?? 0;
}
