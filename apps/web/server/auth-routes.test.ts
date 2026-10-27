import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as requestOtpHandler } from "@/app/api/v1/auth/otp/request/route";
import { POST as verifyOtpHandler } from "@/app/api/v1/auth/otp/verify/route";
import { POST as refreshHandler } from "@/app/api/v1/auth/refresh/route";
import { POST as logoutHandler } from "@/app/api/v1/auth/logout/route";
import { GET as getSessionsHandler, POST as postSessionsHandler } from "@/app/api/v1/auth/sessions/route";
import { POST as revokeAllSessionsHandler } from "@/app/api/v1/auth/sessions/revoke-all/route";
import { DELETE as deleteSessionHandler } from "@/app/api/v1/auth/sessions/[id]/route";
import { GET as getAccountHandler, DELETE as deleteAccountHandler } from "@/app/api/v1/account/route";
import { resetRateLimits } from "@/server/rate-limit";
import { createAccessToken } from "@/server/auth";
import * as authServer from "@/server/auth";
import * as dbClient from "@/server/db/client";

describe("Authentication Route Handlers", () => {
  const validToken = createAccessToken({
    accountId: "acc_test_routes",
    sessionId: "ses_test_routes",
    email: "test.routes@example.com",
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    resetRateLimits();
  });

  describe("POST /api/v1/auth/otp/request", () => {
    it("returns 400 when body is not valid JSON", async () => {
      const req = new Request("http://localhost:3000/api/v1/auth/otp/request", {
        method: "POST",
        body: "invalid-json",
        headers: { "Content-Type": "application/json" },
      });

      const res = await requestOtpHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 when email is missing or invalid", async () => {
      const req1 = new Request("http://localhost:3000/api/v1/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const res1 = await requestOtpHandler(req1);
      expect(res1.status).toBe(400);

      const json1 = await res1.json();
      expect(json1.error.code).toBe("BAD_REQUEST");
      expect(json1.error.details[0].field).toBe("email");

      const req2 = new Request("http://localhost:3000/api/v1/auth/otp/request", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
        headers: { "Content-Type": "application/json" },
      });

      const res2 = await requestOtpHandler(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.error.details[0].field).toBe("email");
    });

    it("returns 503 DATABASE_UNAVAILABLE when database is unconfigured", async () => {
      if (!process.env.DATABASE_URL) {
        const req = new Request("http://localhost:3000/api/v1/auth/otp/request", {
          method: "POST",
          body: JSON.stringify({ email: "user@example.com" }),
          headers: { "Content-Type": "application/json" },
        });

        const res = await requestOtpHandler(req);
        expect(res.status).toBe(503);

        const json = await res.json();
        expect(json.error.code).toBe("DATABASE_UNAVAILABLE");
      }
    });

    it("enforces rate limits on repeated requests", async () => {
      const makeReq = () =>
        new Request("http://localhost:3000/api/v1/auth/otp/request", {
          method: "POST",
          body: JSON.stringify({ email: "user@example.com" }),
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "198.51.100.1",
          },
        });

      // Max is 5 per 15 minutes
      for (let i = 0; i < 5; i++) {
        await requestOtpHandler(makeReq());
      }

      const rateLimitedRes = await requestOtpHandler(makeReq());
      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.headers.get("Retry-After")).toBeDefined();

      const json = await rateLimitedRes.json();
      expect(json.error.code).toBe("RATE_LIMITED");
    });
  });

  describe("POST /api/v1/auth/otp/verify", () => {
    it("returns 400 when fields are invalid or missing", async () => {
      const req = new Request("http://localhost:3000/api/v1/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", code: "123" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await verifyOtpHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("BAD_REQUEST");
      expect(json.error.details.some((d: { field: string }) => d.field === "code")).toBe(true);
    });

    it("rejects invalid client platform values", async () => {
      const req = new Request("http://localhost:3000/api/v1/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          code: "123456",
          clientPlatform: "unsupported_os",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await verifyOtpHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.details.some((d: { field: string }) => d.field === "clientPlatform")).toBe(true);
    });

    it("returns 503 DATABASE_UNAVAILABLE when database is unconfigured", async () => {
      if (!process.env.DATABASE_URL) {
        const req = new Request("http://localhost:3000/api/v1/auth/otp/verify", {
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
            code: "123456",
            clientPlatform: "web",
          }),
          headers: { "Content-Type": "application/json" },
        });

        const res = await verifyOtpHandler(req);
        expect(res.status).toBe(503);

        const json = await res.json();
        expect(json.error.code).toBe("DATABASE_UNAVAILABLE");
      }
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("returns 400 when refreshToken is missing or too short", async () => {
      const req = new Request("http://localhost:3000/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: "short" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await refreshHandler(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("BAD_REQUEST");
    });

    it("returns 503 DATABASE_UNAVAILABLE when database is unconfigured", async () => {
      if (!process.env.DATABASE_URL) {
        const req = new Request("http://localhost:3000/api/v1/auth/refresh", {
          method: "POST",
          body: JSON.stringify({
            refreshToken: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
          }),
          headers: { "Content-Type": "application/json" },
        });

        const res = await refreshHandler(req);
        expect(res.status).toBe(503);

        const json = await res.json();
        expect(json.error.code).toBe("DATABASE_UNAVAILABLE");
      }
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    it("returns 401 UNAUTHORIZED when no token is provided", async () => {
      const req = new Request("http://localhost:3000/api/v1/auth/logout", {
        method: "POST",
      });

      const res = await logoutHandler(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 200 with valid Bearer token", async () => {
      const req = new Request("http://localhost:3000/api/v1/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      const res = await logoutHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("Logged out");
    });
  });

  describe("Sessions Endpoints (/api/v1/auth/sessions)", () => {
    it("returns 401 on GET /api/v1/auth/sessions when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/v1/auth/sessions");
      const res = await getSessionsHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns 503 on GET /api/v1/auth/sessions when authenticated but DB unconfigured", async () => {
      if (!process.env.DATABASE_URL) {
        const req = new Request("http://localhost:3000/api/v1/auth/sessions", {
          headers: { Authorization: `Bearer ${validToken}` },
        });
        const res = await getSessionsHandler(req);
        expect(res.status).toBe(503);
      }
    });

    it("returns 401 on POST /api/v1/auth/sessions when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/v1/auth/sessions", {
        method: "POST",
      });
      const res = await postSessionsHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns 401 on POST /api/v1/auth/sessions/revoke-all when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/v1/auth/sessions/revoke-all", {
        method: "POST",
      });
      const res = await revokeAllSessionsHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns 401 on DELETE /api/v1/auth/sessions/[id] when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/v1/auth/sessions/ses_123", {
        method: "DELETE",
      });
      const res = await deleteSessionHandler(req, { params: Promise.resolve({ id: "ses_123" }) });
      expect(res.status).toBe(401);
    });
  });

  describe("Account Endpoints (/api/v1/account)", () => {
    it("returns 401 on GET /api/v1/account when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/v1/account");
      const res = await getAccountHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns 503 on GET /api/v1/account when authenticated but DB unconfigured", async () => {
      if (!process.env.DATABASE_URL) {
        const req = new Request("http://localhost:3000/api/v1/account", {
          headers: { Authorization: `Bearer ${validToken}` },
        });
        const res = await getAccountHandler(req);
        expect(res.status).toBe(503);
      }
    });

    it("returns 401 on DELETE /api/v1/account when unauthenticated", async () => {
      const req = new Request("http://localhost:3000/api/v1/account", {
        method: "DELETE",
      });
      const res = await deleteAccountHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns 503 on DELETE /api/v1/account when authenticated but DB unconfigured", async () => {
      if (!process.env.DATABASE_URL) {
        const req = new Request("http://localhost:3000/api/v1/account", {
          headers: { Authorization: `Bearer ${validToken}` },
        });
        const res = await deleteAccountHandler(req);
        expect(res.status).toBe(503);
      }
    });

    it("deletes account and cascades across all tables returning 200 when authenticated with configured db", async () => {
      vi.spyOn(authServer, "authenticateRequest").mockResolvedValue({
        sub: "acc_test_routes",
        sid: "ses_test_routes",
        email: "test.routes@example.com",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      vi.spyOn(authServer, "deleteAccount").mockResolvedValue(true);

      const req = new Request("http://localhost:3000/api/v1/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const res = await deleteAccountHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("deleted successfully");
    });

    it("returns 404 when account does not exist or was already deleted", async () => {
      vi.spyOn(authServer, "authenticateRequest").mockResolvedValue({
        sub: "acc_nonexistent",
        sid: "ses_nonexistent",
        email: "missing@example.com",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      vi.spyOn(dbClient, "isDatabaseConfigured").mockReturnValue(true);
      vi.spyOn(authServer, "deleteAccount").mockResolvedValue(false);

      const req = new Request("http://localhost:3000/api/v1/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${validToken}` },
      });
      const res = await deleteAccountHandler(req);
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe("NOT_FOUND");
    });
  });
});
