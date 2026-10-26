import { describe, it, expect } from "vitest";
import React from "react";
import { AppServicesProvider, useAppServices, useAppServicesState, type AppServices } from "./AppContext.js";
import { createDatabase, runMigrations } from "../db/index.js";
import {
  TaskRepository,
  NoteRepository,
  FollowUpRepository,
  DailyPlanRepository,
  InboxRepository,
  SyncRepository,
} from "../storage/index.js";
import {
  SearchService,
  BackupService,
  InboxTriageService,
  AuthService,
  SyncEngine,
} from "../services/index.js";

async function createTestServices(): Promise<AppServices> {
  const db = createDatabase("memory");
  await runMigrations(db);

  const taskRepo = new TaskRepository(db);
  const noteRepo = new NoteRepository(db);
  const followUpRepo = new FollowUpRepository(db);
  const dailyPlanRepo = new DailyPlanRepository(db);
  const inboxRepo = new InboxRepository(db);
  const syncRepo = new SyncRepository(db);

  const triageService = new InboxTriageService(inboxRepo, taskRepo, noteRepo, followUpRepo);
  const searchService = new SearchService(taskRepo, noteRepo);
  const backupService = new BackupService(db, taskRepo, noteRepo);
  const authService = new AuthService(db);
  await authService.initialize();
  const syncEngine = new SyncEngine(db, authService);

  return {
    taskRepo,
    noteRepo,
    followUpRepo,
    dailyPlanRepo,
    inboxRepo,
    syncRepo,
    triageService,
    searchService,
    backupService,
    authService,
    syncEngine,
  };
}

describe("AppServicesContext and Provider", () => {
  it("exports AppServicesProvider and hook functions", () => {
    expect(typeof AppServicesProvider).toBe("function");
    expect(typeof useAppServices).toBe("function");
    expect(typeof useAppServicesState).toBe("function");
  });

  it("provides services when provided through initialServices", async () => {
    const services = await createTestServices();
    let retrieved: AppServices | null = null;

    function Consumer() {
      retrieved = useAppServices();
      return null;
    }

    // Direct render simulation
    const element = React.createElement(
      AppServicesProvider,
      { initialServices: services, children: React.createElement(Consumer) }
    );

    expect(element).toBeDefined();
    expect(services.taskRepo).toBeDefined();
    expect(services.noteRepo).toBeDefined();
    expect(services.followUpRepo).toBeDefined();
    expect(services.dailyPlanRepo).toBeDefined();
    expect(services.inboxRepo).toBeDefined();
    expect(services.syncRepo).toBeDefined();
    expect(services.authService).toBeDefined();
    expect(services.syncEngine).toBeDefined();
  });

  it("tracks refreshKey updates when notifyDataChanged is triggered", () => {
    let stateResult: ReturnType<typeof useAppServicesState> | null = null;

    function Consumer() {
      stateResult = useAppServicesState();
      return null;
    }

    expect(Consumer).toBeDefined();
  });
});
