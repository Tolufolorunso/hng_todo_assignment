import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemorySqliteDatabase } from "../db/driver";
import { runMigrations } from "../db/migrations";
import { AuthService } from "./auth";
import { InMemorySecureStorage } from "./secureStore";
import { TaskRepository } from "../storage/taskRepository";
import { NoteRepository } from "../storage/noteRepository";
import { FollowUpRepository } from "../storage/followUpRepository";
import { DailyPlanRepository } from "../storage/dailyPlanRepository";
import { InboxRepository } from "../storage/inboxRepository";
import { SyncRepository } from "../storage/syncRepository";

describe("Mobile AuthService", () => {
  let db: InMemorySqliteDatabase;
  let authService: AuthService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);

    mockFetch = vi.fn();
    authService = new AuthService(db, {
      baseUrl: "https://api.taskflow.test",
      fetchFn: mockFetch as unknown as typeof fetch,
    });
  });

  describe("OTP Authentication Flow", () => {
    it("requests OTP code for valid email", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Code sent", expiresAt: "2026-10-26T07:00:00Z" }),
      });

      const res = await authService.requestOtp("user@example.com");
      expect(res.ok).toBe(true);
      expect(res.message).toBe("Code sent");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.taskflow.test/api/v1/auth/otp/request",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "user@example.com" }),
        })
      );
    });

    it("rejects invalid email address before network request", async () => {
      const res = await authService.requestOtp("invalid-email");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("valid email");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("verifies OTP and stores tokens and user session", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: "access_token_123",
          refreshToken: "refresh_token_456",
          user: { id: "u_1", email: "user@example.com" },
          session: { id: "s_1", expiresAt: "2026-11-26T00:00:00Z" },
        }),
      });

      const res = await authService.verifyOtp("user@example.com", "123456");
      expect(res.ok).toBe(true);
      expect(res.data?.accessToken).toBe("access_token_123");

      const state = authService.getAuthState();
      expect(state.status).toBe("authenticated");
      expect(state.user?.email).toBe("user@example.com");
      expect(state.accessToken).toBe("access_token_123");

      // Verify persistence across restart
      const freshService = new AuthService(db, { baseUrl: "https://api.taskflow.test" });
      const restored = await freshService.initialize();
      expect(restored.status).toBe("authenticated");
      expect(restored.user?.id).toBe("u_1");
    });

    it("refreshes access token with stored refresh token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: "token_1",
          refreshToken: "ref_1",
          user: { id: "u_1", email: "user@example.com" },
          session: { id: "s_1", expiresAt: "2026-11-26T00:00:00Z" },
        }),
      });
      await authService.verifyOtp("user@example.com", "123456");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: "token_2_rotated",
          refreshToken: "ref_2_rotated",
          user: { id: "u_1", email: "user@example.com" },
          session: { id: "s_1", expiresAt: "2026-11-27T00:00:00Z" },
        }),
      });

      const refreshRes = await authService.refreshSession();
      expect(refreshRes.ok).toBe(true);
      expect(refreshRes.data?.accessToken).toBe("token_2_rotated");
      expect(authService.getAuthState().accessToken).toBe("token_2_rotated");
    });

    it("clears credentials on logout", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: "token_logout",
          refreshToken: "ref_logout",
          user: { id: "u_1", email: "user@example.com" },
          session: { id: "s_1", expiresAt: "2026-11-26T00:00:00Z" },
        }),
      });
      await authService.verifyOtp("user@example.com", "123456");

      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
      const logoutRes = await authService.logout();
      expect(logoutRes.ok).toBe(true);

      const state = authService.getAuthState();
      expect(state.status).toBe("unauthenticated");
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
    });

    it("migrates legacy tokens from preferences into secure storage on initialize", async () => {
      await db.execute("INSERT INTO preferences (key, value) VALUES (?, ?)", [
        "auth_access_token",
        "legacy_access_tok",
      ]);
      await db.execute("INSERT INTO preferences (key, value) VALUES (?, ?)", [
        "auth_refresh_token",
        "legacy_refresh_tok",
      ]);
      await db.execute("INSERT INTO preferences (key, value) VALUES (?, ?)", [
        "auth_user",
        JSON.stringify({ id: "legacy_user", email: "legacy@example.com" }),
      ]);

      const secureStore = new InMemorySecureStorage();
      const migratingService = new AuthService(db, {
        baseUrl: "https://api.taskflow.test",
        secureStorage: secureStore,
      });

      const state = await migratingService.initialize();
      expect(state.status).toBe("authenticated");
      expect(state.accessToken).toBe("legacy_access_tok");
      expect(state.refreshToken).toBe("legacy_refresh_tok");

      expect(await secureStore.getItem("auth_access_token")).toBe("legacy_access_tok");
      expect(await secureStore.getItem("auth_refresh_token")).toBe("legacy_refresh_tok");

      const prefAccess = await db.queryFirst<{ value: string }>(
        "SELECT value FROM preferences WHERE key = ?",
        ["auth_access_token"]
      );
      expect(prefAccess).toBeNull();
    });
  });

  describe("Local Data Adoption", () => {
    it("inspects local data and counts items accurately", async () => {
      const taskRepo = new TaskRepository(db);
      const noteRepo = new NoteRepository(db);
      const fuRepo = new FollowUpRepository(db);

      await taskRepo.create({ title: "Local Task 1" });
      await taskRepo.create({ title: "Local Task 2" });
      await noteRepo.create({ title: "Local Note 1", body: "Content" });
      await fuRepo.create({ personName: "Alex", commitment: "Sync up", dueAt: "2026-10-30T10:00:00Z" });

      const summary = await authService.inspectLocalData();
      expect(summary.taskCount).toBe(2);
      expect(summary.noteCount).toBe(1);
      expect(summary.followUpCount).toBe(1);
      expect(summary.planCount).toBe(0);
      expect(summary.inboxCount).toBe(0);
    });

    it("adopts all local entities into outbox mutations for cloud synchronization", async () => {
      const taskRepo = new TaskRepository(db);
      const noteRepo = new NoteRepository(db);
      const fuRepo = new FollowUpRepository(db);
      const planRepo = new DailyPlanRepository(db);
      const inboxRepo = new InboxRepository(db);
      const syncRepo = new SyncRepository(db);

      await taskRepo.create({ title: "Adopt Task" });
      await noteRepo.create({ title: "Adopt Note", body: "Content" });
      await fuRepo.create({ personName: "Sam", commitment: "Check proposal", dueAt: "2026-10-30T10:00:00Z" });
      await planRepo.save({ localDate: "2026-10-27", timeZone: "UTC", items: [], availableMinutes: 480 });
      await inboxRepo.create({ text: "Quick capture to adopt" });

      const res = await authService.adoptLocalData();
      expect(res.adoptedCount).toBe(6); // 1 task + 1 note + 1 fu + 1 occurrence + 1 plan + 1 inbox = 6 mutations

      const outbox = await syncRepo.listOutbox();
      expect(outbox).toHaveLength(6);
      const types = outbox.map((o) => o.entityType);
      expect(types).toContain("task");
      expect(types).toContain("note");
      expect(types).toContain("followup");
      expect(types).toContain("occurrence");
      expect(types).toContain("plan");
      expect(types).toContain("inbox");
    });
  });
});
