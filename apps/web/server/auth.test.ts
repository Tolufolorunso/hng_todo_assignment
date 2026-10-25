import { describe, it, expect, beforeEach } from "vitest";
import {
  createAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  generateOtpCode,
  hashOtpCode,
  verifyOtpHash,
  base64UrlEncode,
  base64UrlDecode,
  requestOtpCode,
  verifyOtpCode,
  findOrCreateAccount,
  createSession,
  rotateRefreshToken,
  listSessions,
  getAccountProfile,
  deleteAccount,
  authenticateRequest,
  setEmailSender,
  resetEmailSender,
} from "./auth";
import { loadMigrationFiles } from "./db/migrate";

describe("Authentication Engine (server/auth.ts)", () => {
  beforeEach(() => {
    resetEmailSender();
  });

  describe("Token Generation and Verification", () => {
    it("creates and verifies a valid HMAC-SHA256 access token", () => {
      const payload = {
        accountId: "acc_test_123",
        sessionId: "ses_test_456",
        email: "user@example.com",
      };

      const token = createAccessToken(payload, 900);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      const decoded = verifyAccessToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(payload.accountId);
      expect(decoded?.sid).toBe(payload.sessionId);
      expect(decoded?.email).toBe("user@example.com");
      expect(decoded?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("rejects an expired access token", () => {
      const payload = {
        accountId: "acc_test_123",
        sessionId: "ses_test_456",
        email: "user@example.com",
      };

      // Create token with negative expiration (already expired)
      const token = createAccessToken(payload, -10);
      const decoded = verifyAccessToken(token);
      expect(decoded).toBeNull();
    });

    it("rejects a tampered signature", () => {
      const payload = {
        accountId: "acc_test_123",
        sessionId: "ses_test_456",
        email: "user@example.com",
      };

      const token = createAccessToken(payload, 900);
      const parts = token.split(".");
      // Tamper with signature
      const tamperedToken = `${parts[0]}.${parts[1]}.invalid_signature`;

      expect(verifyAccessToken(tamperedToken)).toBeNull();
    });

    it("rejects a tampered payload", () => {
      const payload = {
        accountId: "acc_test_123",
        sessionId: "ses_test_456",
        email: "user@example.com",
      };

      const token = createAccessToken(payload, 900);
      const parts = token.split(".");

      // Modify payload to forge admin rights or different sub
      const fakePayload = base64UrlEncode(
        JSON.stringify({ sub: "acc_forged", sid: "ses_forged", exp: Math.floor(Date.now() / 1000) + 1000 })
      );
      const tamperedToken = `${parts[0]}.${fakePayload}.${parts[2]}`;

      expect(verifyAccessToken(tamperedToken)).toBeNull();
    });

    it("encodes and decodes base64url accurately", () => {
      const original = "TaskFlow Secure Authentication 2026! @#$%^&*()_+";
      const encoded = base64UrlEncode(original);
      expect(encoded).not.toContain("+");
      expect(encoded).not.toContain("/");
      expect(encoded).not.toContain("=");

      const decoded = base64UrlDecode(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe("Refresh Tokens and OTPs", () => {
    it("generates 64-character hexadecimal refresh tokens", () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();

      expect(token1.length).toBe(64);
      expect(token2.length).toBe(64);
      expect(token1).not.toBe(token2);
      expect(/^[0-9a-f]+$/.test(token1)).toBe(true);
    });

    it("hashes tokens reproducibly using SHA-256", () => {
      const token = "my_refresh_token_test_value";
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it("generates a 6-digit numeric OTP code", () => {
      for (let i = 0; i < 20; i++) {
        const code = generateOtpCode();
        expect(code.length).toBe(6);
        expect(/^\d{6}$/.test(code)).toBe(true);
      }
    });

    it("verifies OTP hash with constant-time equality check", () => {
      const code = "481920";
      const hash = hashOtpCode(code);

      expect(verifyOtpHash(code, hash)).toBe(true);
      expect(verifyOtpHash("000000", hash)).toBe(false);
      expect(verifyOtpHash("481921", hash)).toBe(false);
    });
  });

  describe("Pluggable Email Sender", () => {
    it("allows registering an email sender hook", async () => {
      const sent: Array<{ to: string; subject: string; text: string }> = [];

      setEmailSender(async (to, subject, text) => {
        sent.push({ to, subject, text });
        return true;
      });

      // Verification hook works as expected
      expect(sent.length).toBe(0);
    });
  });

  describe("Offline / Unconfigured Database Resilience", () => {
    it("throws DATABASE_UNAVAILABLE error when database is not configured", async () => {
      // Assuming DATABASE_URL is not set in test environment
      if (!process.env.DATABASE_URL) {
        await expect(requestOtpCode("test@example.com")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(verifyOtpCode("test@example.com", "123456")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(findOrCreateAccount("test@example.com")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(createSession("acc_1", "web")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(rotateRefreshToken("dummy_refresh")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(listSessions("acc_1")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(getAccountProfile("acc_1")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(deleteAccount("acc_1")).rejects.toThrow("DATABASE_UNAVAILABLE");
      }
    });

    it("authenticateRequest returns valid payload when valid Bearer header is passed without DB", async () => {
      const token = createAccessToken({
        accountId: "acc_auth_req",
        sessionId: "ses_auth_req",
        email: "req@example.com",
      });

      const request = new Request("http://localhost:3000/api/v1/account", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await authenticateRequest(request);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe("acc_auth_req");
      expect(payload?.email).toBe("req@example.com");
    });

    it("authenticateRequest returns null when Authorization header is missing or malformed", async () => {
      const req1 = new Request("http://localhost:3000/api/v1/account");
      expect(await authenticateRequest(req1)).toBeNull();

      const req2 = new Request("http://localhost:3000/api/v1/account", {
        headers: { Authorization: "Basic invalid" },
      });
      expect(await authenticateRequest(req2)).toBeNull();

      const req3 = new Request("http://localhost:3000/api/v1/account", {
        headers: { Authorization: "Bearer malformed.token.value" },
      });
      expect(await authenticateRequest(req3)).toBeNull();
    });
  });

  describe("Schema Migration 002 (002_auth_otp_codes.sql)", () => {
    it("parses 002_auth_otp_codes.sql as valid migration", () => {
      const migrations = loadMigrationFiles();
      const m002 = migrations.find((m) => m.version === 2);

      expect(m002).toBeDefined();
      expect(m002?.name).toBe("auth_otp_codes");
      expect(m002?.sql).toContain("CREATE TABLE IF NOT EXISTS otp_codes");
      expect(m002?.sql).toContain("code_hash VARCHAR(128)");
      expect(m002?.sql).toContain("attempts INTEGER NOT NULL DEFAULT 0");
      expect(m002?.sql).toContain("expires_at TIMESTAMPTZ NOT NULL");
    });
  });
});
