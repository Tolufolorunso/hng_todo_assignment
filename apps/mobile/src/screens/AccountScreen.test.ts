import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemorySqliteDatabase } from "../db/driver.js";
import { runMigrations } from "../db/migrations.js";
import { AuthService } from "../services/auth.js";
import { SyncEngine } from "../services/syncEngine.js";
import { SyncRepository } from "../storage/syncRepository.js";
import { AccountScreen } from "./AccountScreen.js";
import { InMemorySecureStorage } from "../services/secureStore.js";
import { TaskRepository } from "../storage/taskRepository.js";
import { NoteRepository } from "../storage/noteRepository.js";
import { FollowUpRepository } from "../storage/followUpRepository.js";

describe("AccountScreen and Account Workflows", () => {
  let db: InMemorySqliteDatabase;
  let authService: AuthService;
  let syncRepo: SyncRepository;
  let syncEngine: SyncEngine;
  let secureStore: InMemorySecureStorage;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);

    mockFetch = vi.fn();
    secureStore = new InMemorySecureStorage();
    authService = new AuthService(db, {
      baseUrl: "https://api.taskflow.test",
      fetchFn: mockFetch as unknown as typeof fetch,
      secureStorage: secureStore,
    });
    await authService.initialize();

    syncRepo = new SyncRepository(db);
    syncEngine = new SyncEngine(db, authService, {
      baseUrl: "https://api.taskflow.test",
      fetchFn: mockFetch as unknown as typeof fetch,
    });
  });

  it("exports pure React Native AccountScreen component function", () => {
    expect(typeof AccountScreen).toBe("function");
    expect(AccountScreen.name).toBe("AccountScreen");
  });

  describe("OTP Authentication Workflow", () => {
    it("requests OTP and updates status on verify", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Code sent", expiresAt: "2026-10-26T12:00:00Z" }),
      });

      const reqRes = await authService.requestOtp("user@example.com");
      expect(reqRes.ok).toBe(true);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: "jwt_tok_123",
          refreshToken: "jwt_ref_456",
          user: { id: "u_screen_1", email: "user@example.com" },
          session: { id: "s_screen_1", expiresAt: "2026-11-26T00:00:00Z" },
        }),
      });

      const verifyRes = await authService.verifyOtp("user@example.com", "123456");
      expect(verifyRes.ok).toBe(true);

      const state = authService.getAuthState();
      expect(state.status).toBe("authenticated");
      expect(state.user?.email).toBe("user@example.com");
      expect(await secureStore.getItem("auth_access_token")).toBe("jwt_tok_123");
    });
  });

  describe("Session Management Workflow", () => {
    it("lists active sessions and revokes specific non-current session", async () => {
      await secureStore.setItem("auth_access_token", "active_tok");
      await db.execute("INSERT INTO preferences (key, value) VALUES (?, ?)", [
        "auth_user",
        JSON.stringify({ id: "u_1", email: "user@example.com" }),
      ]);
      await authService.initialize();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessions: [
            { id: "s_current", isCurrent: true, expiresAt: "2026-11-26T00:00:00Z" },
            { id: "s_remote", isCurrent: false, expiresAt: "2026-11-20T00:00:00Z" },
          ],
        }),
      });

      const listRes = await authService.listSessions();
      expect(listRes.ok).toBe(true);
      expect(listRes.sessions).toHaveLength(2);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const revokeRes = await authService.revokeSession("s_remote");
      expect(revokeRes.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.taskflow.test/api/v1/auth/sessions/s_remote",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({ Authorization: "Bearer active_tok" }),
        })
      );
    });
  });

  describe("Local Data Adoption Workflow", () => {
    it("inspects local data and enqueues outbox mutations on adoption", async () => {
      const taskRepo = new TaskRepository(db);
      const noteRepo = new NoteRepository(db);
      const fuRepo = new FollowUpRepository(db);

      await taskRepo.create({ title: "Local Adoption Task" });
      await noteRepo.create({ title: "Local Adoption Note", body: "Note content" });
      await fuRepo.create({
        personName: "Jordan",
        commitment: "Review sync engine",
        dueAt: "2026-10-31T09:00:00Z",
      });

      const summary = await authService.inspectLocalData();
      expect(summary.taskCount).toBe(1);
      expect(summary.noteCount).toBe(1);
      expect(summary.followUpCount).toBe(1);

      const adoptRes = await authService.adoptLocalData();
      expect(adoptRes.adoptedCount).toBe(4); // 1 task + 1 note + 1 fu + 1 occurrence

      const outbox = await syncRepo.listOutbox();
      expect(outbox).toHaveLength(4);
      expect(outbox.some((o) => o.entityType === "task")).toBe(true);
      expect(outbox.some((o) => o.entityType === "note")).toBe(true);
      expect(outbox.some((o) => o.entityType === "followup")).toBe(true);
    });
  });

  describe("Account Deletion Workflow", () => {
    it("deletes cloud account and clears local credentials", async () => {
      await secureStore.setItem("auth_access_token", "del_tok");
      await db.execute("INSERT INTO preferences (key, value) VALUES (?, ?)", [
        "auth_user",
        JSON.stringify({ id: "u_del", email: "del@example.com" }),
      ]);
      await authService.initialize();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

      const delRes = await authService.deleteAccount();
      expect(delRes.ok).toBe(true);

      const state = authService.getAuthState();
      expect(state.status).toBe("unauthenticated");
      expect(state.user).toBeNull();
      expect(await secureStore.getItem("auth_access_token")).toBeNull();
    });
  });
});
