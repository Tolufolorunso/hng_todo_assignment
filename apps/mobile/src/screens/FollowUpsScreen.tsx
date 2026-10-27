import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type {
  FollowUp,
  FollowUpStatus,
  RecurrenceRule,
} from "../types/followup";
import type { FollowUpRepository } from "../storage/followUpRepository";
import { TouchButton, Badge, EmptyState } from "../components/primitives";
import { launchAction } from "../services/launchers";
import { notificationScheduler } from "../services/notifications";
import { useTheme } from "../services/theme";
import { hapticFeedback } from "../services/haptics";
import { getPlatformCardStyle } from "../styles/platform";

export interface FollowUpsScreenProps {
  followUpRepo: FollowUpRepository;
}

interface FollowUpItemCardProps {
  item: FollowUp;
  onComplete: (id: string) => void;
  onSnooze: (id: string) => void;
  onDelete: (id: string) => void;
}

const FollowUpItemCard = React.memo(function FollowUpItemCard({
  item,
  onComplete,
  onSnooze,
  onDelete,
}: FollowUpItemCardProps): React.JSX.Element {
  const { colors } = useTheme();
  const cardStyle = getPlatformCardStyle(colors.surface, colors.surfaceBorder);

  const handleEmail = () => {
    hapticFeedback.light();
    launchAction("email", item.emailAddress!, {
      subject: `Follow-up: ${item.commitment}`,
    });
  };

  const handlePhone = () => {
    hapticFeedback.light();
    launchAction("phone", item.phoneNumber!);
  };

  const handleWhatsApp = () => {
    hapticFeedback.light();
    launchAction("whatsapp", item.whatsAppNumber!, {
      body: `Hi ${item.personName}, following up on: ${item.commitment}`,
    });
  };

  const handleItemComplete = () => {
    hapticFeedback.medium();
    onComplete(item.id);
  };

  const handleItemSnooze = () => {
    hapticFeedback.light();
    onSnooze(item.id);
  };

  const handleItemDelete = () => {
    hapticFeedback.warning();
    onDelete(item.id);
  };

  return (
    <View style={[styles.itemCard, cardStyle]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderMain}>
          <Text style={[styles.personNameText, { color: colors.textPrimary }]}>
            {item.personName}
          </Text>
          <Text style={[styles.commitmentText, { color: colors.textSecondary }]}>
            {item.commitment}
          </Text>
        </View>
        <Badge
          label={item.status}
          variant={item.status === "completed" ? "low" : "high"}
        />
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: colors.textMuted }]}>
          Due: {item.dueAt.slice(0, 10)}
        </Text>
        {item.recurrence && (
          <Badge
            label={`${item.recurrence.frequency} (${item.recurrence.mode})`}
            variant="neutral"
          />
        )}
        {item.sourceExcerpt && (
          <Text style={[styles.linkedNoteText, { color: colors.accent }]}>
            Linked Note
          </Text>
        )}
      </View>

      {/* Native communication launchers */}
      <View style={styles.launchersRow}>
        {item.emailAddress && (
          <Pressable
            onPress={handleEmail}
            accessibilityRole="button"
            accessibilityLabel={`Email ${item.personName}`}
            style={[styles.launcherBtn, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}
          >
            <Ionicons name="mail-outline" size={14} color={colors.accent} />
            <Text style={[styles.launcherBtnText, { color: colors.accent, marginLeft: 4 }]}>
              Email
            </Text>
          </Pressable>
        )}
        {item.phoneNumber && (
          <Pressable
            onPress={handlePhone}
            accessibilityRole="button"
            accessibilityLabel={`Call ${item.personName}`}
            style={[styles.launcherBtn, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}
          >
            <Ionicons name="call-outline" size={14} color={colors.success} />
            <Text style={[styles.launcherBtnText, { color: colors.success, marginLeft: 4 }]}>
              Call
            </Text>
          </Pressable>
        )}
        {item.whatsAppNumber && (
          <Pressable
            onPress={handleWhatsApp}
            accessibilityRole="button"
            accessibilityLabel={`WhatsApp ${item.personName}`}
            style={[styles.launcherBtn, { backgroundColor: "rgba(37, 211, 102, 0.15)" }]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#25d366" />
            <Text style={[styles.launcherBtnText, { color: "#25d366", marginLeft: 4 }]}>
              WhatsApp
            </Text>
          </Pressable>
        )}
      </View>

      {/* Action buttons */}
      {item.status === "open" && (
        <View style={styles.actionsRow}>
          <TouchButton
            label="Complete"
            onPress={handleItemComplete}
            variant="primary"
          />
          <TouchButton
            label="Snooze +24h"
            onPress={handleItemSnooze}
            variant="secondary"
          />
          <TouchButton
            label="Delete"
            onPress={handleItemDelete}
            variant="ghost"
          />
        </View>
      )}
    </View>
  );
});

