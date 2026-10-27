import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemorySqliteDatabase } from "../db/driver";
import { runMigrations } from "../db/migrations";
import { LifecycleService } from "./lifecycle";
import { AuthService } from "./auth";
import { SyncEngine } from "./syncEngine";

describe("Mobile LifecycleService", () => {
  let db: InMemorySqliteDatabase;
  let authService: AuthService;
  let syncEngine: SyncEngine;
  let lifecycle: LifecycleService;
  let syncOnceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    db = new InMemorySqliteDatabase();
    await runMigrations(db);

    authService = new AuthService(db);
    syncEngine = new SyncEngine(db, authService);
    syncOnceSpy = vi.spyOn(syncEngine, "syncOnce").mockResolvedValue({
      success: true,
      pushed: 0,
      pulled: 0,
      conflicts: 0,
    });

    lifecycle = new LifecycleService(authService, syncEngine);
  });

  it("starts in active and online state", () => {
    expect(lifecycle.getCurrentState()).toBe("active");
    expect(lifecycle.getIsOnline()).toBe(true);
  });

  it("triggers sync when transitioning from background to active (foreground recovery)", async () => {
    // Authenticate authService state
    vi.spyOn(authService, "getAuthState").mockReturnValue({
      user: { id: "u1", email: "test@taskflow.dev" },
      session: { id: "s1", expiresAt: "2026-11-01T00:00:00Z" },
      accessToken: "token_mock",
      refreshToken: "ref_mock",
      status: "authenticated",
    });

    await lifecycle.handleStateChange("background");
    expect(syncOnceSpy).not.toHaveBeenCalled();

    await lifecycle.handleStateChange("active");
    expect(syncOnceSpy).toHaveBeenCalledTimes(1);
  });

  it("triggers sync when transitioning from offline to online (network recovery)", async () => {
    vi.spyOn(authService, "getAuthState").mockReturnValue({
      user: { id: "u1", email: "test@taskflow.dev" },
      session: { id: "s1", expiresAt: "2026-11-01T00:00:00Z" },
      accessToken: "token_mock",
      refreshToken: "ref_mock",
      status: "authenticated",
    });

    await lifecycle.handleNetworkChange(false);
    expect(syncOnceSpy).not.toHaveBeenCalled();

    await lifecycle.handleNetworkChange(true);
    expect(syncOnceSpy).toHaveBeenCalledTimes(1);
  });
});
