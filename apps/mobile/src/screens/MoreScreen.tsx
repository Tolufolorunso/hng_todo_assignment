import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MobileScreen } from "../types/navigation.js";
import { useTheme } from "../services/theme.js";

export interface MoreScreenProps {
  onNavigate: (screen: MobileScreen) => void;
  inboxPendingCount?: number;
}

interface MoreMenuItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  screen?: MobileScreen;
  badge?: number;
  isAction?: boolean;
}

export function MoreScreen({
  onNavigate,
  inboxPendingCount = 0,
}: MoreScreenProps): React.JSX.Element {
  const { colors, mode, toggleTheme } = useTheme();

  const items: MoreMenuItem[] = [
    {
      id: "plan",
      title: "Plan My Day",
      description: "Capacity-aware day planning with focus recommendations",
      icon: "flash-outline",
      screen: { name: "plan" },
    },
    {
      id: "inbox",
      title: "Fast Capture Inbox",
      description: "Quick capture items for triage and processing",
      icon: "file-tray-full-outline",
      screen: { name: "inbox" },
      badge: inboxPendingCount,
    },
    {
      id: "calendar",
      title: "Calendar & Schedule",
      description: "Monthly calendar view and upcoming deadlines",
      icon: "calendar-outline",
      screen: { name: "calendar" },
    },
    {
      id: "analytics",
      title: "Productivity Insights",
      description: "Completion velocity, priority breakdown, and trends",
      icon: "bar-chart-outline",
      screen: { name: "analytics" },
    },
    {
      id: "search",
      title: "Search Workspace",
      description: "Search across tasks, descriptions, and note content",
      icon: "search-outline",
      screen: { name: "search" },
    },
    {
      id: "backup",
      title: "Data Backup & Restore",
      description: "Export and restore portable JSON data snapshots",
      icon: "save-outline",
      screen: { name: "backup" },
    },
    {
      id: "account",
      title: "Account & Cloud Sync",
      description: "Sign in with email OTP and sync across devices",
      icon: "person-circle-outline",
      screen: { name: "account" },
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>More Tools</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Secondary productivity tools and preferences
        </Text>
      </View>

      <View style={styles.section}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => item.screen && onNavigate(item.screen)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.description}`}
            style={({ pressed }) => [
              styles.itemRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
              },
              pressed && styles.itemRowPressed,
            ]}
          >
            <View
              style={[
                styles.itemIconContainer,
                { backgroundColor: "rgba(59, 130, 246, 0.12)" },
              ]}
            >
              <Ionicons name={item.icon} size={20} color={colors.accent} />
            </View>

            <View style={styles.itemTextContainer}>
              <View style={styles.titleRow}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
                {item.badge && item.badge > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[styles.itemDescription, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
              style={styles.chevronIcon}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel={`Toggle theme. Current theme is ${mode}`}
          style={({ pressed }) => [
            styles.itemRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
            pressed && styles.itemRowPressed,
          ]}
        >
          <View
            style={[
              styles.itemIconContainer,
              { backgroundColor: "rgba(59, 130, 246, 0.12)" },
            ]}
          >
            <Ionicons
              name={mode === "dark" ? "moon-outline" : "sunny-outline"}
              size={20}
              color={colors.accent}
            />
          </View>
          <View style={styles.itemTextContainer}>
            <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>Theme</Text>
            <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
              Switch between dark and light appearance (Current: {mode})
            </Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
    gap: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 56,
  },
  itemRowPressed: {
    opacity: 0.7,
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  itemIcon: {
    fontSize: 20,
  },
  itemTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  chevronIcon: {
    marginLeft: 8,
  },
});
