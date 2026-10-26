import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, StatusBar } from "react-native";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../src/services/theme.js";
import { AppServicesProvider, useAppServicesState } from "../src/context/AppContext.js";

function RootNavigator(): React.JSX.Element {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { isReady, initError } = useAppServicesState();

  if (initError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Text style={[styles.errorTitle, { color: colors.danger }]}>Initialization Error</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{initError}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading TaskFlow...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.accent,
          headerTitleStyle: {
            color: colors.textPrimary,
            fontWeight: "600",
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="task-edit"
          options={{
            presentation: "modal",
            headerTitle: "Edit Task",
          }}
        />
        <Stack.Screen
          name="note-edit"
          options={{
            presentation: "modal",
            headerTitle: "Edit Note",
          }}
        />
        <Stack.Screen
          name="plan"
          options={{
            presentation: "card",
            headerTitle: "Plan My Day",
          }}
        />
        <Stack.Screen
          name="inbox"
          options={{
            presentation: "card",
            headerTitle: "Fast Capture Inbox",
          }}
        />
        <Stack.Screen
          name="calendar"
          options={{
            presentation: "card",
            headerTitle: "Calendar & Schedule",
          }}
        />
        <Stack.Screen
          name="analytics"
          options={{
            presentation: "card",
            headerTitle: "Productivity Insights",
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            presentation: "card",
            headerTitle: "Search Workspace",
          }}
        />
        <Stack.Screen
          name="backup"
          options={{
            presentation: "card",
            headerTitle: "Data Backup & Restore",
          }}
        />
        <Stack.Screen
          name="account"
          options={{
            presentation: "card",
            headerTitle: "Account & Cloud Sync",
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppServicesProvider>
          <RootNavigator />
        </AppServicesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
  },
});
