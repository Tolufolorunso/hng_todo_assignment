import crypto from "node:crypto";
import { executeQuery, isDatabaseConfigured } from "./db/client";

export interface AccessTokenPayload {
  sub: string; // accountId
  sid: string; // sessionId
  email: string;
  iat: number; // issued at in seconds
  exp: number; // expires at in seconds
}

export interface AccountRecord {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SessionRecord {
  id: string;
  accountId: string;
  clientPlatform: string;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface SessionSummary {
  id: string;
  clientPlatform: string;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface AccountProfile {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  activeSessionsCount: number;
}

export interface OtpVerificationResult {
  success: boolean;
  error?: "EXPIRED_OR_NOT_FOUND" | "TOO_MANY_ATTEMPTS" | "INVALID_CODE";
  attemptsRemaining?: number;
}

export type EmailSender = (to: string, subject: string, text: string) => Promise<boolean>;

// Default email sender resolves true without leaking credentials or PII
let activeEmailSender: EmailSender = async () => {
  return true;
};

export function setEmailSender(sender: EmailSender): void {
  activeEmailSender = sender;
}

export function resetEmailSender(): void {
  activeEmailSender = async () => {
    return true;
  };
};

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }
  // Safe default fallback for development and tests
  return "taskflow_dev_secret_auth_key_must_be_long_and_secure_32_bytes";
}

// Token generation and verification

export function base64UrlEncode(data: string | Buffer): string {
  const buffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buffer.toString("base64url");
}

export function base64UrlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

export function createAccessToken(
  payload: { accountId: string; sessionId: string; email: string },
  expiresInSeconds = 900 // 15 minutes default
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AccessTokenPayload = {
    sub: payload.accountId,
    sid: payload.sessionId,
    email: payload.email.toLowerCase().trim(),
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const secret = getAuthSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${dataToSign}.${encodedSignature}`;
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const secret = getAuthSecret();
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest();

  let providedSignature: Buffer;
  try {
    providedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }

  if (expectedSignature.length !== providedSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(expectedSignature, providedSignature)) {
    return null;
  }

  try {
    const jsonStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(jsonStr) as AccessTokenPayload;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.sub || !payload.sid || !payload.exp || payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtpCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

export function verifyOtpHash(code: string, expectedHash: string): boolean {
  const actualHash = hashOtpCode(code);
  const actualBuffer = Buffer.from(actualHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

// Database-backed OTP, Account, and Session operations

export async function requestOtpCode(
  email: string,
  expiresInSeconds = 600
): Promise<{ code: string; expiresAt: Date }> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const normalizedEmail = email.toLowerCase().trim();
  const code = generateOtpCode();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const id = `otp_${crypto.randomUUID()}`;

  await executeQuery(
    `INSERT INTO otp_codes (id, email, code_hash, attempts, expires_at, created_at)
     VALUES ($1, $2, $3, 0, $4, NOW())`,
    [id, normalizedEmail, codeHash, expiresAt.toISOString()]
  );

  const subject = "Your TaskFlow Verification Code";
  const body = `Your one-time verification code is: ${code}. It expires in 10 minutes.`;
  await activeEmailSender(normalizedEmail, subject, body);

  return { code, expiresAt };
}

export async function verifyOtpCode(
  email: string,
  code: string
): Promise<OtpVerificationResult> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find the newest unconsumed code that hasn't expired yet
  const result = await executeQuery<{
    id: string;
    code_hash: string;
    attempts: number;
    expires_at: string;
  }>(
    `SELECT id, code_hash, attempts, expires_at
     FROM otp_codes
     WHERE email = $1 AND consumed_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    return { success: false, error: "EXPIRED_OR_NOT_FOUND" };
  }

  const row = result.rows[0];

  if (row.attempts >= 5) {
    return { success: false, error: "TOO_MANY_ATTEMPTS", attemptsRemaining: 0 };
  }

  const isMatch = verifyOtpHash(code, row.code_hash);

  if (!isMatch) {
    const updatedAttempts = row.attempts + 1;
    await executeQuery(
      `UPDATE otp_codes SET attempts = $1 WHERE id = $2`,
      [updatedAttempts, row.id]
    );

    const attemptsRemaining = Math.max(0, 5 - updatedAttempts);
    return {
      success: false,
      error: attemptsRemaining === 0 ? "TOO_MANY_ATTEMPTS" : "INVALID_CODE",
      attemptsRemaining,
    };
  }

  // Consume code
  await executeQuery(
    `UPDATE otp_codes SET consumed_at = NOW() WHERE id = $1`,
    [row.id]
  );

  return { success: true };
}

export async function findOrCreateAccount(
  email: string
): Promise<{ account: AccountRecord; isNew: boolean }> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if account already exists
  const existing = await executeQuery<AccountRecord>(
    `SELECT id, email, created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
     FROM accounts
     WHERE email = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [normalizedEmail]
  );

  if (existing.rows.length > 0) {
    return { account: existing.rows[0], isNew: false };
  }

  // Insert new account
  const newId = `acc_${crypto.randomUUID()}`;
  const insertResult = await executeQuery<AccountRecord>(
    `INSERT INTO accounts (id, email, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     RETURNING id, email, created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"`,
    [newId, normalizedEmail]
  );

  return { account: insertResult.rows[0], isNew: true };
}

export async function createSession(
  accountId: string,
  clientPlatform: string,
  userAgent?: string | null
): Promise<{ sessionId: string; refreshToken: string; expiresAt: Date }> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const sessionId = `ses_${crypto.randomUUID()}`;
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  // Session lasts 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await executeQuery(
    `INSERT INTO sessions (id, account_id, refresh_token_hash, user_agent, client_platform, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [
      sessionId,
      accountId,
      refreshTokenHash,
      userAgent ?? null,
      clientPlatform,
      expiresAt.toISOString(),
    ]
  );

  return { sessionId, refreshToken, expiresAt };
}

export async function rotateRefreshToken(
  oldRefreshToken: string
): Promise<{
  sessionId: string;
  accountId: string;
  email: string;
  newRefreshToken: string;
  expiresAt: Date;
} | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const oldHash = hashToken(oldRefreshToken);

  const result = await executeQuery<{
    id: string;
    account_id: string;
    email: string;
    revoked_at: string | null;
    expires_at: string;
  }>(
    `SELECT s.id, s.account_id, a.email, s.revoked_at, s.expires_at
     FROM sessions s
     JOIN accounts a ON s.account_id = a.id
     WHERE s.refresh_token_hash = $1 AND a.deleted_at IS NULL
     LIMIT 1`,
    [oldHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const session = result.rows[0];

  // If session is revoked or expired, check for possible replay attacks
  if (session.revoked_at !== null || new Date(session.expires_at) <= new Date()) {
    // Revoke all sessions for this account if revoked token was attempted
    if (session.revoked_at !== null) {
      await executeQuery(
        `UPDATE sessions SET revoked_at = NOW() WHERE account_id = $1`,
        [session.account_id]
      );
    }
    return null;
  }

  // Issue new refresh token and extend session
  const newRefreshToken = generateRefreshToken();
  const newHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await executeQuery(
    `UPDATE sessions
     SET refresh_token_hash = $1, expires_at = $2
     WHERE id = $3`,
    [newHash, newExpiresAt.toISOString(), session.id]
  );

  return {
    sessionId: session.id,
    accountId: session.account_id,
    email: session.email,
    newRefreshToken,
    expiresAt: newExpiresAt,
  };
}

export async function revokeSession(
  sessionId: string,
  accountId: string
): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery(
    `UPDATE sessions
     SET revoked_at = NOW()
     WHERE id = $1 AND account_id = $2 AND revoked_at IS NULL`,
    [sessionId, accountId]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function revokeAllSessions(
  accountId: string,
  keepSessionId?: string
): Promise<number> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  let query = `UPDATE sessions SET revoked_at = NOW() WHERE account_id = $1 AND revoked_at IS NULL`;
  const params: unknown[] = [accountId];

  if (keepSessionId) {
    query += ` AND id != $2`;
    params.push(keepSessionId);
  }

  const result = await executeQuery(query, params);
  return result.rowCount ?? 0;
}

export async function listSessions(
  accountId: string,
  currentSessionId?: string
): Promise<SessionSummary[]> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const result = await executeQuery<{
    id: string;
    client_platform: string;
    user_agent: string | null;
    created_at: string;
    expires_at: string;
  }>(
    `SELECT id, client_platform, user_agent, created_at, expires_at
     FROM sessions
     WHERE account_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [accountId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    clientPlatform: row.client_platform,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isCurrent: row.id === currentSessionId,
  }));
}

