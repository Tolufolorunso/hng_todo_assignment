import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MobileScreen, MobileTab } from "../types/navigation.js";
import type { TaskRepository } from "../storage/taskRepository.js";
import type { NoteRepository } from "../storage/noteRepository.js";
import type { FollowUpRepository } from "../storage/followUpRepository.js";
import type { DailyPlanRepository } from "../storage/dailyPlanRepository.js";
import type { InboxRepository } from "../storage/inboxRepository.js";
import type { InboxTriageService } from "../services/inbox.js";
import type { SearchService } from "../services/search.js";
import type { BackupService } from "../services/backup.js";
import type { AuthService } from "../services/auth.js";
import type { SyncEngine } from "../services/syncEngine.js";
import type { SyncRepository } from "../storage/syncRepository.js";
import { useTheme } from "../services/theme.js";

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
import { AccountScreen } from "../screens/AccountScreen.js";
import { MoreScreen } from "../screens/MoreScreen.js";

export interface MobileNavigatorProps {
  taskRepo: TaskRepository;
  noteRepo: NoteRepository;
  followUpRepo: FollowUpRepository;
  dailyPlanRepo: DailyPlanRepository;
  inboxRepo: InboxRepository;
  triageService: InboxTriageService;
  searchService: SearchService;
  backupService: BackupService;
  authService?: AuthService;
  syncEngine?: SyncEngine;
  syncRepo?: SyncRepository;
}

export interface NavTabItem {
  id: MobileTab;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}

export const PRIMARY_TABS: NavTabItem[] = [
  { id: "tasks", label: "Tasks", icon: "checkbox-outline" },
  { id: "followups", label: "Follow Ups", icon: "people-outline" },
  { id: "notes", label: "Notes", icon: "document-text-outline" },
  { id: "more", label: "More", icon: "ellipsis-horizontal-circle-outline" },
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
  authService,
  syncEngine,
  syncRepo,
}: MobileNavigatorProps): React.JSX.Element {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<MobileTab>("tasks");
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>({ name: "tasks" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [inboxPendingCount, setInboxPendingCount] = useState(0);
  const [dueFollowUpsCount, setDueFollowUpsCount] = useState(0);

  useEffect(() => {
    async function loadBadges() {
      try {
        const pending = await inboxRepo.list({ state: "pending" });
        setInboxPendingCount(pending.length);
      } catch {
        // Safe badge fallback
      }
      try {
        const allFollowUps = await followUpRepo.list();
        const now = new Date().toISOString();
        const due = allFollowUps.filter(
          (f) => f.status === "open" && f.dueAt <= now
        );
        setDueFollowUpsCount(due.length);
      } catch {
        // Safe badge fallback
      }
    }
    loadBadges();
  }, [refreshKey, currentScreen]);

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab);
    switch (tab) {
      case "tasks":
        setCurrentScreen({ name: "tasks" });
        break;
      case "followups":
        setCurrentScreen({ name: "followups" });
        break;
      case "notes":
        setCurrentScreen({ name: "notes" });
        break;
      case "more":
        setCurrentScreen({ name: "more" });
        break;
    }
  };

  const handleDataChanged = () => {
    setRefreshKey((k) => k + 1);
  };

  const isEditingScreen =
    currentScreen.name === "task-edit" ||
    currentScreen.name === "note-edit" ||
    currentScreen.name === "followup-edit";

  const isSecondaryScreen =
    currentScreen.name === "plan" ||
    currentScreen.name === "inbox" ||
    currentScreen.name === "calendar" ||
    currentScreen.name === "analytics" ||
    currentScreen.name === "search" ||
    currentScreen.name === "backup" ||
    currentScreen.name === "account";

  const renderScreen = () => {
    switch (currentScreen.name) {
      case "tasks":
        return (
          <TasksScreen
            key={`tasks_${refreshKey}`}
            taskRepo={taskRepo}
            onNavigateToEdit={(taskId) => setCurrentScreen({ name: "task-edit", taskId })}
            onNavigateToPlan={() => setCurrentScreen({ name: "plan" })}
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
      case "more":
        return (
          <MoreScreen
            onNavigate={(screen) => setCurrentScreen(screen)}
            inboxPendingCount={inboxPendingCount}
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
            key={`cal_${refreshKey}`}
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
            searchService={searchService}
            taskRepo={taskRepo}
            onNavigateToTask={(taskId: string) => setCurrentScreen({ name: "task-edit", taskId })}
            onNavigateToNote={(noteId: string) => setCurrentScreen({ name: "note-edit", noteId })}
          />
        );
      case "backup":
        return (
          <BackupScreen
            backupService={backupService}
            onDataChanged={handleDataChanged}
          />
        );
      case "account":
        return authService && syncEngine && syncRepo ? (
          <AccountScreen
            authService={authService}
            syncEngine={syncEngine}
            syncRepo={syncRepo}
          />
        ) : (
          <MoreScreen onNavigate={setCurrentScreen} />
        );
      default:
        return (
          <TasksScreen
            key={`tasks_${refreshKey}`}
            taskRepo={taskRepo}
            onNavigateToEdit={(taskId) => setCurrentScreen({ name: "task-edit", taskId })}
            onNavigateToPlan={() => setCurrentScreen({ name: "plan" })}
          />
        );
    }
  };

  const getTabBadge = (tabId: MobileTab): number => {
    if (tabId === "followups") return dueFollowUpsCount;
    if (tabId === "more") return inboxPendingCount;
    return 0;
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {isSecondaryScreen && (
        <View
          style={[
            styles.secondaryHeader,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.surfaceBorder,
            },
          ]}
        >
          <Pressable
            onPress={() => setCurrentScreen({ name: "more" })}
            accessibilityRole="button"
            accessibilityLabel="Back to more tools"
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={18} color={colors.accent} />
            <Text style={[styles.backText, { color: colors.accent }]}>More Tools</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.contentViewport}>
        {renderScreen()}
      </View>

      {!isEditingScreen && (
        <View
          accessibilityRole="tablist"
          accessibilityLabel="Mobile bottom navigation"
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.tabBarBackground,
              borderTopColor: colors.tabBarBorder,
            },
          ]}
        >
          {PRIMARY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const badge = getTabBadge(tab.id);

            return (
              <Pressable
                key={tab.id}
                onPress={() => handleTabChange(tab.id)}
                accessibilityRole="tab"
                accessibilityLabel={badge > 0 ? `${tab.label}, ${badge} pending` : tab.label}
                accessibilityState={{ selected: isActive }}
                style={({ pressed }) => [
                  styles.tabButton,
                  pressed && styles.tabButtonPressed,
                ]}
              >
                <View style={styles.tabIconWrapper}>
                  <Ionicons
                    name={tab.icon}
                    size={22}
                    color={isActive ? colors.accent : colors.textMuted}
                  />
                  {badge > 0 ? (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>
                        {badge > 99 ? "99+" : badge}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? colors.accent : colors.textMuted,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  contentViewport: {
    flex: 1,
  },
  secondaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  backButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    minHeight: 56,
    paddingBottom: 4,
    paddingTop: 4,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  tabButtonPressed: {
    opacity: 0.7,
  },
  tabIconWrapper: {
    position: "relative",
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    fontSize: 18,
  },
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
