import React, { useState, useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/services/theme";
import { useAppServices, useAppServicesState } from "../../src/context/AppContext";

export function TabBarIcon({
  name,
  color,
  size = 24,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  size?: number;
}): React.JSX.Element {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout(): React.JSX.Element {
  const { colors } = useTheme();
  const { followUpRepo, inboxRepo } = useAppServices();
  const { refreshKey } = useAppServicesState();

  const [inboxPendingCount, setInboxPendingCount] = useState(0);
  const [dueFollowUpsCount, setDueFollowUpsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadBadges() {
      try {
        const pending = await inboxRepo.list({ state: "pending" });
        if (!cancelled) {
          setInboxPendingCount(pending.length);
        }
      } catch {
        // Safe badge fallback
      }

      try {
        const allFollowUps = await followUpRepo.list();
        const now = new Date().toISOString();
        const due = allFollowUps.filter(
          (f) => f.status === "open" && f.dueAt <= now
        );
        if (!cancelled) {
          setDueFollowUpsCount(due.length);
        }
      } catch {
        // Safe badge fallback
      }
    }

    loadBadges();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, followUpRepo, inboxRepo]);

  const followUpsBadge =
    dueFollowUpsCount > 0
      ? dueFollowUpsCount > 99
        ? "99+"
        : dueFollowUpsCount
      : undefined;

  const moreBadge =
    inboxPendingCount > 0
      ? inboxPendingCount > 99
        ? "99+"
        : inboxPendingCount
      : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarLabel: "Tasks",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon
              name={focused ? "checkbox" : "checkbox-outline"}
              size={size}
              color={typeof color === "string" ? color : colors.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="followups"
        options={{
          title: "Follow Ups",
          tabBarLabel: "Follow Ups",
          tabBarBadge: followUpsBadge,
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon
              name={focused ? "people" : "people-outline"}
              size={size}
              color={typeof color === "string" ? color : colors.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarLabel: "Notes",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon
              name={focused ? "document-text" : "document-text-outline"}
              size={size}
              color={typeof color === "string" ? color : colors.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarLabel: "More",
          tabBarBadge: moreBadge,
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIcon
              name={
                focused
                  ? "ellipsis-horizontal-circle"
                  : "ellipsis-horizontal-circle-outline"
              }
              size={size}
              color={typeof color === "string" ? color : colors.accent}
            />
          ),
        }}
      />
    </Tabs>
  );
}
