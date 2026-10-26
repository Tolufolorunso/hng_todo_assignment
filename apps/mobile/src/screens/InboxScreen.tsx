import React, { useState, useEffect } from "react";
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
    <div
      role="region"
      aria-label="Fast Capture Inbox screen"
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
      <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 16px 0" }}>
        Fast Capture Inbox
      </h1>

      {/* Quick capture input box */}
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
        <textarea
          placeholder="Quick idea, thought, or task..."
          value={captureText}
          onChange={(e) => setCaptureText(e.target.value)}
          rows={3}
          style={{
            padding: "10px",
            borderRadius: "8px",
            backgroundColor: colors.background,
            color: colors.textPrimary,
            border: `1px solid ${colors.surfaceBorder}`,
            fontSize: "14px",
            resize: "vertical",
          }}
        />
        <input
          type="url"
          placeholder="Optional link (https://...)"
          value={sharedUrl}
          onChange={(e) => setSharedUrl(e.target.value)}
          style={{
            padding: "8px 10px",
            borderRadius: "8px",
            backgroundColor: colors.background,
            color: colors.textPrimary,
            border: `1px solid ${colors.surfaceBorder}`,
            fontSize: "13px",
          }}
        />
        <TouchButton label="Capture to Inbox" onPress={handleCapture} variant="primary" />
      </div>

      {/* Recipient prompt modal when triaging to follow up */}
      {promptCaptureId && (
        <div
          style={{
            backgroundColor: colors.surface,
            border: `2px solid ${colors.accent}`,
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "14px" }}>Who is this follow-up for?</div>
          <input
            type="text"
            placeholder="Contact or person name *"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: "8px",
              backgroundColor: colors.background,
              color: colors.textPrimary,
              border: `1px solid ${colors.surfaceBorder}`,
              fontSize: "14px",
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
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
          </div>
        </div>
      )}

      {/* Triage Queue */}
      <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
        Pending Queue ({captures.length})
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "24px", color: colors.textMuted }}>Loading...</div>
      ) : captures.length === 0 ? (
        <EmptyState
          title="Inbox is clear"
          description="Everything has been triaged into tasks, notes, or follow-ups!"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {captures.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "14px", color: colors.textPrimary, whiteSpace: "pre-wrap" }}>
                {item.text}
              </div>

              {item.sharedUrl && (
                <div style={{ fontSize: "12px", color: colors.accent, wordBreak: "break-all" }}>
                  Link: {item.sharedUrl}
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
