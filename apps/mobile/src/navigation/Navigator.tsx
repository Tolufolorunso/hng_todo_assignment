import React, { useState } from "react";
import type { MobileScreen, MobileTab } from "../types/navigation.js";
import type { TaskRepository } from "../storage/taskRepository.js";
import type { NoteRepository } from "../storage/noteRepository.js";
import type { SearchService } from "../services/search.js";
import type { BackupService } from "../services/backup.js";
import { TasksScreen } from "../screens/TasksScreen.js";
import { TaskEditScreen } from "../screens/TaskEditScreen.js";
import { NotesScreen } from "../screens/NotesScreen.js";
import { NoteEditScreen } from "../screens/NoteEditScreen.js";
import { SearchScreen } from "../screens/SearchScreen.js";
import { BackupScreen } from "../screens/BackupScreen.js";

export interface MobileNavigatorProps {
  taskRepo: TaskRepository;
  noteRepo: NoteRepository;
  searchService: SearchService;
  backupService: BackupService;
}

const TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: "tasks", label: "Tasks", icon: "✓" },
  { id: "notes", label: "Notes", icon: "📝" },
  { id: "search", label: "Search", icon: "🔍" },
  { id: "backup", label: "Backup", icon: "💾" },
];

export function MobileNavigator({
  taskRepo,
  noteRepo,
  searchService,
  backupService,
}: MobileNavigatorProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<MobileTab>("tasks");
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>({ name: "tasks" });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab);
    switch (tab) {
      case "tasks":
        setCurrentScreen({ name: "tasks" });
        break;
      case "notes":
        setCurrentScreen({ name: "notes" });
        break;
      case "search":
        setCurrentScreen({ name: "search" });
        break;
      case "backup":
        setCurrentScreen({ name: "backup" });
        break;
    }
  };

  const handleDataChanged = () => {
    setRefreshKey((k) => k + 1);
  };

  const renderScreen = () => {
    switch (currentScreen.name) {
      case "tasks":
        return (
          <TasksScreen
            key={`tasks_${refreshKey}`}
            taskRepo={taskRepo}
            onNavigateToEdit={(taskId) => setCurrentScreen({ name: "task-edit", taskId })}
          />
        );
      case "task-edit":
        return (
          <TaskEditScreen
            taskRepo={taskRepo}
            taskId={currentScreen.taskId}
            onDone={() => {
              handleDataChanged();
              setCurrentScreen({ name: "tasks" });
            }}
            onCancel={() => setCurrentScreen({ name: "tasks" })}
          />
        );
      case "notes":
        return (
          <NotesScreen
            key={`notes_${refreshKey}`}
            noteRepo={noteRepo}
            onNavigateToEdit={(noteId) => setCurrentScreen({ name: "note-edit", noteId })}
          />
        );
      case "note-edit":
        return (
          <NoteEditScreen
            noteRepo={noteRepo}
            noteId={currentScreen.noteId}
            onDone={() => {
              handleDataChanged();
              setCurrentScreen({ name: "notes" });
            }}
            onCancel={() => setCurrentScreen({ name: "notes" })}
          />
        );
      case "search":
        return (
          <SearchScreen
            key={`search_${refreshKey}`}
            searchService={searchService}
            taskRepo={taskRepo}
            onNavigateToTask={(taskId) => setCurrentScreen({ name: "task-edit", taskId })}
            onNavigateToNote={(noteId) => setCurrentScreen({ name: "note-edit", noteId })}
          />
        );
      case "backup":
        return (
          <BackupScreen
            backupService={backupService}
            onDataChanged={handleDataChanged}
          />
        );
      default:
        return (
          <TasksScreen
            taskRepo={taskRepo}
            onNavigateToEdit={(taskId) => setCurrentScreen({ name: "task-edit", taskId })}
          />
        );
    }
  };

  const isDetailScreen = currentScreen.name === "task-edit" || currentScreen.name === "note-edit";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        maxWidth: "500px",
        margin: "0 auto",
        backgroundColor: "#09090b",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
      }}
    >
      {/* Screen Viewport */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {renderScreen()}
      </div>

      {/* Bottom Tab Bar (hidden when editing full-screen modal) */}
      {!isDetailScreen && (
        <nav
          role="navigation"
          aria-label="Mobile main navigation"
          style={{
            display: "flex",
            borderTop: "1px solid #27272a",
            backgroundColor: "#18181b",
            minHeight: "56px",
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  flex: 1,
                  minHeight: "48px",
                  border: "none",
                  backgroundColor: "transparent",
                  color: isActive ? "#3b82f6" : "#a1a1aa",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  gap: "2px",
                  padding: "6px 0",
                  touchAction: "manipulation",
                }}
              >
                <span style={{ fontSize: "16px" }}>{tab.icon}</span>
                <span style={{ fontSize: "11px", fontWeight: isActive ? 600 : 400 }}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
