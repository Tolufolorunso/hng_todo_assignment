import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type {
  FollowUp,
  FollowUpStatus,
  RecurrenceRule,
} from "../types/followup.js";
import type { FollowUpRepository } from "../storage/followUpRepository.js";
import { TouchButton, Badge, EmptyState } from "../components/primitives.js";
import { launchAction } from "../services/launchers.js";
import { notificationScheduler } from "../services/notifications.js";
import { useTheme } from "../services/theme.js";

export interface FollowUpsScreenProps {
  followUpRepo: FollowUpRepository;
}

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
  const [recurrenceInterval, setRecurrenceInterval] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadFollowUps = async () => {
    setLoading(true);
    try {
      const all = await followUpRepo.list();
      setFollowups(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, []);

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

  const handleComplete = async (id: string) => {
    await followUpRepo.completeOccurrence(id, "completed");
    await notificationScheduler.cancelByTargetId(id);
    await loadFollowUps();
  };

  const handleSnooze = async (id: string) => {
    await followUpRepo.snooze(id, 24);
    await loadFollowUps();
  };

  const handleDelete = async (id: string) => {
    await followUpRepo.delete(id);
    await notificationScheduler.cancelByTargetId(id);
    await loadFollowUps();
  };

  const filtered = followups.filter((f) => {
    if (statusFilter === "all") return true;
    return f.status === statusFilter;
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      testID="followups-screen"
    >
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
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
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
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
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
            keyboardType="phone-pad"
            value={whatsapp}
            onChangeText={setWhatsapp}
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
                    onPress={() => setRecurrenceInterval(r)}
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
              onPress={() => setStatusFilter(st)}
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading commitments...
          </Text>
        </View>
      ) : filtered.length === 0 ? (
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
      ) : (
        <View style={styles.listContainer}>
          {filtered.map((fu) => (
            <View
              key={fu.id}
              style={[
                styles.itemCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderMain}>
                  <Text style={[styles.personNameText, { color: colors.textPrimary }]}>
                    {fu.personName}
                  </Text>
                  <Text style={[styles.commitmentText, { color: colors.textSecondary }]}>
                    {fu.commitment}
                  </Text>
                </View>
                <Badge
                  label={fu.status}
                  variant={fu.status === "completed" ? "low" : "high"}
                />
              </View>

              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  Due: {fu.dueAt.slice(0, 10)}
                </Text>
                {fu.recurrence && (
                  <Badge
                    label={`${fu.recurrence.frequency} (${fu.recurrence.mode})`}
                    variant="neutral"
                  />
                )}
                {fu.sourceExcerpt && (
                  <Text style={[styles.linkedNoteText, { color: colors.accent }]}>
                    Linked Note
                  </Text>
                )}
              </View>

              {/* Native communication launchers */}
              <View style={styles.launchersRow}>
                {fu.emailAddress && (
                  <Pressable
                    onPress={() => launchAction("email", fu.emailAddress!, { subject: `Follow-up: ${fu.commitment}` })}
                    accessibilityRole="button"
                    accessibilityLabel={`Email ${fu.personName}`}
                    style={[styles.launcherBtn, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}
                  >
                    <Ionicons name="mail-outline" size={14} color={colors.accent} />
                    <Text style={[styles.launcherBtnText, { color: colors.accent, marginLeft: 4 }]}>
                      Email
                    </Text>
                  </Pressable>
                )}
                {fu.phoneNumber && (
                  <Pressable
                    onPress={() => launchAction("phone", fu.phoneNumber!)}
                    accessibilityRole="button"
                    accessibilityLabel={`Call ${fu.personName}`}
                    style={[styles.launcherBtn, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}
                  >
                    <Ionicons name="call-outline" size={14} color={colors.success} />
                    <Text style={[styles.launcherBtnText, { color: colors.success, marginLeft: 4 }]}>
                      Call
                    </Text>
                  </Pressable>
                )}
                {fu.whatsAppNumber && (
                  <Pressable
                    onPress={() =>
                      launchAction("whatsapp", fu.whatsAppNumber!, {
                        body: `Hi ${fu.personName}, following up on: ${fu.commitment}`,
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`WhatsApp ${fu.personName}`}
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
              {fu.status === "open" && (
                <View style={styles.actionsRow}>
                  <TouchButton
                    label="Complete"
                    onPress={() => handleComplete(fu.id)}
                    variant="primary"
                  />
                  <TouchButton
                    label="Snooze +24h"
                    onPress={() => handleSnooze(fu.id)}
                    variant="secondary"
                  />
                  <TouchButton
                    label="Delete"
                    onPress={() => handleDelete(fu.id)}
                    variant="ghost"
                  />
                </View>
              )}
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
  listContainer: {
    gap: 12,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
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
