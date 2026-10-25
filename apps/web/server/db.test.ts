import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "node:path";
import {
  isDatabaseConfigured,
  getDatabasePool,
  checkDatabaseHealth,
  closeDatabasePool,
} from "./db/client";
import {
  loadMigrationFiles,
  runMigrations,
} from "./db/migrate";

describe("Database client", () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(async () => {
    await closeDatabasePool();
    delete process.env.DATABASE_URL;
  });

  afterEach(async () => {
    await closeDatabasePool();
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  it("reports unconfigured when DATABASE_URL is not set", () => {
    expect(isDatabaseConfigured()).toBe(false);
    expect(getDatabasePool()).toBeNull();
  });

  it("reports unconfigured health when DATABASE_URL is not set", async () => {
    const health = await checkDatabaseHealth();
    expect(health.status).toBe("unconfigured");
    expect(health.latencyMs).toBeNull();
    expect(health.error).toBeNull();
  });

  it("reports configured when DATABASE_URL is present", () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/taskflow";
    expect(isDatabaseConfigured()).toBe(true);
    const pool = getDatabasePool();
    expect(pool).not.toBeNull();
  });

  it("handles connection failure gracefully during health check", async () => {
    process.env.DATABASE_URL = "postgres://invalid_user:invalid_pass@127.0.0.1:59999/taskflow";
    const health = await checkDatabaseHealth();
    expect(health.status).toBe("disconnected");
    expect(health.latencyMs).toBeNull();
    expect(health.error).toBeTruthy();
  });
});

describe("Database migrations", () => {
  it("loads migration files from disk in correct order", () => {
    const migrationsDir = path.join(__dirname, "db", "migrations");
    const migrations = loadMigrationFiles(migrationsDir);

    expect(migrations.length).toBeGreaterThanOrEqual(1);
    expect(migrations[0].version).toBe(1);
    expect(migrations[0].name).toBe("initial_schema");
    expect(migrations[0].filename).toBe("001_initial_schema.sql");
    expect(migrations[0].sql).toContain("CREATE TABLE IF NOT EXISTS accounts");
    expect(migrations[0].sql).toContain("CREATE TABLE IF NOT EXISTS tasks");
    expect(migrations[0].sql).toContain("CREATE TABLE IF NOT EXISTS notes");
    expect(migrations[0].sql).toContain("CREATE TABLE IF NOT EXISTS followups");
    expect(migrations[0].sql).toContain("CREATE TABLE IF NOT EXISTS daily_plans");
    expect(migrations[0].sql).toContain("CREATE TABLE IF NOT EXISTS inbox_captures");
  });

  it("refuses to run migrations when pool is unavailable", async () => {
    delete process.env.DATABASE_URL;
    const result = await runMigrations();
    expect(result.success).toBe(false);
    expect(result.error).toContain("DATABASE_UNAVAILABLE");
    expect(result.applied).toEqual([]);
  });

  it("executes migrations and tracks applied versions with mock pool", async () => {
    const queriesRun: string[] = [];
    const mockClient = {
      query: vi.fn(async (sql: string) => {
        queriesRun.push(sql);
        if (typeof sql === "string" && sql.includes("SELECT version FROM schema_migrations")) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const mockPool = {
      connect: vi.fn(async () => mockClient),
    } as unknown as import("pg").Pool;

    const migrationsDir = path.join(__dirname, "db", "migrations");
    const result = await runMigrations(mockPool, migrationsDir);

    expect(result.success).toBe(true);
    expect(result.applied).toContain("001_initial_schema.sql");
    expect(mockClient.release).toHaveBeenCalled();
  });
});
