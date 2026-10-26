import React, { useState, useEffect } from "react";
import type { FollowUp, FollowUpStatus, CreateFollowUpInput, RecurrenceRule } from "../types/followup.js";
import type { FollowUpRepository } from "../storage/followUpRepository.js";
import { TouchButton, Badge, EmptyState } from "../components/primitives.js";
import { createMailtoUri, createTelUri, createWhatsAppUri } from "../services/launchers.js";
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
    if (!personName.trim() || !commitment.trim()) return;

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

    await followUpRepo.create({
      personName: personName.trim(),
      commitment: commitment.trim(),
      dueAt: `${dueDate}T12:00:00.000Z`,
      emailAddress: email.trim() || null,
      phoneNumber: phone.trim() || null,
      whatsAppNumber: whatsapp.trim() || null,
      recurrence,
    });

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
    await loadFollowUps();
  };

  const handleSnooze = async (id: string) => {
    await followUpRepo.snooze(id, 24);
    await loadFollowUps();
  };

  const handleDelete = async (id: string) => {
    await followUpRepo.delete(id);
    await loadFollowUps();
  };

  const filtered = followups.filter((f) => {
    if (statusFilter === "all") return true;
    return f.status === statusFilter;
  });

  return (
    <div
      role="region"
      aria-label="Follow Ups screen"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: colors.background,
        color: colors.textPrimary,
        padding: "16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Follow Ups</h1>
        <TouchButton
          label={showAddForm ? "Cancel" : "+ Add Follow Up"}
          onPress={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? "secondary" : "primary"}
        />
      </div>

      {showAddForm && (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.surfaceBorder}`,
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "15px" }}>New Follow Up Commitment</div>
          <input
            type="text"
            placeholder="Person or contact name *"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.surfaceBorder}`,
              fontSize: "14px",
            }}
          />
          <input
            type="text"
            placeholder="Commitment description *"
            value={commitment}
            onChange={(e) => setCommitment(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.surfaceBorder}`,
              fontSize: "14px",
            }}
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.surfaceBorder}`,
              fontSize: "14px",
            }}
          />
          <input
            type="email"
            placeholder="Email address (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.surfaceBorder}`,
              fontSize: "14px",
            }}
          />
          <input
            type="tel"
            placeholder="Phone number (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.surfaceBorder}`,
              fontSize: "14px",
            }}
          />
          <input
            type="tel"
            placeholder="WhatsApp number (optional)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.surfaceBorder}`,
              fontSize: "14px",
            }}
          />
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: colors.textMuted }}>Recurrence:</span>
            {(["none", "daily", "weekly", "monthly"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRecurrenceInterval(r)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${recurrenceInterval === r ? colors.accent : colors.surfaceBorder}`,
                  backgroundColor: recurrenceInterval === r ? colors.accent : "transparent",
                  color: recurrenceInterval === r ? "#ffffff" : colors.textPrimary,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
          <TouchButton label="Save Follow Up" onPress={handleCreate} variant="primary" />
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {(["open", "completed", "all"] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "none",
              backgroundColor: statusFilter === st ? colors.accent : colors.surface,
              color: statusFilter === st ? "#ffffff" : colors.textMuted,
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              minHeight: "44px",
            }}
          >
            {st.charAt(0).toUpperCase() + st.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "24px", color: colors.textMuted }}>Loading...</div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((fu) => (
            <div
              key={fu.id}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: colors.textPrimary }}>
                    {fu.personName}
                  </div>
                  <div style={{ fontSize: "14px", color: colors.textSecondary, marginTop: "2px" }}>
                    {fu.commitment}
                  </div>
                </div>
                <Badge
                  label={fu.status}
                  variant={fu.status === "completed" ? "low" : "high"}
                />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "12px", color: colors.textMuted }}>
                <span>Due: {fu.dueAt.slice(0, 10)}</span>
                {fu.recurrence && (
                  <Badge
                    label={`${fu.recurrence.frequency} (${fu.recurrence.mode})`}
                    variant="neutral"
                  />
                )}
                {fu.sourceExcerpt && (
                  <span style={{ fontStyle: "italic", color: colors.accent }}>Linked Note</span>
                )}
              </div>

              {/* Launcher intent shortcuts */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                {fu.emailAddress && (
                  <a
                    href={createMailtoUri(fu.emailAddress, { subject: `Follow-up: ${fu.commitment}` })}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                      color: colors.accent,
                      fontSize: "12px",
                      textDecoration: "none",
                      minHeight: "36px",
                    }}
                  >
                    ✉ Email
                  </a>
                )}
                {fu.phoneNumber && (
                  <a
                    href={createTelUri(fu.phoneNumber)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      color: colors.success,
                      fontSize: "12px",
                      textDecoration: "none",
                      minHeight: "36px",
                    }}
                  >
                    📞 Call
                  </a>
                )}
                {fu.whatsAppNumber && (
                  <a
                    href={createWhatsAppUri(fu.whatsAppNumber, `Hi ${fu.personName}, following up on: ${fu.commitment}`)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(37, 211, 102, 0.15)",
                      color: "#25d366",
                      fontSize: "12px",
                      textDecoration: "none",
                      minHeight: "36px",
                    }}
                  >
                    💬 WhatsApp
                  </a>
                )}
              </div>

              {/* Action buttons */}
              {fu.status === "open" && (
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <TouchButton
                    label="✓ Complete"
                    onPress={() => handleComplete(fu.id)}
                    variant="primary"
                  />
                  <TouchButton
                    label="💤 Snooze +24h"
                    onPress={() => handleSnooze(fu.id)}
                    variant="secondary"
                  />
                  <TouchButton
                    label="Delete"
                    onPress={() => handleDelete(fu.id)}
                    variant="ghost"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
