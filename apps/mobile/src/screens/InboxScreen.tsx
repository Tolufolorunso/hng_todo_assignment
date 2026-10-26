import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { InboxCapture } from "../types/inbox.js";
import type { InboxRepository } from "../storage/inboxRepository.js";
import type { InboxTriageService } from "../services/inbox.js";
import { TouchButton, EmptyState } from "../components/primitives.js";
import { useTheme } from "../services/theme.js";

export interface InboxScreenProps {
  inboxRepo: InboxRepository;
  triageService: InboxTriageService;
}

export function InboxScreen({ inboxRepo, triageService }: InboxScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const [captures, setCaptures] = useState<InboxCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [captureText, setCaptureText] = useState("");
  const [sharedUrl, setSharedUrl] = useState("");

  // Follow-up triage prompt modal state
  const [promptCaptureId, setPromptCaptureId] = useState<string | null>(null);
  const [personName, setPersonName] = useState("");

  const loadCaptures = async () => {
    setLoading(true);
    try {
      const items = await inboxRepo.list({ state: "pending" });
      setCaptures(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaptures();
  }, []);

  const handleCapture = async () => {
    if (!captureText.trim()) return;

    await inboxRepo.create({
      text: captureText.trim(),
      sharedUrl: sharedUrl.trim() || null,
      sourceAppLabel: "Mobile Fast Capture",
    });

    setCaptureText("");
    setSharedUrl("");
    await loadCaptures();
  };

  const handleTriageTask = async (id: string) => {
    await triageService.triageToTask(id);
    await loadCaptures();
  };

  const handleTriageNote = async (id: string) => {
    await triageService.triageToNote(id);
    await loadCaptures();
  };

  const handleTriageFollowUp = async (id: string) => {
    if (!personName.trim()) return;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await triageService.triageToFollowUp(id, {
      personName: personName.trim(),
      dueAt: tomorrow,
    });
    setPromptCaptureId(null);
    setPersonName("");
    await loadCaptures();
  };

  const handleDiscard = async (id: string) => {
    await triageService.discard(id);
    await loadCaptures();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      testID="inbox-screen"
    >
      <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
        Fast Capture Inbox
      </Text>

      {/* Quick capture input box */}
      <View
        style={[
          styles.captureCard,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}
      >
        <TextInput
          multiline
          placeholder="Quick idea, thought, or task..."
          placeholderTextColor={colors.textMuted}
          value={captureText}
          onChangeText={setCaptureText}
          style={[
            styles.textarea,
            {
              backgroundColor: colors.background,
              borderColor: colors.surfaceBorder,
              color: colors.textPrimary,
            },
          ]}
        />
        <TextInput
          placeholder="Optional link (https://...)"
          placeholderTextColor={colors.textMuted}
          keyboardType="url"
          autoCapitalize="none"
          value={sharedUrl}
          onChangeText={setSharedUrl}
          style={[
            styles.urlInput,
            {
              backgroundColor: colors.background,
              borderColor: colors.surfaceBorder,
              color: colors.textPrimary,
            },
          ]}
        />
        <TouchButton label="Capture to Inbox" onPress={handleCapture} variant="primary" />
      </View>

      {/* Recipient prompt modal when triaging to follow up */}
      {promptCaptureId ? (
        <View
          style={[
            styles.promptCard,
            { backgroundColor: colors.surface, borderColor: colors.accent },
          ]}
        >
          <Text style={[styles.promptTitle, { color: colors.textPrimary }]}>
            Who is this follow-up for?
          </Text>
          <TextInput
            placeholder="Contact or person name *"
            placeholderTextColor={colors.textMuted}
            value={personName}
            onChangeText={setPersonName}
            style={[
              styles.promptInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfaceBorder,
                color: colors.textPrimary,
              },
            ]}
          />
          <View style={styles.promptButtonsRow}>
            <TouchButton
              label="Save Follow Up"
              onPress={() => handleTriageFollowUp(promptCaptureId)}
              variant="primary"
            />
            <TouchButton
              label="Cancel"
              onPress={() => {
                setPromptCaptureId(null);
                setPersonName("");
              }}
              variant="secondary"
            />
          </View>
        </View>
      ) : null}

      {/* Triage Queue */}
      <Text style={[styles.queueTitle, { color: colors.textMuted }]}>
        Pending Queue ({captures.length})
      </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading inbox items...
          </Text>
        </View>
      ) : captures.length === 0 ? (
        <EmptyState
          title="Inbox is clear"
          description="Everything has been triaged into tasks, notes, or follow-ups!"
        />
      ) : (
        <View style={styles.capturesList}>
          {captures.map((item) => (
            <View
              key={item.id}
              style={[
                styles.captureItemCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
            >
              <Text style={[styles.captureItemText, { color: colors.textPrimary }]}>
                {item.text}
              </Text>

              {item.sharedUrl ? (
                <Text style={[styles.captureItemUrl, { color: colors.accent }]}>
                  Link: {item.sharedUrl}
                </Text>
              ) : null}

              <View style={styles.triageActionsRow}>
                <TouchButton
                  label="→ Task"
                  onPress={() => handleTriageTask(item.id)}
                  variant="primary"
                />
                <TouchButton
                  label="→ Note"
                  onPress={() => handleTriageNote(item.id)}
                  variant="secondary"
                />
                <TouchButton
                  label="→ Follow Up"
                  onPress={() => setPromptCaptureId(item.id)}
                  variant="secondary"
                />
                <TouchButton
                  label="Discard"
                  onPress={() => handleDiscard(item.id)}
                  variant="ghost"
                />
              </View>
            </View>
          ))}
        </View>
      )}
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
  captureCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 44,
  },
  promptCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  promptInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  promptButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  queueTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  capturesList: {
    gap: 12,
  },
  captureItemCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  captureItemText: {
    fontSize: 14,
    lineHeight: 20,
  },
  captureItemUrl: {
    fontSize: 12,
  },
  triageActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
});
