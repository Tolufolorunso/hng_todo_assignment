-- 005_push_subscriptions.sql
-- Tables for web push subscriptions and per-occurrence notification dispatch receipts

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  user_agent TEXT NULL,
  preview_mode VARCHAR(16) NOT NULL DEFAULT 'generic',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_push_subscriptions_account_endpoint UNIQUE (account_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_account_active ON push_subscriptions(account_id, is_active);

CREATE TABLE IF NOT EXISTS notification_dispatches (
  id VARCHAR(64) PRIMARY KEY,
  account_id VARCHAR(64) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  followup_id VARCHAR(64) NOT NULL REFERENCES followups(id) ON DELETE CASCADE,
  occurrence_id VARCHAR(64) NOT NULL,
  subscription_id VARCHAR(64) NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'delivered',
  CONSTRAINT uq_notification_dispatch_occurrence_sub UNIQUE (account_id, followup_id, occurrence_id, subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_dispatch_followup_occ ON notification_dispatches(account_id, followup_id, occurrence_id);
