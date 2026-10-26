import React, { useState, useEffect } from "react";
import type { AuthService } from "../services/auth.js";
import type { SyncEngine } from "../services/syncEngine.js";
import type { SyncRepository } from "../storage/syncRepository.js";
import type { MobileAuthState, SessionInfo, AdoptionSummary } from "../types/auth.js";
import type { MobileSyncState, ConflictRecord } from "../types/sync.js";
import { ConflictModal } from "../components/ConflictModal.js";
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await authService.verifyOtp(email, otpCode);
      if (res.ok) {
        setSuccessMessage("Successfully signed in!");
        // Check if local data exists for adoption
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
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Are you sure you want to delete your cloud account? This action cannot be undone."
      );
      if (!confirmed) return;
    }

    setIsLoading(true);
    try {
      const res = await authService.deleteAccount();
      if (res.ok) {
        setStep("email");
        setEmail("");
        setOtpCode("");
        setSuccessMessage("Account deleted");
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
        return { text: "Syncing...", bg: "#1e3a8a", color: "#93c5fd" };
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

  return (
    <div
      style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "600px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", color: colors.textPrimary, margin: "0 0 6px 0" }}>
          Account & Sync
        </h1>
        <p style={{ fontSize: "14px", color: colors.textMuted, margin: 0 }}>
          Optional passwordless synchronization across devices
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            backgroundColor: "#7f1d1d",
            color: "#fecaca",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          style={{
            padding: "12px 16px",
            backgroundColor: "#064e3b",
            color: "#a7f3d0",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Local Data Adoption Prompt */}
      {adoptionSummary && (
        <div
          role="region"
          aria-label="Local Data Adoption Prompt"
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.accent}`,
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ fontSize: "16px", fontWeight: "bold", color: colors.textPrimary }}>
            Adopt Local Data into Account?
          </div>
          <p style={{ fontSize: "14px", color: colors.textMuted, margin: 0 }}>
            We found {adoptionSummary.taskCount} tasks, {adoptionSummary.noteCount} notes, and{" "}
            {adoptionSummary.followUpCount} follow-ups created on this device. Would you like to upload them to your cloud account?
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleAdoptLocalData}
              disabled={isLoading}
              style={{
                flex: 1,
                minHeight: "44px",
                backgroundColor: colors.accent,
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Upload to Cloud
            </button>
            <button
              onClick={handleSkipAdoption}
              disabled={isLoading}
              style={{
                flex: 1,
                minHeight: "44px",
                backgroundColor: colors.background,
                color: colors.textMuted,
                border: `1px solid ${colors.surfaceBorder}`,
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Start Fresh
            </button>
          </div>
        </div>
      )}

      {/* Authenticated View */}
      {authState.status === "authenticated" && authState.user ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Profile Card */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: "12px",
              padding: "16px",
              border: `1px solid ${colors.surfaceBorder}`,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "12px", color: colors.textMuted, textTransform: "uppercase" }}>
              Signed In As
            </div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: colors.textPrimary }}>
              {authState.user.email}
            </div>
            <div style={{ fontSize: "12px", color: colors.textMuted }}>
              User ID: {authState.user.id}
            </div>
          </div>

          {/* Sync Status Card */}
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: "12px",
              padding: "16px",
              border: `1px solid ${colors.surfaceBorder}`,
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "15px", fontWeight: "bold", color: colors.textPrimary }}>
                Cloud Synchronization
              </span>
              {(() => {
                const badge = getStatusBadge(syncState.status);
                return (
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      backgroundColor: badge.bg,
                      color: badge.color,
                    }}
                  >
                    {badge.text}
                  </span>
                );
              })()}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", color: colors.textMuted }}>
              <div>
                Last Synced:{" "}
                <span style={{ color: colors.textPrimary }}>
                  {syncState.lastSyncedAt ? new Date(syncState.lastSyncedAt).toLocaleTimeString() : "Never"}
                </span>
              </div>
              <div>
                Pending Outbox Changes:{" "}
                <span style={{ color: colors.textPrimary }}>{syncState.pendingMutationsCount}</span>
              </div>
              {syncState.unresolvedConflictsCount > 0 && (
                <div style={{ color: "#fdba74" }}>
                  Unresolved Conflicts: {syncState.unresolvedConflictsCount}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={handleSyncNow}
                disabled={isLoading}
                aria-label="Sync Now"
                style={{
                  flex: 1,
                  minHeight: "44px",
                  backgroundColor: colors.accent,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "14px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isLoading ? "Syncing..." : "Sync Now"}
              </button>
              {conflicts.length > 0 && (
                <button
                  onClick={() => setShowConflicts(true)}
                  aria-label="Review Conflicts"
                  style={{
                    flex: 1,
                    minHeight: "44px",
                    backgroundColor: "#ea580c",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Review Conflicts ({conflicts.length})
                </button>
              )}
            </div>
          </div>

          {/* Active Sessions */}
          {sessions.length > 0 && (
            <div
              style={{
                backgroundColor: colors.surface,
                borderRadius: "12px",
                padding: "16px",
                border: `1px solid ${colors.surfaceBorder}`,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "15px", fontWeight: "bold", color: colors.textPrimary }}>
                Active Sessions ({sessions.length})
              </div>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px",
                    backgroundColor: colors.background,
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                >
                  <div>
                    <div style={{ color: colors.textPrimary }}>
                      {s.isCurrent ? "This Device (Current)" : "Other Session"}
                    </div>
                    <div style={{ fontSize: "11px", color: colors.textMuted }}>
                      Expires: {new Date(s.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <button
                      onClick={async () => {
                        await authService.revokeSession(s.id);
                        const updated = await authService.listSessions();
                        if (updated.ok && updated.sessions) setSessions(updated.sessions);
                      }}
                      style={{
                        minHeight: "36px",
                        padding: "0 10px",
                        backgroundColor: "#7f1d1d",
                        color: "#fecaca",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Account Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              style={{
                minHeight: "44px",
                backgroundColor: colors.background,
                color: colors.textPrimary,
                border: `1px solid ${colors.surfaceBorder}`,
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isLoading}
              style={{
                minHeight: "44px",
                backgroundColor: "transparent",
                color: "#f87171",
                border: "1px solid #7f1d1d",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Delete Cloud Account
            </button>
          </div>
        </div>
      ) : (
        /* Sign In Flow */
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: "12px",
            padding: "20px",
            border: `1px solid ${colors.surfaceBorder}`,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {step === "email" ? (
            <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: colors.textPrimary }}>
                  Email Address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{
                    minHeight: "44px",
                    padding: "0 12px",
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.surfaceBorder}`,
                    borderRadius: "8px",
                    fontSize: "15px",
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  minHeight: "44px",
                  backgroundColor: colors.accent,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "15px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ fontSize: "14px", color: colors.textMuted }}>
                Enter the 6-digit code sent to <strong style={{ color: colors.textPrimary }}>{email}</strong>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: colors.textPrimary }}>
                  Verification Code
                </span>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  required
                  style={{
                    minHeight: "44px",
                    padding: "0 12px",
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.surfaceBorder}`,
                    borderRadius: "8px",
                    fontSize: "18px",
                    letterSpacing: "4px",
                    textAlign: "center",
                  }}
                />
              </label>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  minHeight: "44px",
                  backgroundColor: colors.accent,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "15px",
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => setStep("email")}
                style={{
                  background: "none",
                  border: "none",
                  color: colors.accent,
                  fontSize: "13px",
                  cursor: "pointer",
                  textAlign: "center",
                  padding: "8px",
                }}
              >
                Use a different email address
              </button>
            </form>
          )}
        </div>
      )}

      {/* Conflict Modal */}
      {showConflicts && (
        <ConflictModal
          conflicts={conflicts}
          onResolve={handleResolveConflict}
          onClose={() => setShowConflicts(false)}
        />
      )}
    </div>
  );
}