export function FollowUpsScreen({ followUpRepo }: FollowUpsScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | "all">("open");
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [personName, setPersonName] = useState("");
  const [commitment, setCommitment] = useState("");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState<
    "none" | "daily" | "weekly" | "monthly"
  >("none");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    try {
      const all = await followUpRepo.list();
      setFollowups(all);
    } finally {
      setLoading(false);
    }
  }, [followUpRepo]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  const handleCreate = async () => {
    if (!personName.trim() || !commitment.trim()) {
      setErrorMsg("Person name and commitment are required");
      return;
    }
    setErrorMsg(null);

    let recurrence: RecurrenceRule | null = null;
    if (recurrenceInterval !== "none") {
      recurrence = {
        frequency: recurrenceInterval,
        mode: "calendarAnchored",
        interval: 1,
        timeOfDay: "09:00",
        timeZone: "UTC",
      };
    }

    const created = await followUpRepo.create({
      personName: personName.trim(),
      commitment: commitment.trim(),
      dueAt: `${dueDate}T12:00:00.000Z`,
      emailAddress: email.trim() || null,
      phoneNumber: phone.trim() || null,
      whatsAppNumber: whatsapp.trim() || null,
      recurrence,
    });

    hapticFeedback.success();

    // Schedule local push notification reminder
    try {
      await notificationScheduler.scheduleFollowUpReminder(created);
    } catch {
      // Non-blocking notification scheduling
    }

    setPersonName("");
    setCommitment("");
    setEmail("");
    setPhone("");
    setWhatsapp("");
    setRecurrenceInterval("none");
    setShowAddForm(false);
    await loadFollowUps();
  };

  const handleComplete = useCallback(async (id: string) => {
    await followUpRepo.completeOccurrence(id, "completed");
    await notificationScheduler.cancelByTargetId(id);
    await loadFollowUps();
  }, [followUpRepo, loadFollowUps]);

  const handleSnooze = useCallback(async (id: string) => {
    await followUpRepo.snooze(id, 24);
    await loadFollowUps();
  }, [followUpRepo, loadFollowUps]);

  const handleDelete = useCallback(async (id: string) => {
    await followUpRepo.delete(id);
    await notificationScheduler.cancelByTargetId(id);
    await loadFollowUps();
  }, [followUpRepo, loadFollowUps]);

  const handleStatusFilterChange = (st: FollowUpStatus | "all") => {
    hapticFeedback.selection();
    setStatusFilter(st);
  };

  const handleRecurrenceSelect = (r: "none" | "daily" | "weekly" | "monthly") => {
    hapticFeedback.selection();
    setRecurrenceInterval(r);
  };

  const filtered = followups.filter((f) => {
    if (statusFilter === "all") return true;
    return f.status === statusFilter;
  });

  const renderItem = useCallback(
    ({ item }: { item: FollowUp }) => (
      <FollowUpItemCard
        item={item}
        onComplete={handleComplete}
        onSnooze={handleSnooze}
        onDelete={handleDelete}
      />
    ),
    [handleComplete, handleSnooze, handleDelete]
  );

  const renderHeader = () => (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          Follow Ups
        </Text>
        <TouchButton
          label={showAddForm ? "Cancel" : "+ Add Follow Up"}
          onPress={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? "secondary" : "primary"}
        />
      </View>

      {showAddForm && (
        <View
          style={[
            styles.formCard,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
            New Follow Up Commitment
          </Text>

          {errorMsg ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {errorMsg}
            </Text>
          ) : null}

          <TextInput
            placeholder="Person or contact name *"
            placeholderTextColor={colors.textMuted}
            value={personName}
            onChangeText={setPersonName}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.textPrimary,
                borderColor: colors.surfaceBorder,
              },
            ]}
          />

          <TextInput
            placeholder="Commitment description *"
            placeholderTextColor={colors.textMuted}
            value={commitment}
            onChangeText={setCommitment}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.textPrimary,
                borderColor: colors.surfaceBorder,
              },
            ]}
          />

          <TextInput
            placeholder="Due date (YYYY-MM-DD)"
            placeholderTextColor={colors.textMuted}
            value={dueDate}
            onChangeText={setDueDate}
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.textPrimary,
                borderColor: colors.surfaceBorder,
              },
            ]}
          />

          <TextInput
            placeholder="Email address (optional)"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.textPrimary,
                borderColor: colors.surfaceBorder,
              },
            ]}
          />

          <TextInput
            placeholder="Phone number (optional)"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.textPrimary,
                borderColor: colors.surfaceBorder,
              },
            ]}
          />

          <TextInput
            placeholder="WhatsApp number (optional)"
            placeholderTextColor={colors.textMuted}
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.textPrimary,
                borderColor: colors.surfaceBorder,
              },
            ]}
          />

          <View style={styles.recurrenceRow}>
            <Text style={[styles.recurrenceLabel, { color: colors.textMuted }]}>
              Recurrence:
            </Text>
            <View style={styles.chipsContainer}>
              {(["none", "daily", "weekly", "monthly"] as const).map((r) => {
                const isSelected = recurrenceInterval === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => handleRecurrenceSelect(r)}
                    accessibilityRole="button"
                    accessibilityLabel={`Recurrence ${r}`}
                    style={[
                      styles.chip,
                      {
                        borderColor: isSelected ? colors.accent : colors.surfaceBorder,
                        backgroundColor: isSelected ? colors.accent : colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSelected ? "#ffffff" : colors.textPrimary },
                      ]}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TouchButton label="Save Follow Up" onPress={handleCreate} variant="primary" />
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {(["open", "completed", "all"] as const).map((st) => {
          const isSelected = statusFilter === st;
          return (
            <Pressable
              key={st}
              onPress={() => handleStatusFilterChange(st)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${st}`}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isSelected ? colors.accent : colors.surface,
                  borderColor: colors.surfaceBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isSelected ? "#ffffff" : colors.textMuted },
                ]}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading commitments...
          </Text>
        </View>
      );
    }
    return (
      <EmptyState
        title="No follow ups found"
        description={
          statusFilter === "open"
            ? "You have zero pending follow-up commitments."
            : "No follow-ups match this status."
        }
        actionLabel="+ Add Follow Up"
        onAction={() => setShowAddForm(true)}
      />
    );
  };

  return (
    <FlatList
      testID="followups-screen"
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      data={loading ? [] : filtered}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={Platform.OS === "android"}
    />
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  recurrenceRow: {
    gap: 8,
  },
  recurrenceLabel: {
    fontSize: 13,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    minWidth: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  filterTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  itemCard: {
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardHeaderMain: {
    flex: 1,
    marginRight: 8,
  },
  personNameText: {
    fontSize: 16,
    fontWeight: "700",
  },
  commitmentText: {
    fontSize: 14,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 12,
  },
  linkedNoteText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  launchersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  launcherBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  launcherBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
});
