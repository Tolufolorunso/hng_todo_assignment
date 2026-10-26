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
import { hapticFeedback } from "../services/haptics.js";
import {
  getPlatformGroupContainerStyle,
  getPlatformRipple,
  getHairlineDividerStyle,
} from "../styles/platform.js";

export interface MoreScreenProps {
  onNavigate: (screen: MobileScreen) => void;
  inboxPendingCount?: number;
}

interface MoreMenuItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  screen: MobileScreen;
  badge?: number;
}

interface MenuGroup {
  id: string;
  title: string;
  items: MoreMenuItem[];
}

export function MoreScreen({
  onNavigate,
  inboxPendingCount = 0,
}: MoreScreenProps): React.JSX.Element {
  const { colors, mode, toggleTheme } = useTheme();

  const groups: MenuGroup[] = [
    {
      id: "productivity",
      title: "Productivity Tools",
      items: [
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
      ],
    },
    {
      id: "workspace",
      title: "Data & Workspace",
      items: [
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
      ],
    },
  ];

  const rippleConfig = getPlatformRipple(
    mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"
  );

  const handleNavigate = (screen: MobileScreen) => {
    hapticFeedback.selection();
    onNavigate(screen);
  };

  const handleToggleTheme = () => {
    hapticFeedback.selection();
    toggleTheme();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          More Tools
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Productivity tools, data management, and settings
        </Text>
      </View>

      {groups.map((group) => (
        <View key={group.id} style={styles.groupSection}>
          <Text style={[styles.groupHeaderTitle, { color: colors.textMuted }]}>
            {group.title.toUpperCase()}
          </Text>

          <View
            style={[
              styles.groupContainer,
              getPlatformGroupContainerStyle(colors.surface, colors.surfaceBorder),
            ]}
          >
            {group.items.map((item, index) => {
              const isLast = index === group.items.length - 1;
              return (
                <React.Fragment key={item.id}>
                  <Pressable
                    onPress={() => handleNavigate(item.screen)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}. ${item.description}`}
                    android_ripple={rippleConfig}
                    style={({ pressed }) => [
                      styles.itemRow,
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
                        numberOfLines={1}
                      >
                        {item.description}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textMuted}
                      style={styles.chevronIcon}
                    />
                  </Pressable>

                  {!isLast && (
                    <View
                      style={[
                        getHairlineDividerStyle(colors.surfaceBorder),
                        styles.dividerIndent,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      ))}

      {/* Preferences Section */}
      <View style={styles.groupSection}>
        <Text style={[styles.groupHeaderTitle, { color: colors.textMuted }]}>
          PREFERENCES
        </Text>

        <View
          style={[
            styles.groupContainer,
            getPlatformGroupContainerStyle(colors.surface, colors.surfaceBorder),
          ]}
        >
          <Pressable
            onPress={handleToggleTheme}
            accessibilityRole="button"
            accessibilityLabel={`Toggle theme. Current theme is ${mode}`}
            android_ripple={rippleConfig}
            style={({ pressed }) => [
              styles.itemRow,
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
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                Appearance
              </Text>
              <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
                Switch between dark and light appearance
              </Text>
            </View>
            <View
              style={[
                styles.themeModePill,
                {
                  backgroundColor:
                    mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                },
              ]}
            >
              <Text style={[styles.themeModePillText, { color: colors.textPrimary }]}>
                {mode === "dark" ? "Dark" : "Light"}
              </Text>
            </View>
          </Pressable>
        </View>
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
  groupSection: {
    marginBottom: 24,
  },
  groupHeaderTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 8,
  },
  groupContainer: {
    width: "100%",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  itemRowPressed: {
    opacity: 0.7,
  },
  dividerIndent: {
    marginLeft: 66,
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
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
  themeModePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  themeModePillText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