export async function getAccountProfile(
  accountId: string
): Promise<AccountProfile | null> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  const accountResult = await executeQuery<AccountRecord>(
    `SELECT id, email, created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
     FROM accounts
     WHERE id = $1 AND deleted_at IS NULL
     LIMIT 1`,
    [accountId]
  );

  if (accountResult.rows.length === 0) {
    return null;
  }

  const account = accountResult.rows[0];

  const countResult = await executeQuery<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM sessions
     WHERE account_id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [accountId]
  );

  const activeSessionsCount = parseInt(countResult.rows[0]?.count ?? "0", 10);

  return {
    id: account.id,
    email: account.email,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    activeSessionsCount,
  };
}

export async function deleteAccount(accountId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_UNAVAILABLE: Database connection is not configured");
  }

  // Atomic cascade deletion: deleting from accounts cascades across all child tables
  // (sessions, tasks, notes, followups, occurrences, daily plans, inbox captures,
  // task orders, mutation receipts, tombstones, push subscriptions, delivery logs)
  // due to foreign key ON DELETE CASCADE constraints.
  const result = await executeQuery(
    `DELETE FROM accounts WHERE id = $1`,
    [accountId]
  );

  return (result.rowCount ?? 0) > 0;
}

// Request Authentication Helper

export async function authenticateRequest(
  request: Request
): Promise<AccessTokenPayload | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  // If database is available, optionally verify that the session has not been revoked
  if (isDatabaseConfigured()) {
    try {
      const result = await executeQuery<{ revoked_at: string | null }>(
        `SELECT revoked_at FROM sessions WHERE id = $1 LIMIT 1`,
        [payload.sid]
      );
      if (result.rows.length === 0 || result.rows[0].revoked_at !== null) {
        return null;
      }
    } catch {
      // In case of transient DB read error, allow valid signed JWT to proceed or return null
      return null;
    }
  }

  return payload;
}
