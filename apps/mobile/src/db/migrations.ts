import type { SqliteDatabase } from "./driver";

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
  {
    version: 2,
    name: "002_differentiated_features",
    up: async (db: SqliteDatabase) => {
      // 1. followups table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS followups (
          id TEXT PRIMARY KEY,
          person_name TEXT NOT NULL,
          commitment TEXT NOT NULL,
          details TEXT,
          due_at TEXT NOT NULL,
          time_zone TEXT NOT NULL DEFAULT 'UTC',
          email_address TEXT,
          phone_number TEXT,
          whatsapp_number TEXT,
          preferred_action TEXT,
          recurrence TEXT,
          status TEXT NOT NULL DEFAULT 'open',
          source_note_id TEXT,
          source_excerpt TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      await db.execute("CREATE INDEX IF NOT EXISTS idx_followups_due_at ON followups(due_at)");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status)");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_followups_source_note ON followups(source_note_id)");

      // 2. followup_occurrences table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS followup_occurrences (
          id TEXT PRIMARY KEY,
          followup_id TEXT NOT NULL,
          scheduled_due_at TEXT NOT NULL,
          outcome TEXT NOT NULL DEFAULT 'unresolved',
          resolved_at TEXT,
          next_due_at TEXT
        )
      `);
      await db.execute("CREATE INDEX IF NOT EXISTS idx_occurrences_followup ON followup_occurrences(followup_id)");

      // 3. daily_plans table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS daily_plans (
          id TEXT PRIMARY KEY,
          local_date TEXT NOT NULL,
          time_zone TEXT NOT NULL,
          available_minutes INTEGER NOT NULL DEFAULT 480,
          items TEXT NOT NULL DEFAULT '[]',
          accepted_at TEXT,
          updated_at TEXT NOT NULL
        )
      `);
      await db.execute("CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(local_date)");

      // 4. inbox_captures table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS inbox_captures (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL,
          shared_url TEXT,
          source_app_label TEXT,
          captured_at TEXT NOT NULL,
          state TEXT NOT NULL DEFAULT 'pending',
          result_entity_type TEXT,
          result_entity_id TEXT,
          processed_at TEXT
        )
      `);
      await db.execute("CREATE INDEX IF NOT EXISTS idx_inbox_state ON inbox_captures(state)");

      // 5. task_order table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS task_order (
          id TEXT PRIMARY KEY,
          ordered_ids TEXT NOT NULL DEFAULT '[]'
        )
      `);

      // 6. preferences table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS preferences (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      // 7. Alter tasks to add differentiated columns
      await db.execute("ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER");
      await db.execute("ALTER TABLE tasks ADD COLUMN source_note_id TEXT");
      await db.execute("ALTER TABLE tasks ADD COLUMN source_excerpt TEXT");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_tasks_source_note ON tasks(source_note_id)");
    },
  },
  {
    version: 3,
    name: "003_sync_engine",
    up: async (db: SqliteDatabase) => {
      // 1. outbox table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS outbox (
          id TEXT PRIMARY KEY,
          mutation_id TEXT NOT NULL,
          protocol_version INTEGER NOT NULL DEFAULT 1,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          base_revision INTEGER,
          payload TEXT,
          created_at TEXT NOT NULL
        )
      `);
      await db.execute("CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox(created_at)");

      // 2. sync_cursors table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS sync_cursors (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          cursor INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        )
      `);

      // 3. conflicts table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS conflicts (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          local_value TEXT,
          server_value TEXT,
          server_revision INTEGER NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
      await db.execute("CREATE INDEX IF NOT EXISTS idx_conflicts_workspace ON conflicts(workspace_id)");

      // 4. tombstones table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS tombstones (
          id TEXT PRIMARY KEY,
          workspace_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          deleted_at TEXT NOT NULL
        )
      `);
      await db.execute("CREATE INDEX IF NOT EXISTS idx_tombstones_entity ON tombstones(entity_type, entity_id)");

      // 5. server_revisions table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS server_revisions (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          server_revision INTEGER NOT NULL
        )
      `);
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
