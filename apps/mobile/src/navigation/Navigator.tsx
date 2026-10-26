import React, { useState } from "react";
import type { MobileScreen, MobileTab } from "../types/navigation.js";
import type { TaskRepository } from "../storage/taskRepository.js";
import type { NoteRepository } from "../storage/noteRepository.js";
import type { FollowUpRepository } from "../storage/followUpRepository.js";
import type { DailyPlanRepository } from "../storage/dailyPlanRepository.js";
import type { InboxRepository } from "../storage/inboxRepository.js";
import type { InboxTriageService } from "../services/inbox.js";
import type { SearchService } from "../services/search.js";
import type { BackupService } from "../services/backup.js";
import { TasksScreen } from "../screens/TasksScreen.js";
import { TaskEditScreen } from "../screens/TaskEditScreen.js";
import { FollowUpsScreen } from "../screens/FollowUpsScreen.js";
import { PlanScreen } from "../screens/PlanScreen.js";
import { NotesScreen } from "../screens/NotesScreen.js";
import { NoteEditScreen } from "../screens/NoteEditScreen.js";
import { InboxScreen } from "../screens/InboxScreen.js";
import { CalendarScreen } from "../screens/CalendarScreen.js";
import { AnalyticsScreen } from "../screens/AnalyticsScreen.js";
import { SearchScreen } from "../screens/SearchScreen.js";
import { BackupScreen } from "../screens/BackupScreen.js";
import { useTheme } from "../services/theme.js";

export interface MobileNavigatorProps {
  taskRepo: TaskRepository;
  noteRepo: NoteRepository;
  followUpRepo: FollowUpRepository;
  dailyPlanRepo: DailyPlanRepository;
  inboxRepo: InboxRepository;
  triageService: InboxTriageService;
  searchService: SearchService;
  backupService: BackupService;
}

const TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: "tasks", label: "Tasks", icon: "✓" },
  { id: "followups", label: "Follow Ups", icon: "🤝" },
  { id: "plan", label: "Plan", icon: "⚡" },
  { id: "notes", label: "Notes", icon: "📝" },
  { id: "inbox", label: "Inbox", icon: "📥" },
  { id: "calendar", label: "Calendar", icon: "📅" },
  { id: "analytics", label: "Insights", icon: "📊" },
  { id: "search", label: "Search", icon: "🔍" },
  { id: "backup", label: "Backup", icon: "💾" },
];

export function MobileNavigator({
  taskRepo,
  noteRepo,
  followUpRepo,
  dailyPlanRepo,
  inboxRepo,
  triageService,
  searchService,
  backupService,
}: MobileNavigatorProps): React.JSX.Element {
  const { colors, isTablet, mode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<MobileTab>("tasks");
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>({ name: "tasks" });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab);
    switch (tab) {
      case "tasks":
        setCurrentScreen({ name: "tasks" });
        break;
      case "followups":
        setCurrentScreen({ name: "followups" });
        break;
      case "plan":
        setCurrentScreen({ name: "plan" });
        break;
      case "notes":
        setCurrentScreen({ name: "notes" });
        break;
      case "inbox":
        setCurrentScreen({ name: "inbox" });
        break;
      case "calendar":
        setCurrentScreen({ name: "calendar" });
        break;
      case "analytics":
        setCurrentScreen({ name: "analytics" });
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
            onNavigateToPlan={() => handleTabChange("plan")}
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
      case "followups":
        return (
          <FollowUpsScreen
            key={`followups_${refreshKey}`}
            followUpRepo={followUpRepo}
          />
        );
      case "plan":
        return (
          <PlanScreen
            key={`plan_${refreshKey}`}
            taskRepo={taskRepo}
            followUpRepo={followUpRepo}
            dailyPlanRepo={dailyPlanRepo}
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
            taskRepo={taskRepo}
            followUpRepo={followUpRepo}
            noteId={currentScreen.noteId}
            onDone={() => {
              handleDataChanged();
              setCurrentScreen({ name: "notes" });
            }}
            onCancel={() => setCurrentScreen({ name: "notes" })}
          />
        );
      case "inbox":
        return (
          <InboxScreen
            key={`inbox_${refreshKey}`}
            inboxRepo={inboxRepo}
            triageService={triageService}
          />
        );
      case "calendar":
        return (
          <CalendarScreen
            key={`calendar_${refreshKey}`}
            taskRepo={taskRepo}
            followUpRepo={followUpRepo}
          />
        );
      case "analytics":
        return (
          <AnalyticsScreen
            key={`analytics_${refreshKey}`}
            taskRepo={taskRepo}
            followUpRepo={followUpRepo}
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

  // Tablet Layout: Dual-column master detail with side navigation
  if (isTablet) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
          backgroundColor: colors.background,
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          borderLeft: `1px solid ${colors.surfaceBorder}`,
          borderRight: `1px solid ${colors.surfaceBorder}`,
        }}
      >
        {/* Tablet Left Sidebar */}
        <nav
          role="navigation"
          aria-label="Tablet navigation sidebar"
          style={{
            width: "220px",
            backgroundColor: colors.surface,
            borderRight: `1px solid ${colors.surfaceBorder}`,
            display: "flex",
            flexDirection: "column",
            padding: "16px 8px",
            gap: "4px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", marginBottom: "12px" }}>
            <span style={{ fontSize: "16px", fontWeight: 800, color: colors.textPrimary }}>TaskFlow</span>
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "16px",
                cursor: "pointer",
              }}
              title="Toggle theme"
            >
              {mode === "dark" ? "☀" : "🌙"}
            </button>
          </div>

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
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: isActive ? "rgba(59, 130, 246, 0.15)" : "transparent",
                  color: isActive ? colors.accent : colors.textMuted,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "14px",
                  cursor: "pointer",
                  textAlign: "left",
                  minHeight: "44px",
                }}
              >
                <span style={{ fontSize: "16px" }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tablet Main Content Area */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {renderScreen()}
        </div>
      </div>
    );
  }

  // Phone Layout: Single column with bottom tab bar
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        maxWidth: "500px",
        margin: "0 auto",
        backgroundColor: colors.background,
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
      }}
    >
      {/* Screen Viewport */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {renderScreen()}
      </div>

      {/* Bottom Tab Bar (hidden when editing modal) */}
      {!isDetailScreen && (
        <nav
          role="navigation"
          aria-label="Mobile main navigation"
          style={{
            display: "flex",
            borderTop: `1px solid ${colors.tabBarBorder}`,
            backgroundColor: colors.tabBarBackground,
            minHeight: "56px",
            overflowX: "auto",
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
                  flex: "0 0 62px",
                  minHeight: "48px",
                  border: "none",
                  backgroundColor: "transparent",
                  color: isActive ? colors.accent : colors.textMuted,
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
                <span style={{ fontSize: "15px" }}>{tab.icon}</span>
                <span style={{ fontSize: "10px", fontWeight: isActive ? 700 : 400 }}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
