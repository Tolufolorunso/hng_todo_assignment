import type { SqliteDatabase } from "../db/driver";
import type {
  AuthUser,
  SessionInfo,
  VerifyOtpResponse,
  AccountInfo,
  MobileAuthState,
  AdoptionSummary,
} from "../types/auth";
import { SyncRepository } from "../storage/syncRepository";
import { TaskRepository } from "../storage/taskRepository";
import { NoteRepository } from "../storage/noteRepository";
import { FollowUpRepository } from "../storage/followUpRepository";
import { DailyPlanRepository } from "../storage/dailyPlanRepository";
import { InboxRepository } from "../storage/inboxRepository";
import { type SecureStorageDriver, defaultSecureStorage } from "./secureStore";

export interface AuthServiceConfig {
  baseUrl?: string;
  fetchFn?: typeof fetch;
  secureStorage?: SecureStorageDriver;
}

export class AuthService {
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private secureStorage: SecureStorageDriver;
  private listeners: Set<(state: MobileAuthState) => void> = new Set();
  private cachedState: MobileAuthState = {
    user: null,
    session: null,
    accessToken: null,
    refreshToken: null,
    status: "idle",
  };

  constructor(
    private db: SqliteDatabase,
    config: AuthServiceConfig = {}
  ) {
    this.baseUrl = config.baseUrl || "";
    this.fetchFn = config.fetchFn || (typeof fetch !== "undefined" ? fetch.bind(globalThis) : (async () => { throw new Error("fetch unavailable"); }));
    this.secureStorage = config.secureStorage || defaultSecureStorage;
  }

  async initialize(): Promise<MobileAuthState> {
    let accessToken = await this.secureStorage.getItem("auth_access_token");
    let refreshToken = await this.secureStorage.getItem("auth_refresh_token");

    if (!accessToken) {
      const legacyToken = await this.getPref("auth_access_token");
      if (legacyToken) {
        accessToken = legacyToken;
        await this.secureStorage.setItem("auth_access_token", legacyToken);
        await this.setPref("auth_access_token", null);
      }
    }
    if (!refreshToken) {
      const legacyRefresh = await this.getPref("auth_refresh_token");
      if (legacyRefresh) {
        refreshToken = legacyRefresh;
        await this.secureStorage.setItem("auth_refresh_token", legacyRefresh);
        await this.setPref("auth_refresh_token", null);
      }
    }

    const userJson = await this.getPref("auth_user");
    const sessionJson = await this.getPref("auth_session");

    if (accessToken && userJson) {
      try {
        const user = JSON.parse(userJson) as AuthUser;
        const session = sessionJson ? (JSON.parse(sessionJson) as SessionInfo) : null;
        this.cachedState = {
          user,
          session,
          accessToken,
          refreshToken,
          status: "authenticated",
        };
      } catch {
        await this.clearStoredAuth();
        this.cachedState = {
          user: null,
          session: null,
          accessToken: null,
          refreshToken: null,
          status: "unauthenticated",
        };
      }
    } else {
      this.cachedState = {
        user: null,
        session: null,
        accessToken: null,
        refreshToken: null,
        status: "unauthenticated",
      };
    }

    this.notify();
    return this.cachedState;
  }

  getAuthState(): MobileAuthState {
    return { ...this.cachedState };
  }

