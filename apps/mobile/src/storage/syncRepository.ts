import type { SqliteDatabase } from "../db/driver.js";
import type {
  OutboxRecord,
  SyncCursor,
  ConflictRecord,
  TombstoneRecord,
  SyncEntityType,
} from "../types/sync.js";

export interface RepositoryOptions {
  enqueueOutbox?: boolean;
  tx?: SqliteDatabase;
}

interface OutboxRow {
  id: string;
  mutation_id: string;
  protocol_version: number;
  entity_type: string;
  entity_id: string;
  action: string;
  base_revision: number | null;
  payload: string | null;
  created_at: string;
}

interface CursorRow {
  id: string;
  workspace_id: string;
  cursor: number;
  updated_at: string;
}

interface ConflictRow {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  local_value: string | null;
  server_value: string | null;
  server_revision: number;
  created_at: string;
}

interface TombstoneRow {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  deleted_at: string;
}

interface RevisionRow {
  id: string;
  entity_type: string;
  entity_id: string;
  server_revision: number;
}

function mapRowToOutbox(row: OutboxRow): OutboxRecord {
  return {
    id: row.id,
    mutationId: row.mutation_id,
    protocolVersion: row.protocol_version,
    entityType: row.entity_type as OutboxRecord["entityType"],
    entityId: row.entity_id,
    action: row.action as OutboxRecord["action"],
    baseRevision: row.base_revision !== null && row.base_revision !== undefined ? Number(row.base_revision) : null,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

function mapRowToConflict(row: ConflictRow): ConflictRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    entityType: row.entity_type as ConflictRecord["entityType"],
    entityId: row.entity_id,
    localValue: row.local_value,
    serverValue: row.server_value,
    serverRevision: Number(row.server_revision),
    createdAt: row.created_at,
  };
}

export class SyncRepository {
  constructor(private db: SqliteDatabase) {}

  private getExecutor(tx?: SqliteDatabase): SqliteDatabase {
    return tx || this.db;
  }

  async enqueueOutbox(
    params: {
      entityType: SyncEntityType;
      entityId: string;
      action: "put" | "delete";
      baseRevision?: number | null;
      payload?: string | null;
      mutationId?: string;
    },
    tx?: SqliteDatabase
  ): Promise<OutboxRecord> {
    const executor = this.getExecutor(tx);
    const id = "out_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const mutationId = params.mutationId || "mut_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const createdAt = new Date().toISOString();
    const baseRevision = params.baseRevision !== undefined ? params.baseRevision : null;
    const payload = params.payload !== undefined ? params.payload : null;

    await executor.execute(
      `INSERT INTO outbox (id, mutation_id, protocol_version, entity_type, entity_id, action, base_revision, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        mutationId,
        1,
        params.entityType,
        params.entityId,
        params.action,
        baseRevision,
        payload,
        createdAt,
      ]
    );

    return {
      id,
      mutationId,
      protocolVersion: 1,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      baseRevision,
      payload,
      createdAt,
    };
  }

  async listOutbox(limit: number = 100): Promise<OutboxRecord[]> {
    const rows = await this.db.query<OutboxRow>(
      `SELECT id, mutation_id, protocol_version, entity_type, entity_id, action, base_revision, payload, created_at FROM outbox ORDER BY created_at ASC LIMIT ${limit}`
    );
    return rows.map(mapRowToOutbox);
  }

  async countOutbox(): Promise<number> {
    const rows = await this.db.query<{ count: number }>("SELECT COUNT(*) AS count FROM outbox");
    return rows[0]?.count || 0;
  }

  async dequeueOutbox(mutationIds: string[], tx?: SqliteDatabase): Promise<void> {
    if (mutationIds.length === 0) return;
    const executor = this.getExecutor(tx);
    for (const mId of mutationIds) {
      await executor.execute("DELETE FROM outbox WHERE mutation_id = ?", [mId]);
    }
  }

  async getCursor(workspaceId: string): Promise<number> {
    const row = await this.db.queryFirst<CursorRow>(
      "SELECT id, workspace_id, cursor, updated_at FROM sync_cursors WHERE workspace_id = ?",
      [workspaceId]
    );
    return row ? Number(row.cursor) : 0;
  }

  async setCursor(workspaceId: string, cursor: number, tx?: SqliteDatabase): Promise<void> {
    const executor = this.getExecutor(tx);
    const existing = await executor.queryFirst<CursorRow>(
      "SELECT id FROM sync_cursors WHERE workspace_id = ?",
      [workspaceId]
    );
    const now = new Date().toISOString();

    if (existing) {
      await executor.execute(
        "UPDATE sync_cursors SET cursor = ?, updated_at = ? WHERE workspace_id = ?",
        [cursor, now, workspaceId]
      );
    } else {
      const id = "cur_" + Math.random().toString(36).substring(2, 10);
      await executor.execute(
        "INSERT INTO sync_cursors (id, workspace_id, cursor, updated_at) VALUES (?, ?, ?, ?)",
        [id, workspaceId, cursor, now]
      );
    }
  }

  async recordConflict(
    conflict: Omit<ConflictRecord, "id" | "createdAt">,
    tx?: SqliteDatabase
  ): Promise<ConflictRecord> {
    const executor = this.getExecutor(tx);
    const id = "conf_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const createdAt = new Date().toISOString();

    await executor.execute(
      `INSERT INTO conflicts (id, workspace_id, entity_type, entity_id, local_value, server_value, server_revision, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        conflict.workspaceId,
        conflict.entityType,
        conflict.entityId,
        conflict.localValue || null,
        conflict.serverValue || null,
        conflict.serverRevision,
        createdAt,
      ]
    );

    return {
      id,
      workspaceId: conflict.workspaceId,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      localValue: conflict.localValue || null,
      serverValue: conflict.serverValue || null,
      serverRevision: conflict.serverRevision,
      createdAt,
    };
  }

