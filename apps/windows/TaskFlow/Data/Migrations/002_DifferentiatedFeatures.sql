-- Migration 002: Differentiated Features for followups, occurrences, daily plans, inbox captures, and task orders

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
    recurrence_json TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    source_note_id TEXT,
    source_excerpt TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_followups_due_at ON followups(due_at);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_updated_at ON followups(updated_at);

CREATE TABLE IF NOT EXISTS followup_occurrences (
    id TEXT PRIMARY KEY,
    followup_id TEXT NOT NULL,
    scheduled_due_time TEXT NOT NULL,
    outcome TEXT NOT NULL DEFAULT 'open',
    resolution_time TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(followup_id) REFERENCES followups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_followup_occ_followup_id ON followup_occurrences(followup_id);
CREATE INDEX IF NOT EXISTS idx_followup_occ_due ON followup_occurrences(scheduled_due_time);

CREATE TABLE IF NOT EXISTS daily_plans (
    id TEXT PRIMARY KEY,
    local_date TEXT NOT NULL UNIQUE,
    time_zone TEXT NOT NULL DEFAULT 'UTC',
    available_minutes INTEGER NOT NULL,
    items_json TEXT NOT NULL DEFAULT '[]',
    accepted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_local_date ON daily_plans(local_date);

CREATE TABLE IF NOT EXISTS inbox_captures (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    shared_url TEXT,
    source_app_label TEXT,
    state TEXT NOT NULL DEFAULT 'pending',
    result_entity_type TEXT,
    result_entity_id TEXT,
    processed_at TEXT,
    captured_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inbox_captures_state ON inbox_captures(state);
CREATE INDEX IF NOT EXISTS idx_inbox_captures_captured_at ON inbox_captures(captured_at);

CREATE TABLE IF NOT EXISTS task_orders (
    id TEXT PRIMARY KEY,
    ordered_ids_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
);