  subscribe(listener: (state: MobileAuthState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAuthState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getAuthState();
    for (const l of this.listeners) {
      l(state);
    }
  }

  private async getPref(key: string): Promise<string | null> {
    const row = await this.db.queryFirst<{ value: string }>(
      "SELECT value FROM preferences WHERE key = ?",
      [key]
    );
    return row ? row.value : null;
  }

  private async setPref(key: string, value: string | null): Promise<void> {
    if (value === null) {
      await this.db.execute("DELETE FROM preferences WHERE key = ?", [key]);
    } else {
      const existing = await this.getPref(key);
      if (existing !== null) {
        await this.db.execute("UPDATE preferences SET value = ? WHERE key = ?", [value, key]);
      } else {
        await this.db.execute("INSERT INTO preferences (key, value) VALUES (?, ?)", [key, value]);
      }
    }
  }

  private async clearStoredAuth(): Promise<void> {
    await this.secureStorage.deleteItem("auth_access_token");
    await this.secureStorage.deleteItem("auth_refresh_token");
    await this.setPref("auth_access_token", null);
    await this.setPref("auth_refresh_token", null);
    await this.setPref("auth_user", null);
    await this.setPref("auth_session", null);
    this.cachedState = {
      user: null,
      session: null,
      accessToken: null,
      refreshToken: null,
      status: "unauthenticated",
    };
    this.notify();
  }

  async requestOtp(email: string): Promise<{ ok: boolean; message?: string; expiresAt?: string; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { ok: false, error: "Please enter a valid email address" };
    }

    try {
      const res = await this.fetchFn(`${this.baseUrl}/api/v1/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const errorMsg =
          (typeof body.detail === "string" && body.detail) ||
          (typeof body.message === "string" && body.message) ||
          (typeof body.error === "string" && body.error) ||
          "Failed to request verification code";
        return { ok: false, error: errorMsg };
      }

      return {
        ok: true,
        message: typeof body.message === "string" ? body.message : undefined,
        expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : undefined,
      };
    } catch {
      return { ok: false, error: "Network error. Please check your connection." };
    }
  }

  async verifyOtp(
    email: string,
    code: string
  ): Promise<{ ok: boolean; data?: VerifyOtpResponse; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanCode) {
      return { ok: false, error: "Please enter the verification code" };
    }

    try {
      const res = await this.fetchFn(`${this.baseUrl}/api/v1/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
      });

      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        const errorMsg =
          (typeof body.detail === "string" && body.detail) ||
          (typeof body.message === "string" && body.message) ||
          (typeof body.error === "string" && body.error) ||
          "Invalid or expired verification code";
        return { ok: false, error: errorMsg };
      }

      const data = body as unknown as VerifyOtpResponse;
      await this.secureStorage.setItem("auth_access_token", data.accessToken);
      if (data.refreshToken) {
        await this.secureStorage.setItem("auth_refresh_token", data.refreshToken);
      }
      await this.setPref("auth_access_token", null);
      await this.setPref("auth_refresh_token", null);
      await this.setPref("auth_user", JSON.stringify(data.user));
      await this.setPref("auth_session", JSON.stringify(data.session));

      this.cachedState = {
        user: data.user,
        session: data.session,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        status: "authenticated",
      };
      this.notify();

