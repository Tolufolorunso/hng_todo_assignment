-- Migration 003: Sync Engine outbox, cursors, conflicts, tombstones, and server revisions

CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    mutation_id TEXT NOT NULL UNIQUE,
    protocol_version INTEGER NOT NULL DEFAULT 1,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    base_revision INTEGER,
    payload TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox(created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_entity ON outbox(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS sync_cursors (
    workspace_id TEXT PRIMARY KEY,
    cursor INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conflicts (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    local_value TEXT,
    server_value TEXT,
    server_revision INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conflicts_entity ON conflicts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_workspace ON conflicts(workspace_id);

CREATE TABLE IF NOT EXISTS tombstones (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    deleted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tombstones_entity ON tombstones(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS server_revisions (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    server_revision INTEGER NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
);
