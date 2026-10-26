import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import type { BackupService } from "../services/backup.js";
import type { BackupImportMode, BackupImportResult } from "../types/backup.js";
import { TouchButton } from "../components/primitives.js";
import { useTheme } from "../services/theme.js";

export interface BackupScreenProps {
  backupService: BackupService;
  onDataChanged: () => void;
}

export function BackupScreen({ backupService, onDataChanged }: BackupScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const [exportedJson, setExportedJson] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importMode, setImportMode] = useState<BackupImportMode>("merge");
  const [importResult, setImportResult] = useState<BackupImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleExport = async () => {
    setErrorMessage(null);
    try {
      const json = await backupService.exportJsonString();
      setExportedJson(json);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleCopyExport = async () => {
    if (!exportedJson) return;
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleImport = async () => {
    setErrorMessage(null);
    setImportResult(null);
    if (!importJson.trim()) {
      setErrorMessage("Please paste JSON backup data to import");
      return;
    }

    try {
      const result = await backupService.importSnapshot(importJson, importMode);
      setImportResult(result);
      setImportJson("");
      onDataChanged();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Import failed");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      testID="backup-screen"
    >
      <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
        Backup & Restore
      </Text>

      {errorMessage ? (
        <View
          accessibilityRole="alert"
          style={[styles.bannerAlert, { backgroundColor: "#7f1d1d", borderColor: colors.danger }]}
        >
          <Text style={[styles.bannerAlertText, { color: "#fecaca" }]}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {importResult ? (
        <View
          style={[styles.bannerAlert, { backgroundColor: "#064e3b", borderColor: colors.success }]}
        >
          <Text style={[styles.bannerAlertText, { color: "#a7f3d0" }]}>
            ✓ Successfully imported: {importResult.tasksImported} tasks, {importResult.notesImported} notes.
          </Text>
        </View>
      ) : null}

      {/* Export Section */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Export Workspace Data
        </Text>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          Download a complete portable JSON snapshot of your tasks, notes, follow-up commitments, and daily plans.
        </Text>

        <TouchButton label="Generate Backup Snapshot" onPress={handleExport} variant="primary" />

        {exportedJson ? (
          <View style={styles.exportResultContainer}>
            <TextInput
              multiline
              editable={false}
              value={exportedJson}
              style={[
                styles.jsonPreview,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.surfaceBorder,
                  color: colors.textPrimary,
                },
              ]}
            />
            <TouchButton
              label={copySuccess ? "✓ Copied!" : "Copy Snapshot"}
              onPress={handleCopyExport}
              variant="secondary"
            />
          </View>
        ) : null}
      </View>

      {/* Import Section */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          Restore Workspace Data
        </Text>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]}>
          Paste a TaskFlow JSON backup string to restore tasks, notes, and commitments.
        </Text>

        <TextInput
          multiline
          placeholder="Paste JSON backup payload here..."
          placeholderTextColor={colors.textMuted}
          value={importJson}
          onChangeText={setImportJson}
          style={[
            styles.jsonInput,
            {
              backgroundColor: colors.background,
              borderColor: colors.surfaceBorder,
              color: colors.textPrimary,
            },
          ]}
        />

        {/* Mode Selector */}
        <View style={styles.modeSelectorRow}>
          <Text style={[styles.modeLabel, { color: colors.textMuted }]}>
            Import Mode:
          </Text>
          <View style={styles.modeButtonsRow}>
            {(["merge", "replace"] as const).map((mode) => {
              const isSelected = importMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setImportMode(mode)}
                  accessibilityRole="button"
                  accessibilityLabel={`Import mode ${mode}`}
                  style={[
                    styles.modeButton,
                    {
                      borderColor: isSelected ? colors.accent : colors.surfaceBorder,
                      backgroundColor: isSelected ? colors.accent : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeButtonText,
                      { color: isSelected ? "#ffffff" : colors.textPrimary },
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TouchButton label="Import & Restore" onPress={handleImport} variant="secondary" />
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
    gap: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  bannerAlert: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  bannerAlertText: {
    fontSize: 13,
    fontWeight: "500",
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  exportResultContainer: {
    gap: 10,
    marginTop: 4,
  },
  jsonPreview: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontFamily: "monospace",
    fontSize: 11,
    maxHeight: 140,
  },
  jsonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontFamily: "monospace",
    fontSize: 12,
    minHeight: 100,
    maxHeight: 180,
  },
  modeSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modeLabel: {
    fontSize: 13,
  },
  modeButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
