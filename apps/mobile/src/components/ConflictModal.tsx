import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { ConflictRecord } from "../types/sync";
import { useTheme } from "../services/theme";

export interface ConflictModalProps {
  conflicts: ConflictRecord[];
  onResolve: (conflictId: string, choice: "keepServer" | "keepLocal") => Promise<void>;
  onClose: () => void;
}

export function ConflictModal({
  conflicts,
  onResolve,
  onClose,
}: ConflictModalProps): React.JSX.Element {
  const { colors } = useTheme();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handleAction = async (conflictId: string, choice: "keepServer" | "keepLocal") => {
    setResolvingId(conflictId);
    try {
      await onResolve(conflictId, choice);
    } finally {
      setResolvingId(null);
    }
  };

  const formatPayload = (raw: string | null) => {
    if (!raw) return "No data (Deleted)";
    try {
      const obj = JSON.parse(raw);
      return JSON.stringify(obj, null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <View
      accessibilityRole="none"
      accessibilityViewIsModal={true}
      style={styles.backdrop}
    >
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            Sync Conflicts ({conflicts.length})
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close conflict modal"
            style={styles.closeBtn}
          >
            <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>

        <Text style={[styles.modalDescription, { color: colors.textMuted }]}>
          Differences were detected between this device and the server. Choose which version you want to keep.
        </Text>

        <ScrollView style={styles.conflictsScroll} contentContainerStyle={styles.conflictsList}>
          {conflicts.map((c) => {
            const isBusy = resolvingId === c.id;
            return (
              <View
                key={c.id}
                style={[
                  styles.conflictCard,
                  { backgroundColor: colors.background, borderColor: colors.surfaceBorder },
                ]}
              >
                <View style={styles.conflictCardHeader}>
                  <Text style={[styles.entityTag, { color: colors.accent }]}>
                    {c.entityType} ({c.entityId})
                  </Text>
                  <Text style={[styles.revText, { color: colors.textMuted }]}>
                    Server Rev: {c.serverRevision}
                  </Text>
                </View>

                <View style={styles.diffColumns}>
                  <View style={styles.diffBlock}>
                    <Text style={styles.localLabel}>
                      Device Version (Local)
                    </Text>
                    <View style={styles.codeSnippetBox}>
                      <Text style={[styles.codeSnippetText, { color: colors.textPrimary }]}>
                        {formatPayload(c.localValue)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.diffBlock}>
                    <Text style={styles.serverLabel}>
                      Server Version (Cloud)
                    </Text>
                    <View style={styles.codeSnippetBox}>
                      <Text style={[styles.codeSnippetText, { color: colors.textPrimary }]}>
                        {formatPayload(c.serverValue)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <Pressable
                    disabled={isBusy}
                    onPress={() => handleAction(c.id, "keepServer")}
                    accessibilityRole="button"
                    accessibilityLabel="Keep Server Version"
                    style={[styles.resolveBtn, styles.serverBtn, isBusy && styles.disabledBtn]}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.btnText}>Keep Server</Text>
                    )}
                  </Pressable>

                  <Pressable
                    disabled={isBusy}
                    onPress={() => handleAction(c.id, "keepLocal")}
                    accessibilityRole="button"
                    accessibilityLabel="Keep Local Version"
                    style={[styles.resolveBtn, styles.localBtn, isBusy && styles.disabledBtn]}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.btnText}>Keep Local</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 9999,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  conflictsScroll: {
    maxHeight: 450,
  },
  conflictsList: {
    gap: 12,
  },
  conflictCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  conflictCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entityTag: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  revText: {
    fontSize: 12,
  },
  diffColumns: {
    gap: 8,
  },
  diffBlock: {
    gap: 4,
  },
  localLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#60a5fa",
  },
  serverLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34d399",
  },
  codeSnippetBox: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 6,
    padding: 8,
  },
  codeSnippetText: {
    fontFamily: "monospace",
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  resolveBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  serverBtn: {
    backgroundColor: "#059669",
  },
  localBtn: {
    backgroundColor: "#2563eb",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  btnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
});
