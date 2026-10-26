import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import type { AuthService } from "../services/auth.js";
import type { SyncEngine } from "../services/syncEngine.js";
import type { SyncRepository } from "../storage/syncRepository.js";
import type { MobileAuthState, SessionInfo, AdoptionSummary } from "../types/auth.js";
import type { MobileSyncState, ConflictRecord } from "../types/sync.js";
import { ConflictModal } from "../components/ConflictModal.js";
import { TouchButton } from "../components/primitives.js";
import { useTheme } from "../services/theme.js";

export interface AccountScreenProps {
  authService: AuthService;
  syncEngine: SyncEngine;
  syncRepo: SyncRepository;
}

export function AccountScreen({
  authService,
  syncEngine,
  syncRepo,
}: AccountScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const [authState, setAuthState] = useState<MobileAuthState>(authService.getAuthState());
  const [syncState, setSyncState] = useState<MobileSyncState>(syncEngine.getSyncState());

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [adoptionSummary, setAdoptionSummary] = useState<AdoptionSummary | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const unsubAuth = authService.subscribe((state) => {
      setAuthState(state);
    });
    const unsubSync = syncEngine.subscribe((state) => {
      setSyncState(state);
    });
    return () => {
      unsubAuth();
      unsubSync();
    };
  }, [authService, syncEngine]);

  useEffect(() => {
    if (authState.status === "authenticated" && authState.user) {
      authService.listSessions().then((res) => {
        if (res.ok && res.sessions) setSessions(res.sessions);
      });
      syncRepo.listConflicts(authState.user.id).then((confs) => {
        setConflicts(confs);
      });
    }
  }, [authState.status, authState.user, authService, syncRepo, syncState.status]);

  const handleSendOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await authService.requestOtp(email);
      if (res.ok) {
        setStep("otp");
        setSuccessMessage("Verification code sent to your email!");
      } else {
        setErrorMessage(res.error || "Failed to send verification code");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await authService.verifyOtp(email, otpCode);
      if (res.ok) {
        setSuccessMessage("Successfully signed in!");
        const summary = await authService.inspectLocalData();
        const totalItems =
          summary.taskCount +
          summary.noteCount +
          summary.followUpCount +
          summary.planCount +
          summary.inboxCount;
        if (totalItems > 0) {
          setAdoptionSummary(summary);
        } else {
          await syncEngine.syncOnce().catch(() => {});
        }
      } else {
        setErrorMessage(res.error || "Invalid verification code");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdoptLocalData = async () => {
    setIsLoading(true);
    try {
      await authService.adoptLocalData();
      setAdoptionSummary(null);
      await syncEngine.syncOnce().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipAdoption = async () => {
    setAdoptionSummary(null);
    await syncEngine.syncOnce().catch(() => {});
  };

  const handleSyncNow = async () => {
    setIsLoading(true);
    try {
      await syncEngine.syncOnce();
      if (authState.user) {
        const confs = await syncRepo.listConflicts(authState.user.id);
        setConflicts(confs);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setStep("email");
      setEmail("");
      setOtpCode("");
      setSuccessMessage("Signed out successfully");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    setShowDeleteConfirm(false);
    try {
      const res = await authService.deleteAccount();
      if (res.ok) {
        setStep("email");
        setEmail("");
        setOtpCode("");
        setSuccessMessage("Account deleted successfully");
      } else {
        setErrorMessage(res.error || "Failed to delete account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveConflict = async (conflictId: string, choice: "keepServer" | "keepLocal") => {
    await syncEngine.resolveConflict(conflictId, choice);
    if (authState.user) {
      const remaining = await syncRepo.listConflicts(authState.user.id);
      setConflicts(remaining);
      if (remaining.length === 0) setShowConflicts(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "syncing":
        return { text: "Syncing", bg: "#1e3a8a", color: "#93c5fd" };
      case "conflict":
        return { text: "Conflict", bg: "#7c2d12", color: "#fdba74" };
      case "error":
        return { text: "Error", bg: "#7f1d1d", color: "#fca5a5" };
      case "offline":
        return { text: "Offline", bg: "#713f12", color: "#fde047" };
      default:
        return { text: "Synced", bg: "#064e3b", color: "#6ee7b7" };
    }
  };

  const badge = getStatusBadge(syncState.status);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      testID="account-screen"
    >
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          Account & Sync
        </Text>
        <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
          Optional passwordless synchronization across devices
        </Text>
      </View>

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

      {successMessage ? (
        <View
          accessibilityRole="alert"
          style={[styles.bannerAlert, { backgroundColor: "#064e3b", borderColor: colors.success }]}
        >
          <Text style={[styles.bannerAlertText, { color: "#a7f3d0" }]}>
            {successMessage}
          </Text>
        </View>
      ) : null}

      {/* Local Data Adoption Prompt */}
      {adoptionSummary ? (
        <View
          accessibilityRole="region"
          accessibilityLabel="Local Data Adoption Prompt"
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.accent }]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Adopt Local Data into Account?
          </Text>
          <Text style={[styles.bodyText, { color: colors.textMuted }]}>
            We found {adoptionSummary.taskCount} tasks, {adoptionSummary.noteCount} notes, and{" "}
            {adoptionSummary.followUpCount} follow-ups created on this device. Would you like to upload them to your cloud account?
          </Text>
          <View style={styles.buttonRow}>
            <TouchButton
              label={isLoading ? "Uploading..." : "Upload to Cloud"}
              onPress={handleAdoptLocalData}
              disabled={isLoading}
              variant="primary"
              style={styles.flexButton}
            />
            <TouchButton
              label="Start Fresh"
              onPress={handleSkipAdoption}
              disabled={isLoading}
              variant="secondary"
              style={styles.flexButton}
            />
          </View>
        </View>
      ) : null}

      {authState.status === "authenticated" && authState.user ? (
        <View style={styles.authenticatedSection}>
          {/* Profile Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>
              Signed In As
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textPrimary }]}>
              {authState.user.email}
            </Text>
            <Text style={[styles.profileId, { color: colors.textMuted }]}>
              User ID: {authState.user.id}
            </Text>
          </View>

          {/* Sync Status Card */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.syncHeaderRow}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Cloud Synchronization
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                  {badge.text}
                </Text>
              </View>
            </View>

            <View style={styles.syncDetails}>
              <Text style={[styles.detailText, { color: colors.textMuted }]}>
                Last Synced:{" "}
                <Text style={{ color: colors.textPrimary }}>
                  {syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleTimeString() : "Never"}
                </Text>
              </Text>
              <Text style={[styles.detailText, { color: colors.textMuted }]}>
                Pending Outbox Changes:{" "}
                <Text style={{ color: colors.textPrimary }}>{syncState.pendingMutationsCount}</Text>
              </Text>
              {syncState.unresolvedConflictsCount > 0 ? (
                <Text style={[styles.detailText, { color: "#fdba74" }]}>
                  Unresolved Conflicts: {syncState.unresolvedConflictsCount}
                </Text>
              ) : null}
            </View>

            <View style={styles.buttonRow}>
              <TouchButton
                label={isLoading ? "Syncing..." : "Sync Now"}
                onPress={handleSyncNow}
                disabled={isLoading}
                variant="primary"
                style={styles.flexButton}
              />
              {conflicts.length > 0 ? (
                <TouchButton
                  label={`Review Conflicts (${conflicts.length})`}
                  onPress={() => setShowConflicts(true)}
                  variant="danger"
                  style={styles.flexButton}
                />
              ) : null}
            </View>
          </View>

          {/* Active Sessions */}
          {sessions.length > 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Active Sessions ({sessions.length})
              </Text>
              {sessions.map((s) => (
                <View
                  key={s.id}
                  style={[styles.sessionRow, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}
                >
                  <View style={styles.sessionInfo}>
                    <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>
                      {s.isCurrent ? "This Device (Current)" : "Other Session"}
                    </Text>
                    <Text style={[styles.sessionDate, { color: colors.textMuted }]}>
                      Expires: {new Date(s.expiresAt).toLocaleDateString()}
                    </Text>
                  </View>
                  {!s.isCurrent ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Revoke session"
                      onPress={async () => {
                        await authService.revokeSession(s.id);
                        const updated = await authService.listSessions();
                        if (updated.ok && updated.sessions) setSessions(updated.sessions);
                      }}
                      style={({ pressed }) => [
                        styles.revokeButton,
                        pressed ? { opacity: 0.8 } : null,
                      ]}
                    >
                      <Text style={styles.revokeButtonText}>Revoke</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {/* Account Actions */}
          <View style={styles.accountActionSection}>
            <TouchButton
              label="Sign Out"
              onPress={handleSignOut}
              disabled={isLoading}
              variant="secondary"
            />
            <TouchButton
              label="Delete Cloud Account"
              onPress={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
              variant="danger"
            />
          </View>
        </View>
      ) : (
        /* Sign In Flow */
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          {step === "email" ? (
            <View style={styles.formContainer}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Email Address
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.surfaceBorder,
                    color: colors.textPrimary,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Email Address"
              />
              <TouchButton
                label={isLoading ? "Sending..." : "Send Verification Code"}
                onPress={handleSendOtp}
                disabled={isLoading || !email.trim()}
                variant="primary"
              />
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={[styles.bodyText, { color: colors.textMuted }]}>
                Enter the 6-digit code sent to{" "}
                <Text style={{ color: colors.textPrimary, fontWeight: "bold" }}>{email}</Text>
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                Verification Code
              </Text>
              <TextInput
                style={[
                  styles.otpInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.surfaceBorder,
                    color: colors.textPrimary,
                  },
                ]}
                maxLength={6}
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                accessibilityLabel="Verification Code"
              />

              <TouchButton
                label={isLoading ? "Verifying..." : "Verify & Sign In"}
                onPress={handleVerifyOtp}
                disabled={isLoading || otpCode.trim().length !== 6}
                variant="primary"
              />

              <TouchButton
                label="Use a different email address"
                onPress={() => setStep("email")}
                variant="ghost"
              />
            </View>
          )}
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModalBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.confirmModalTitle, { color: colors.textPrimary }]}>
              Delete Cloud Account?
            </Text>
            <Text style={[styles.confirmModalMessage, { color: colors.textMuted }]}>
              Are you sure you want to delete your cloud account? This action cannot be undone and will erase your cloud backups. Local data on this device will be preserved.
            </Text>
            <View style={styles.buttonRow}>
              <TouchButton
                label="Cancel"
                onPress={() => setShowDeleteConfirm(false)}
                variant="secondary"
                style={styles.flexButton}
              />
              <TouchButton
                label="Delete Account"
                onPress={handleDeleteAccount}
                variant="danger"
                style={styles.flexButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Conflict Modal */}
      {showConflicts ? (
        <ConflictModal
          conflicts={conflicts}
          onResolve={handleResolveConflict}
          onClose={() => setShowConflicts(false)}
        />
      ) : null}
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
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  screenSubtitle: {
    fontSize: 14,
  },
  bannerAlert: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  bannerAlertText: {
    fontSize: 14,
    fontWeight: "500",
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  authenticatedSection: {
    gap: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionCaption: {
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  profileEmail: {
    fontSize: 18,
    fontWeight: "bold",
  },
  profileId: {
    fontSize: 12,
  },
  syncHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  syncDetails: {
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  sessionDate: {
    fontSize: 11,
  },
  revokeButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    backgroundColor: "#7f1d1d",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  revokeButtonText: {
    color: "#fecaca",
    fontSize: 12,
    fontWeight: "600",
  },
  accountActionSection: {
    gap: 12,
    marginTop: 8,
  },
  formContainer: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  otpInput: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  flexButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmModalBox: {
    width: "100%",
    maxWidth: 420,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  confirmModalMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
});
