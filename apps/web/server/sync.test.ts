import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { QueryResult, QueryResultRow } from "pg";
import {
  processSyncBatch,
  SYNC_PROTOCOL_VERSION,
  MAX_SYNC_MUTATIONS_PER_BATCH,
  type SyncMutation,
} from "./sync";
import { loadMigrationFiles } from "./db/migrate";
import * as dbClient from "./db/client";

function mockQueryResult<T extends QueryResultRow = QueryResultRow>(
  rows: T[],
  rowCount?: number
): QueryResult<T> {
  return {
    command: "SELECT",
    oid: 0,
    fields: [],
    rows,
    rowCount: rowCount ?? rows.length,
  };
}

describe("Synchronization and Conflict Engine (server/sync.ts)", () => {
  describe("Schema Migration 004", () => {
    it("parses 004_sync_mutation_receipts.sql as valid migration", () => {
      const migrations = loadMigrationFiles();
      const m004 = migrations.find((m) => m.version === 4);

      expect(m004).toBeDefined();
      expect(m004?.name).toBe("sync_mutation_receipts");
      expect(m004?.sql).toContain("CREATE TABLE IF NOT EXISTS sync_mutation_receipts");
      expect(m004?.sql).toContain("mutation_id VARCHAR(64) NOT NULL");
      expect(m004?.sql).toContain("ALTER TABLE occurrence_history ADD COLUMN IF NOT EXISTS revision");
    });
  });

  describe("Protocol and Limits Validation", () => {
    it("rejects unsupported protocol version", async () => {
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);

      await expect(
        processSyncBatch("acc_1", {
          protocolVersion: 2,
        })
      ).rejects.toThrow("Unsupported protocol version: 2");

      vi.restoreAllMocks();
    });

    it("rejects batch exceeding MAX_SYNC_MUTATIONS_PER_BATCH", async () => {
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);

      const excessiveMutations: SyncMutation[] = Array.from({ length: MAX_SYNC_MUTATIONS_PER_BATCH + 1 }, (_, i) => ({
        mutationId: `mut_${i}`,
        entityType: "task",
        entityId: `tsk_${i}`,
        action: "put",
        payload: { title: `Task ${i}` },
      }));

      await expect(
        processSyncBatch("acc_1", {
          protocolVersion: SYNC_PROTOCOL_VERSION,
          mutations: excessiveMutations,
        })
      ).rejects.toThrow(`Batch size exceeds maximum limit of ${MAX_SYNC_MUTATIONS_PER_BATCH} mutations`);

      vi.restoreAllMocks();
    });
  });

  describe("Offline / Unconfigured Database Resilience", () => {
    it("throws DATABASE_UNAVAILABLE when database is unconfigured", async () => {
      if (!process.env.DATABASE_URL) {
        await expect(
          processSyncBatch("acc_test_offline", {
            protocolVersion: SYNC_PROTOCOL_VERSION,
            mutations: [],
          })
        ).rejects.toThrow("DATABASE_UNAVAILABLE");
      }
    });
  });

  describe("Mutation Processing & Conflict Engine Logic", () => {
    beforeEach(() => {
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns invalid status receipt on malformed task payload", async () => {
      vi.spyOn(dbClient, "executeQuery").mockResolvedValue(mockQueryResult([]));

      const result = await processSyncBatch("acc_test", {
        mutations: [
          {
            mutationId: "mut_invalid_1",
            entityType: "task",
            entityId: "tsk_1",
            action: "put",
            payload: { title: "" }, // empty title invalid
          },
        ],
      });

      expect(result.receipts).toHaveLength(1);
      expect(result.receipts[0].status).toBe("invalid");
      expect(result.receipts[0].mutationId).toBe("mut_invalid_1");
      expect(result.receipts[0].error).toContain("Task title is required");
    });

    it("replays duplicate receipt when mutation was previously recorded", async () => {
      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (query: string) => {
        if (query.includes("FROM sync_mutation_receipts")) {
          return mockQueryResult([
            {
              mutation_id: "mut_dup_1",
              entity_type: "task",
              entity_id: "tsk_100",
              action: "put",
              status: "applied",
              applied_revision: "7",
              conflict_details: null,
            },
          ]);
        }
        return mockQueryResult([]);
      });

      const result = await processSyncBatch("acc_test", {
        mutations: [
          {
            mutationId: "mut_dup_1",
            entityType: "task",
            entityId: "tsk_100",
            action: "put",
            payload: { title: "Original" },
          },
        ],
      });

      expect(result.receipts).toHaveLength(1);
      expect(result.receipts[0].status).toBe("duplicate");
      expect(result.receipts[0].appliedRevision).toBe(7);
    });

    it("detects conflict when baseRevision is strictly lower than server entity revision", async () => {
      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (query: string) => {
        if (query.includes("FROM sync_mutation_receipts")) {
          return mockQueryResult([]);
        }
        if (query.includes("FROM tasks WHERE id = $1")) {
          return mockQueryResult([
            {
              id: "tsk_conflict",
              title: "Server Title (Updated)",
              revision: "5",
            },
          ]);
        }
        return mockQueryResult([]);
      });

      const result = await processSyncBatch("acc_test", {
        mutations: [
          {
            mutationId: "mut_conf_1",
            entityType: "task",
            entityId: "tsk_conflict",
            action: "put",
            baseRevision: 3, // Client saw rev 3, server is at rev 5 -> Conflict!
            payload: { title: "Client Stale Update" },
          },
        ],
      });

      expect(result.receipts).toHaveLength(1);
      expect(result.receipts[0].status).toBe("conflict");
      expect(result.receipts[0].conflictDetails).toBeDefined();
      expect(result.receipts[0].conflictDetails?.serverRevision).toBe(5);
      expect(result.receipts[0].conflictDetails?.currentServerEntity).toBeDefined();
    });

    it("applies put mutation and increments revision when baseRevision matches", async () => {
      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (query: string) => {
        if (query.includes("FROM sync_mutation_receipts")) {
          return mockQueryResult([]);
        }
        if (query.includes("FROM tasks WHERE id = $1")) {
          return mockQueryResult([
            {
              id: "tsk_match",
              title: "Current Title",
              revision: "4",
            },
          ]);
        }
        if (query.includes("INSERT INTO sync_revisions")) {
          return mockQueryResult([{ current_cursor: "5" }]);
        }
        return mockQueryResult([], 1);
      });

      const result = await processSyncBatch("acc_test", {
        mutations: [
          {
            mutationId: "mut_apply_1",
            entityType: "task",
            entityId: "tsk_match",
            action: "put",
            baseRevision: 4, // Matches server revision 4
            payload: { title: "Updated Title" },
          },
        ],
      });

      expect(result.receipts).toHaveLength(1);
      expect(result.receipts[0].status).toBe("applied");
      expect(result.receipts[0].appliedRevision).toBe(5);
    });

    it("applies delete mutation, advances revision, and returns applied receipt", async () => {
      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (query: string) => {
        if (query.includes("FROM sync_mutation_receipts")) {
          return mockQueryResult([]);
        }
        if (query.includes("FROM tasks WHERE id = $1")) {
          return mockQueryResult([
            {
              id: "tsk_del",
              revision: "2",
            },
          ]);
        }
        if (query.includes("DELETE FROM tasks")) {
          return mockQueryResult([], 1);
        }
        if (query.includes("INSERT INTO sync_revisions")) {
          return mockQueryResult([{ current_cursor: "3" }]);
        }
        return mockQueryResult([], 1);
      });

      const result = await processSyncBatch("acc_test", {
        mutations: [
          {
            mutationId: "mut_del_1",
            entityType: "task",
            entityId: "tsk_del",
            action: "delete",
            baseRevision: 2,
          },
        ],
      });

      expect(result.receipts).toHaveLength(1);
      expect(result.receipts[0].status).toBe("applied");
      expect(result.receipts[0].appliedRevision).toBe(3);
    });

    it("returns changes and nextCursor reflecting maximum revision in pull window", async () => {
      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (query: string) => {
        if (query.includes("FROM tasks") && query.includes("revision > $2")) {
          return mockQueryResult([
            {
              id: "tsk_pull_1",
              title: "Pulled Task",
              completed: false,
              revision: 8,
            },
          ]);
        }
        if (query.includes("FROM tombstones") && query.includes("revision > $2")) {
          return mockQueryResult([
            {
              id: "not_deleted_1",
              entityType: "note",
              deletedAt: "2026-10-25T17:00:00Z",
              revision: 9,
            },
          ]);
        }
        return mockQueryResult([]);
      });

      const result = await processSyncBatch("acc_test", {
        cursor: 5,
        limit: 50,
      });

      expect(result.changes.tasks).toHaveLength(1);
      expect(result.changes.tombstones).toHaveLength(1);
      expect(result.nextCursor).toBe(9); // Max revision across returned items is 9
      expect(result.hasMore).toBe(false);
    });

    it("rejects put mutation when active tombstone exists, preventing entity resurrection", async () => {
      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (query: string) => {
        if (query.includes("FROM sync_mutation_receipts")) {
          return mockQueryResult([]);
        }
        if (query.includes("FROM tasks WHERE id = $1")) {
          return mockQueryResult([]); // Not in active tasks table
        }
        if (query.includes("FROM tombstones WHERE account_id = $1 AND id = $2")) {
          return mockQueryResult([
            {
              revision: "6",
              deleted_at: "2026-05-02T12:00:00.000Z",
            },
          ]);
        }
        return mockQueryResult([]);
      });

      const result = await processSyncBatch("acc_test", {
        mutations: [
          {
            mutationId: "mut_resurrect_1",
            entityType: "task",
            entityId: "tsk_dead_1",
            action: "put",
            baseRevision: 2,
            payload: {
              title: "Zombie Task",
            },
          },
        ],
      });

      expect(result.receipts).toHaveLength(1);
      expect(result.receipts[0].status).toBe("conflict");
      expect(result.receipts[0].conflictDetails).toBeDefined();
      expect(result.receipts[0].conflictDetails?.serverRevision).toBe(6);
      expect(result.receipts[0].conflictDetails?.message).toContain("tombstone");
      expect(result.receipts[0].conflictDetails?.currentServerEntity).toBeNull();
    });

    it("verifies multi-device convergence with concurrent updates and receipts", async () => {
      // Device A applies a valid task mutation
      // Device B tries to update same task with stale base revision
      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (query: string, params?: unknown[]) => {
        if (query.includes("FROM sync_mutation_receipts")) {
          return mockQueryResult([]);
        }
        if (query.includes("FROM tasks WHERE id = $1")) {
          const id = params?.[0];
          if (id === "tsk_device_a") {
            return mockQueryResult([
              {
                id: "tsk_device_a",
                title: "Server Current Title",
                revision: "4",
              },
            ]);
          }
        }
        if (query.includes("INSERT INTO sync_revisions")) {
          return mockQueryResult([{ current_cursor: "5" }]);
        }
        return mockQueryResult([], 1);
      });

      // Device A sends valid baseRevision 4, Device B sends stale baseRevision 2
      const result = await processSyncBatch("acc_test", {
        mutations: [
          {
            mutationId: "mut_dev_a_1",
            entityType: "task",
            entityId: "tsk_device_a",
            action: "put",
            baseRevision: 4,
            payload: { title: "Device A Fresh Update" },
          },
          {
            mutationId: "mut_dev_b_1",
            entityType: "task",
            entityId: "tsk_device_a",
            action: "put",
            baseRevision: 2,
            payload: { title: "Device B Stale Overwrite" },
          },
        ],
      });

      expect(result.receipts).toHaveLength(2);
      expect(result.receipts[0].status).toBe("applied");
      expect(result.receipts[0].appliedRevision).toBe(5);

      expect(result.receipts[1].status).toBe("conflict");
      expect(result.receipts[1].conflictDetails?.serverRevision).toBeGreaterThanOrEqual(4);
    });

    it("correctly signals hasMore when result set reaches limit", async () => {
      vi.spyOn(dbClient, "executeQuery").mockImplementation(async (query: string) => {
        if (query.includes("FROM tasks") && query.includes("revision > $2")) {
          // Return 3 tasks when limit is 2 (query fetches limit + 1)
          return mockQueryResult([
            { id: "t1", title: "Task 1", revision: 10 },
            { id: "t2", title: "Task 2", revision: 11 },
            { id: "t3", title: "Task 3", revision: 12 },
          ]);
        }
        return mockQueryResult([]);
      });

      const result = await processSyncBatch("acc_test", {
        cursor: 0,
        limit: 2,
      });

      expect(result.changes.tasks).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(11);
    });
  });
});
