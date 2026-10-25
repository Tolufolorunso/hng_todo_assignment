import fs from "node:fs";
import path from "node:path";
import { type Pool, type PoolClient } from "pg";
import { getDatabasePool, isDatabaseConfigured, closeDatabasePool } from "./client";

export interface MigrationFile {
  version: number;
  name: string;
  filename: string;
  sql: string;
}

export interface MigrationResult {
  success: boolean;
  applied: string[];
  alreadyApplied: string[];
  error?: string;
}

export function loadMigrationFiles(migrationsDirectory?: string): MigrationFile[] {
  const dir = migrationsDirectory ?? path.join(__dirname, "migrations");
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  return files.map((filename) => {
    const match = filename.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      throw new Error(`Invalid migration filename format: ${filename}. Expected format: 001_name.sql`);
    }

    const version = parseInt(match[1], 10);
    const name = match[2];
    const sql = fs.readFileSync(path.join(dir, filename), "utf8");

    return { version, name, filename, sql };
  });
}

export async function runMigrations(
  poolOverride?: Pool,
  migrationsDirectory?: string
): Promise<MigrationResult> {
  const pool = poolOverride ?? getDatabasePool();
  if (!pool) {
    return {
      success: false,
      applied: [],
      alreadyApplied: [],
      error: "DATABASE_UNAVAILABLE: Cannot run migrations because DATABASE_URL is not configured",
    };
  }

  const client: PoolClient = await pool.connect();
  const applied: string[] = [];
  const alreadyApplied: string[] = [];

  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied versions
    const res = await client.query<{ version: number }>(
      "SELECT version FROM schema_migrations ORDER BY version ASC"
    );
    const appliedVersions = new Set(res.rows.map((r) => r.version));

    // 3. Load migration files
    const migrations = loadMigrationFiles(migrationsDirectory);

    // 4. Apply unapplied migrations sequentially in transactions
    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        alreadyApplied.push(migration.filename);
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, NOW())",
          [migration.version, migration.name]
        );
        await client.query("COMMIT");
        applied.push(migration.filename);
      } catch (migrationErr) {
        await client.query("ROLLBACK");
        const msg = migrationErr instanceof Error ? migrationErr.message : String(migrationErr);
        throw new Error(`Failed to apply migration ${migration.filename}: ${msg}`);
      }
    }

    return {
      success: true,
      applied,
      alreadyApplied,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      applied,
      alreadyApplied,
      error: errorMsg,
    };
  } finally {
    client.release();
  }
}

export async function runMigrationsFromCli(): Promise<void> {
  console.log("Checking database connection and running pending migrations...");

  if (!isDatabaseConfigured()) {
    console.error("Migration error: DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  const result = await runMigrations();
  await closeDatabasePool();

  if (!result.success) {
    console.error("Migration failed:", result.error);
    process.exit(1);
  }

  if (result.applied.length === 0) {
    console.log(`Database is already up to date (${result.alreadyApplied.length} migrations applied).`);
  } else {
    console.log(`Successfully applied ${result.applied.length} migration(s):`);
    for (const name of result.applied) {
      console.log(`  + ${name}`);
    }
  }
}

// Allow direct CLI invocation: node apps/web/server/db/migrate.ts or via package script
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  runMigrationsFromCli();
}
