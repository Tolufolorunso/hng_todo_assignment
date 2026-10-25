-- 002_auth_otp_codes.sql
-- Table for tracking email verification codes and rate limiting attempts

CREATE TABLE IF NOT EXISTS otp_codes (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(128) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email_expires ON otp_codes(email, expires_at);