  async listConflicts(workspaceId: string): Promise<ConflictRecord[]> {
    const rows = await this.db.query<ConflictRow>(
      "SELECT id, workspace_id, entity_type, entity_id, local_value, server_value, server_revision, created_at FROM conflicts WHERE workspace_id = ?",
      [workspaceId]
    );
    return rows.map(mapRowToConflict);
  }

  async countConflicts(workspaceId: string): Promise<number> {
    const conflicts = await this.listConflicts(workspaceId);
    return conflicts.length;
  }

  async resolveConflict(conflictId: string, tx?: SqliteDatabase): Promise<void> {
    const executor = this.getExecutor(tx);
    await executor.execute("DELETE FROM conflicts WHERE id = ?", [conflictId]);
  }

  async recordTombstone(
    workspaceId: string,
    entityType: SyncEntityType,
    entityId: string,
    tx?: SqliteDatabase
  ): Promise<void> {
    const executor = this.getExecutor(tx);
    const id = "tb_" + Math.random().toString(36).substring(2, 10);
    const deletedAt = new Date().toISOString();

    await executor.execute(
      "INSERT INTO tombstones (id, workspace_id, entity_type, entity_id, deleted_at) VALUES (?, ?, ?, ?, ?)",
      [id, workspaceId, entityType, entityId, deletedAt]
    );
  }

  async isTombstone(workspaceId: string, entityType: SyncEntityType, entityId: string): Promise<boolean> {
    const row = await this.db.queryFirst<TombstoneRow>(
      "SELECT id FROM tombstones WHERE entity_type = ? AND entity_id = ?",
      [entityType, entityId]
    );
    return !!row;
  }

  async setServerRevision(
    entityType: SyncEntityType,
    entityId: string,
    serverRevision: number,
    tx?: SqliteDatabase
  ): Promise<void> {
    const executor = this.getExecutor(tx);
    const existing = await executor.queryFirst<RevisionRow>(
      "SELECT id FROM server_revisions WHERE entity_type = ? AND entity_id = ?",
      [entityType, entityId]
    );

    if (existing) {
      await executor.execute(
        "UPDATE server_revisions SET server_revision = ? WHERE entity_type = ? AND entity_id = ?",
        [serverRevision, entityType, entityId]
      );
    } else {
      const id = `${entityType}_${entityId}`;
      await executor.execute(
        "INSERT INTO server_revisions (id, entity_type, entity_id, server_revision) VALUES (?, ?, ?, ?)",
        [id, entityType, entityId, serverRevision]
      );
    }
  }

  async getServerRevision(entityType: SyncEntityType, entityId: string): Promise<number | null> {
    const row = await this.db.queryFirst<RevisionRow>(
      "SELECT server_revision FROM server_revisions WHERE entity_type = ? AND entity_id = ?",
      [entityType, entityId]
    );
    return row ? Number(row.server_revision) : null;
  }
}
