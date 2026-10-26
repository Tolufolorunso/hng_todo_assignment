import React, { useState } from "react";
import type { ConflictRecord } from "../types/sync.js";
import { useTheme } from "../services/theme.js";

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resolve Sync Conflicts"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: colors.surface,
          borderRadius: "16px",
          padding: "20px",
          border: `1px solid ${colors.surfaceBorder}`,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "bold", color: colors.textPrimary, margin: 0 }}>
            Sync Conflicts ({conflicts.length})
          </h2>
          <button
            onClick={onClose}
            aria-label="Close conflict modal"
            style={{
              minWidth: "44px",
              minHeight: "44px",
              background: "none",
              border: "none",
              color: colors.textMuted,
              fontSize: "20px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "14px", color: colors.textMuted, margin: 0 }}>
          Differences were detected between this device and the server. Choose which version you want to keep.
        </p>

        {conflicts.map((c) => {
          const isBusy = resolvingId === c.id;
          return (
            <div
              key={c.id}
              style={{
                backgroundColor: colors.background,
                borderRadius: "12px",
                padding: "16px",
                border: `1px solid ${colors.surfaceBorder}`,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: "bold", color: colors.accent, textTransform: "uppercase" }}>
                  {c.entityType} ({c.entityId})
                </span>
                <span style={{ fontSize: "12px", color: colors.textMuted }}>
                  Server Rev: {c.serverRevision}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#60a5fa", marginBottom: "4px" }}>
                    Device Version (Local)
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "8px",
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: colors.textPrimary,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {formatPayload(c.localValue)}
                  </pre>
                </div>

                <div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#34d399", marginBottom: "4px" }}>
                    Server Version (Cloud)
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "8px",
                      backgroundColor: "rgba(0, 0, 0, 0.3)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: colors.textPrimary,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {formatPayload(c.serverValue)}
                  </pre>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button
                  disabled={isBusy}
                  onClick={() => handleAction(c.id, "keepServer")}
                  aria-label="Keep Server Version"
                  style={{
                    flex: 1,
                    minHeight: "44px",
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: isBusy ? "not-allowed" : "pointer",
                    opacity: isBusy ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Keep Server
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => handleAction(c.id, "keepLocal")}
                  aria-label="Keep Local Version"
                  style={{
                    flex: 1,
                    minHeight: "44px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    borderRadius: "8px",
                    border: "none",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: isBusy ? "not-allowed" : "pointer",
                    opacity: isBusy ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Keep Local
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