      return { ok: true, data };
    } catch {
      return { ok: false, error: "Network error. Please check your connection." };
    }
  }

  async refreshSession(): Promise<{ ok: boolean; data?: VerifyOtpResponse; error?: string }> {
    const refreshToken = this.cachedState.refreshToken || (await this.secureStorage.getItem("auth_refresh_token")) || (await this.getPref("auth_refresh_token"));
    if (!refreshToken) {
      await this.clearStoredAuth();
      return { ok: false, error: "No refresh token available" };
    }

    try {
      const res = await this.fetchFn(`${this.baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        await this.clearStoredAuth();
        const errorMsg =
          (typeof body.detail === "string" && body.detail) ||
          (typeof body.message === "string" && body.message) ||
          (typeof body.error === "string" && body.error) ||
          "Session expired. Please sign in again.";
        return { ok: false, error: errorMsg };
      }

      const data = body as unknown as VerifyOtpResponse;
      await this.secureStorage.setItem("auth_access_token", data.accessToken);
      await this.setPref("auth_access_token", null);
      if (data.refreshToken) {
        await this.secureStorage.setItem("auth_refresh_token", data.refreshToken);
        await this.setPref("auth_refresh_token", null);
      }
      if (data.user) {
        await this.setPref("auth_user", JSON.stringify(data.user));
      }
      if (data.session) {
        await this.setPref("auth_session", JSON.stringify(data.session));
      }

      this.cachedState = {
        user: data.user || this.cachedState.user,
        session: data.session || this.cachedState.session,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || this.cachedState.refreshToken,
        status: "authenticated",
      };
      this.notify();

      return { ok: true, data };
    } catch {
      return { ok: false, error: "Network error during token refresh" };
    }
  }

  async logout(): Promise<{ ok: boolean; error?: string }> {
    const token = this.cachedState.accessToken;
    if (token) {
      try {
        await this.fetchFn(`${this.baseUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      } catch {
        // Ignore network errors on logout
      }
    }

    await this.clearStoredAuth();
    return { ok: true };
  }

  async listSessions(): Promise<{ ok: boolean; sessions?: SessionInfo[]; error?: string }> {
    const token = this.cachedState.accessToken;
    if (!token) return { ok: false, error: "Unauthenticated" };

    try {
      const res = await this.fetchFn(`${this.baseUrl}/api/v1/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return { ok: false, error: (body.message as string) || "Failed to list sessions" };
      }
      return { ok: true, sessions: (body.sessions as SessionInfo[]) || [] };
    } catch {
      return { ok: false, error: "Network error fetching sessions" };
    }
  }

  async revokeSession(sessionId: string): Promise<{ ok: boolean; error?: string }> {
    const token = this.cachedState.accessToken;
    if (!token) return { ok: false, error: "Unauthenticated" };

    try {
      const res = await this.fetchFn(`${this.baseUrl}/api/v1/auth/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return { ok: false, error: "Failed to revoke session" };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error revoking session" };
    }
  }

  async getAccount(): Promise<{ ok: boolean; account?: AccountInfo; error?: string }> {
    const token = this.cachedState.accessToken;
    if (!token) return { ok: false, error: "Unauthenticated" };

    try {
      const res = await this.fetchFn(`${this.baseUrl}/api/v1/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return { ok: false, error: (body.message as string) || "Failed to get account details" };
      }
      return { ok: true, account: body.account as AccountInfo };
    } catch {
      return { ok: false, error: "Network error getting account details" };
    }
  }

  async deleteAccount(): Promise<{ ok: boolean; error?: string }> {
    const token = this.cachedState.accessToken;
    if (!token) return { ok: false, error: "Unauthenticated" };

    try {
      const res = await this.fetchFn(`${this.baseUrl}/api/v1/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return { ok: false, error: "Failed to delete account" };
      }
      await this.clearStoredAuth();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error deleting account" };
    }
  }

  async inspectLocalData(): Promise<AdoptionSummary> {
    const taskRepo = new TaskRepository(this.db);
    const noteRepo = new NoteRepository(this.db);
    const followUpRepo = new FollowUpRepository(this.db);
    const dailyPlanRepo = new DailyPlanRepository(this.db);
    const inboxRepo = new InboxRepository(this.db);

    const tasks = await taskRepo.list();
    const notes = await noteRepo.list();
    const followups = await followUpRepo.list();
    const plans = await dailyPlanRepo.listRecent(100);
    const inbox = await inboxRepo.list();

    return {
      taskCount: tasks.length,
      noteCount: notes.length,
      followUpCount: followups.length,
      planCount: plans.length,
      inboxCount: inbox.length,
    };
  }

  async adoptLocalData(): Promise<{ adoptedCount: number }> {
    const syncRepo = new SyncRepository(this.db);
    const taskRepo = new TaskRepository(this.db);
    const noteRepo = new NoteRepository(this.db);
    const followUpRepo = new FollowUpRepository(this.db);
    const dailyPlanRepo = new DailyPlanRepository(this.db);
    const inboxRepo = new InboxRepository(this.db);

    const tasks = await taskRepo.list();
    const notes = await noteRepo.list();
    const followups = await followUpRepo.list();
    const plans = await dailyPlanRepo.listRecent(100);
    const inbox = await inboxRepo.list();

    let adoptedCount = 0;

    await this.db.transaction(async (tx) => {
      for (const t of tasks) {
        await syncRepo.enqueueOutbox({
          entityType: "task",
          entityId: t.id,
          action: "put",
          payload: JSON.stringify(t),
        }, tx);
        adoptedCount++;
      }

      for (const n of notes) {
        await syncRepo.enqueueOutbox({
          entityType: "note",
          entityId: n.id,
          action: "put",
          payload: JSON.stringify(n),
        }, tx);
        adoptedCount++;
      }

      for (const f of followups) {
        await syncRepo.enqueueOutbox({
          entityType: "followup",
          entityId: f.id,
          action: "put",
          payload: JSON.stringify(f),
        }, tx);
        adoptedCount++;

        const occs = await followUpRepo.getOccurrences(f.id);
        for (const o of occs) {
          await syncRepo.enqueueOutbox({
            entityType: "occurrence",
            entityId: o.id,
            action: "put",
            payload: JSON.stringify(o),
          }, tx);
          adoptedCount++;
        }
      }

      for (const p of plans) {
        await syncRepo.enqueueOutbox({
          entityType: "plan",
          entityId: p.id,
          action: "put",
          payload: JSON.stringify(p),
        }, tx);
        adoptedCount++;
      }

      for (const i of inbox) {
        await syncRepo.enqueueOutbox({
          entityType: "inbox",
          entityId: i.id,
          action: "put",
          payload: JSON.stringify(i),
        }, tx);
        adoptedCount++;
      }
    });

    return { adoptedCount };
  }
}
