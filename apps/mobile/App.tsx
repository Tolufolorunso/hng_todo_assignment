import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
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
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorTitle}>Database Initialization Error</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
      </SafeAreaView>
    );
  }

  if (!isReady || !services) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.brandIcon}>✓</Text>
        <Text style={styles.brandTitle}>TaskFlow</Text>
        <ActivityIndicator size="small" color="#3b82f6" style={styles.spinner} />
      </SafeAreaView>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaView style={styles.rootContainer}>
        <StatusBar barStyle="light-content" />
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
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#09090b",
    alignItems: "center",
    justifyContent: "center",
  },
  brandIcon: {
    fontSize: 40,
    color: "#3b82f6",
    fontWeight: "bold",
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 16,
  },
  spinner: {
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#09090b",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fecaca",
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#f87171",
    textAlign: "center",
  },
});

export default App;
