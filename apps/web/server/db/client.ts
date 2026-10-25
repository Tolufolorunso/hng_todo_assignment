import { Pool, type QueryResult, type QueryResultRow } from "pg";

export type DatabaseStatus = "connected" | "unconfigured" | "disconnected";

export interface DatabaseHealth {
  status: DatabaseStatus;
  latencyMs: number | null;
  error: string | null;
}

let pool: Pool | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "");
}

export function getDatabasePool(): Pool | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Conservative default limits for serverless / App Router environments
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return pool;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  if (!isDatabaseConfigured()) {
    return {
      status: "unconfigured",
      latencyMs: null,
      error: null,
    };
  }

  const activePool = getDatabasePool();
  if (!activePool) {
    return {
      status: "unconfigured",
      latencyMs: null,
      error: null,
    };
  }

  const start = performance.now();
  try {
    await activePool.query("SELECT 1 AS ping");
    const latencyMs = Math.round(performance.now() - start);
    return {
      status: "connected",
      latencyMs,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "disconnected",
      latencyMs: null,
      error: message,
    };
  }
}

export async function executeQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const activePool = getDatabasePool();
  if (!activePool) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  return activePool.query<T>(text, params);
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
