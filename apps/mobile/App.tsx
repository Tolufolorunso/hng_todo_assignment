import React, { useState, useEffect } from "react";
import { createDatabase, runMigrations } from "./src/db/index.js";
import { TaskRepository, NoteRepository } from "./src/storage/index.js";
import { SearchService, BackupService } from "./src/services/index.js";
import { MobileNavigator } from "./src/navigation/Navigator.js";

export function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [services, setServices] = useState<{
    taskRepo: TaskRepository;
    noteRepo: NoteRepository;
    searchService: SearchService;
    backupService: BackupService;
  } | null>(null);

  useEffect(() => {
    async function initializeApp() {
      try {
        const db = createDatabase("memory");
        await runMigrations(db);

        const taskRepo = new TaskRepository(db);
        const noteRepo = new NoteRepository(db);
        const searchService = new SearchService(taskRepo, noteRepo);
        const backupService = new BackupService(db, taskRepo, noteRepo);

        setServices({
          taskRepo,
          noteRepo,
          searchService,
          backupService,
        });
        setIsReady(true);
      } catch (err) {
        setInitError(err instanceof Error ? err.message : "Failed to initialize mobile database");
      }
    }

    initializeApp();
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
        searchService={services.searchService}
        backupService={services.backupService}
      />
    </div>
  );
}

export default App;
