import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredAuth,
  deleteAccount,
  fetchAccount,
  getStoredAccessToken,
  getStoredAuthUser,
  listSessions,
  logout,
  refreshSession,
  requestOtp,
  revokeAllOtherSessions,
  revokeSession,
  setStoredAccessToken,
  setStoredAuthUser,
  verifyOtp,
} from "@/lib/auth";

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
}

describe("web authentication client", () => {
  beforeEach(() => {
    const sessionMock = createStorageMock();
    const localMock = createStorageMock();
    vi.stubGlobal("sessionStorage", sessionMock);
    vi.stubGlobal("localStorage", localMock);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("storage utilities", () => {
    it("stores and retrieves access tokens across session and local storage", () => {
      expect(getStoredAccessToken()).toBeNull();
      setStoredAccessToken("test_token_123");
      expect(getStoredAccessToken()).toBe("test_token_123");
      clearStoredAuth();
      expect(getStoredAccessToken()).toBeNull();
    });

    it("stores and retrieves auth user", () => {
      expect(getStoredAuthUser()).toBeNull();
      const user = { id: "u_1", email: "user@example.com" };
      setStoredAuthUser(user);
      expect(getStoredAuthUser()).toEqual(user);
      clearStoredAuth();
      expect(getStoredAuthUser()).toBeNull();
    });
  });

  describe("requestOtp", () => {
    it("successfully requests OTP for a valid email", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: "Verification code sent",
            expiresAt: "2026-10-25T20:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const res = await requestOtp("Test@Example.Com ");
      expect(res.ok).toBe(true);
      expect(res.message).toBe("Verification code sent");
      expect(fetchSpy).toHaveBeenCalledWith("/api/v1/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });
    });

    it("returns error message when server responds with 400", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: "Invalid email format" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        )
      );

      const res = await requestOtp("invalid");
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Invalid email format");
    });

    it("handles fetch network failure gracefully", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Failed to fetch"));

      const res = await requestOtp("user@example.com");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Network error");
    });
  });

  describe("verifyOtp", () => {
    it("successfully verifies OTP and stores session", async () => {
      const mockPayload = {
        accessToken: "access_token_abc",
        tokenType: "Bearer",
        expiresIn: 900,
        session: { id: "sess_1", expiresAt: "2026-11-25T00:00:00.000Z" },
        user: { id: "usr_1", email: "user@example.com" },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await verifyOtp("user@example.com", "123456");
      expect(res.ok).toBe(true);
      expect(res.data).toEqual(mockPayload);
      expect(getStoredAccessToken()).toBe("access_token_abc");
      expect(getStoredAuthUser()).toEqual({ id: "usr_1", email: "user@example.com" });
    });

    it("returns error on invalid or expired code", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: "Invalid or expired code" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      );

      const res = await verifyOtp("user@example.com", "000000");
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Invalid or expired code");
    });
  });

  describe("refreshSession", () => {
    it("refreshes access token and updates storage", async () => {
      const mockPayload = {
        accessToken: "new_token_456",
        tokenType: "Bearer",
        expiresIn: 900,
        session: { id: "sess_1", expiresAt: "2026-11-25T00:00:00.000Z" },
        user: { id: "usr_1", email: "user@example.com" },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await refreshSession();
      expect(res.ok).toBe(true);
      expect(res.data?.accessToken).toBe("new_token_456");
      expect(getStoredAccessToken()).toBe("new_token_456");
    });

    it("clears storage when refresh returns 401", async () => {
      setStoredAccessToken("old_token");
      setStoredAuthUser({ id: "usr_1", email: "user@example.com" });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: "Refresh token expired" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      );

      const res = await refreshSession();
      expect(res.ok).toBe(false);
      expect(getStoredAccessToken()).toBeNull();
      expect(getStoredAuthUser()).toBeNull();
    });
  });

  describe("logout", () => {
    it("calls logout endpoint and clears local storage", async () => {
      setStoredAccessToken("token_to_clear");
      setStoredAuthUser({ id: "usr_1", email: "user@example.com" });

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Logged out" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await logout();
      expect(res.ok).toBe(true);
      expect(getStoredAccessToken()).toBeNull();
      expect(getStoredAuthUser()).toBeNull();
      expect(fetchSpy).toHaveBeenCalledWith("/api/v1/auth/logout", {
        method: "POST",
        headers: { Authorization: "Bearer token_to_clear" },
      });
    });
  });

  describe("account & sessions", () => {
    it("fetches account information", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            account: {
              id: "acc_1",
              email: "user@example.com",
              createdAt: "2026-10-01T00:00:00.000Z",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const res = await fetchAccount("tok_123");
      expect(res.ok).toBe(true);
      expect(res.account?.id).toBe("acc_1");
    });

    it("lists sessions and revokes a session", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              currentSessionId: "s1",
              sessions: [
                {
                  id: "s1",
                  clientLabel: "Chrome",
                  createdAt: "now",
                  expiresAt: "later",
                  lastActiveAt: "now",
                  isCurrent: true,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: "Session revoked" }), { status: 200 })
        );

      const listRes = await listSessions("tok_123");
      expect(listRes.ok).toBe(true);
      expect(listRes.sessions).toHaveLength(1);

      const revokeRes = await revokeSession("s1", "tok_123");
      expect(revokeRes.ok).toBe(true);
    });

    it("revokes all other sessions", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Revoked", revokedCount: 3 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const res = await revokeAllOtherSessions("tok_123");
      expect(res.ok).toBe(true);
      expect(res.revokedCount).toBe(3);
    });

    it("deletes account and clears storage", async () => {
      setStoredAccessToken("tok_123");
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Account deleted" }), { status: 200 })
      );

      const res = await deleteAccount("tok_123");
      expect(res.ok).toBe(true);
      expect(getStoredAccessToken()).toBeNull();
    });
  });
});
