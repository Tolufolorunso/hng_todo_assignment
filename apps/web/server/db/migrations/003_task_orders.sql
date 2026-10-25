-- 003_task_orders.sql
-- Table for storing custom task ordering arrays per account

CREATE TABLE IF NOT EXISTS task_orders (
  account_id VARCHAR(64) PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  task_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
