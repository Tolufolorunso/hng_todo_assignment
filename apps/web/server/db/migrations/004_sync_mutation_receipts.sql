-- 004_sync_mutation_receipts.sql
-- Table for storing idempotent mutation receipts per account

CREATE TABLE IF NOT EXISTS sync_mutation_receipts (
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  mutation_id VARCHAR(64) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  action VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  applied_revision BIGINT NULL,
  conflict_details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, mutation_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_mutation_receipts_account_created
  ON sync_mutation_receipts(account_id, created_at);

-- Add revision column to occurrence_history for unified change streaming
ALTER TABLE occurrence_history ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_occurrence_account_rev ON occurrence_history(account_id, revision);

