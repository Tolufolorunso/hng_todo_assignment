import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { createDatabase, runMigrations } from "../db/index";
import {
  TaskRepository,
  NoteRepository,
  FollowUpRepository,
  DailyPlanRepository,
  InboxRepository,
  SyncRepository,
} from "../storage/index";
import {
  SearchService,
  BackupService,
  InboxTriageService,
  AuthService,
  SyncEngine,
  LifecycleService,
} from "../services/index";

export interface AppServices {
  taskRepo: TaskRepository;
  noteRepo: NoteRepository;
  followUpRepo: FollowUpRepository;
  dailyPlanRepo: DailyPlanRepository;
  inboxRepo: InboxRepository;
  syncRepo: SyncRepository;
  triageService: InboxTriageService;
  searchService: SearchService;
  backupService: BackupService;
  authService: AuthService;
  syncEngine: SyncEngine;
  lifecycleService?: LifecycleService;
}

export interface AppServicesContextValue {
  services: AppServices | null;
  isReady: boolean;
  initError: string | null;
  refreshKey: number;
  notifyDataChanged: () => void;
}

const AppServicesContext = createContext<AppServicesContextValue | null>(null);

export interface AppServicesProviderProps {
  children: React.ReactNode;
  initialServices?: AppServices;
}

export function AppServicesProvider({
  children,
  initialServices,
}: AppServicesProviderProps): React.JSX.Element {
  const [services, setServices] = useState<AppServices | null>(initialServices ?? null);
  const [isReady, setIsReady] = useState(Boolean(initialServices));
  const [initError, setInitError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const notifyDataChanged = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (initialServices) {
      setServices(initialServices);
      setIsReady(true);
      return;
    }

    let lifecycle: LifecycleService | null = null;
    let cancelled = false;

    async function init() {
      try {
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

        lifecycle = new LifecycleService(authService, syncEngine);
        lifecycle.start();

        if (!cancelled) {
          setServices({
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
            lifecycleService: lifecycle,
          });
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setInitError(err instanceof Error ? err.message : "Failed to initialize mobile database");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      lifecycle?.stop();
    };
  }, [initialServices]);

  const value = useMemo<AppServicesContextValue>(
    () => ({
      services,
      isReady,
      initError,
      refreshKey,
      notifyDataChanged,
    }),
    [services, isReady, initError, refreshKey, notifyDataChanged]
  );

  return (
    <AppServicesContext.Provider value={value}>
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServices(): AppServices {
  const context = useContext(AppServicesContext);
  if (!context) {
    throw new Error("useAppServices must be used within an AppServicesProvider");
  }
  if (!context.services) {
    throw new Error("App services are not initialized yet");
  }
  return context.services;
}

export function useAppServicesState(): AppServicesContextValue {
  const context = useContext(AppServicesContext);
  if (!context) {
    throw new Error("useAppServicesState must be used within an AppServicesProvider");
  }
  return context;
}
