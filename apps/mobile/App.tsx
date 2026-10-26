import React, { useState, useEffect } from "react";
import { createDatabase, runMigrations } from "./src/db/index.js";
import {
  TaskRepository,
  NoteRepository,
  FollowUpRepository,
  DailyPlanRepository,
  InboxRepository,
  SyncRepository,
} from "./src/storage/index.js";
import {
  SearchService,
  BackupService,
  InboxTriageService,
  AuthService,
  SyncEngine,
  LifecycleService,
  ThemeProvider,
} from "./src/services/index.js";
import { MobileNavigator } from "./src/navigation/Navigator.js";

export function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [services, setServices] = useState<{
    taskRepo: TaskRepository;
    noteRepo: NoteRepository;
    followUpRepo: FollowUpRepository;
    dailyPlanRepo: DailyPlanRepository;
    inboxRepo: InboxRepository;
    triageService: InboxTriageService;
    searchService: SearchService;
    backupService: BackupService;
    authService: AuthService;
    syncEngine: SyncEngine;
    syncRepo: SyncRepository;
  } | null>(null);

  useEffect(() => {
    let lifecycleService: LifecycleService | null = null;

    async function initializeApp() {
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

        lifecycleService = new LifecycleService(authService, syncEngine);
        lifecycleService.start();

        setServices({
          taskRepo,
          noteRepo,
          followUpRepo,
          dailyPlanRepo,
          inboxRepo,
          triageService,
          searchService,
          backupService,
          authService,
          syncEngine,
          syncRepo,
        });
        setIsReady(true);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : "Failed to initialize mobile database");
      }
    }

    initializeApp();

    return () => {
      lifecycleService?.stop();
    };
  }, []);

  if (initError) {
    return (
      <div
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#09090b",
          color: "#fecaca",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>
          Database Initialization Error
        </div>
        <div style={{ fontSize: "14px", color: "#f87171" }}>{initError}</div>
      </div>
    );
  }

  if (!isReady || !services) {
    return (
      <div
        role="status"
        aria-label="Loading TaskFlow Mobile"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#09090b",
          color: "#a1a1aa",
          fontSize: "16px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "16px" }}>✓</div>
        <div>Loading TaskFlow...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          backgroundColor: "#000000",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <MobileNavigator
          taskRepo={services.taskRepo}
          noteRepo={services.noteRepo}
          followUpRepo={services.followUpRepo}
          dailyPlanRepo={services.dailyPlanRepo}
          inboxRepo={services.inboxRepo}
          triageService={services.triageService}
          searchService={services.searchService}
          backupService={services.backupService}
          authService={services.authService}
          syncEngine={services.syncEngine}
          syncRepo={services.syncRepo}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
