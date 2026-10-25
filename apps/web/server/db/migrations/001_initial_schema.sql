-- 001_initial_schema.sql
-- Foundation tables for TaskFlow accounts, cloud persistence, and sync

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(128) NOT NULL,
  user_agent TEXT NULL,
  client_platform VARCHAR(32) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_account_expires ON sessions(account_id, expires_at);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  priority VARCHAR(16) NOT NULL DEFAULT 'medium',
  due_date DATE NULL,
  category VARCHAR(32) NULL,
  estimated_minutes INTEGER NULL,
  source_note_id VARCHAR(64) NULL,
  source_excerpt TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_account_updated ON tasks(account_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_account_due ON tasks(account_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_account_source_note ON tasks(account_id, source_note_id);

CREATE TABLE IF NOT EXISTS notes (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  revision BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_account_updated ON notes(account_id, updated_at);

CREATE TABLE IF NOT EXISTS followups (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  person_name VARCHAR(200) NOT NULL,
  commitment TEXT NOT NULL,
  details TEXT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  time_zone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  email_address VARCHAR(255) NULL,
  phone_number VARCHAR(64) NULL,
  whatsapp_number VARCHAR(64) NULL,
  preferred_action VARCHAR(32) NULL,
  recurrence_json JSONB NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  source_note_id VARCHAR(64) NULL,
  source_excerpt TEXT NULL,
  revision BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_account_due ON followups(account_id, due_at);
CREATE INDEX IF NOT EXISTS idx_followups_account_status ON followups(account_id, status);

CREATE TABLE IF NOT EXISTS occurrence_history (
  id VARCHAR(64) PRIMARY KEY,
  followup_id VARCHAR(64) NOT NULL REFERENCES followups(id) ON DELETE CASCADE,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_occurrence_followup_due ON occurrence_history(followup_id, due_at);
CREATE INDEX IF NOT EXISTS idx_occurrence_account ON occurrence_history(account_id);

CREATE TABLE IF NOT EXISTS daily_plans (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  available_minutes INTEGER NOT NULL DEFAULT 0,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  revision BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_daily_plans_account_date UNIQUE (account_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_account_date ON daily_plans(account_id, plan_date);

CREATE TABLE IF NOT EXISTS inbox_captures (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  shared_url TEXT NULL,
  source_app_label VARCHAR(100) NULL,
  state VARCHAR(32) NOT NULL DEFAULT 'pending',
  target_type VARCHAR(32) NULL,
  target_id VARCHAR(64) NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NULL,
  discarded_at TIMESTAMPTZ NULL,
  revision BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_account_state ON inbox_captures(account_id, state);
CREATE INDEX IF NOT EXISTS idx_inbox_account_captured ON inbox_captures(account_id, captured_at);

CREATE TABLE IF NOT EXISTS sync_revisions (
  account_id VARCHAR(64) PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  current_cursor BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tombstones (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  entity_type VARCHAR(32) NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revision BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tombstones_account_rev ON tombstones(account_id, revision);
