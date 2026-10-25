import React from "react";

export interface TouchButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function TouchButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: TouchButtonProps): React.JSX.Element {
  const getBackgroundColor = () => {
    if (disabled) return "#374151";
    switch (variant) {
      case "primary":
        return "#3b82f6";
      case "danger":
        return "#ef4444";
      case "secondary":
        return "#1f2937";
      case "ghost":
        return "transparent";
    }
  };

  const getTextColor = () => {
    if (disabled) return "#9ca3af";
    if (variant === "ghost") return "#60a5fa";
    return "#ffffff";
  };

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      role="button"
      aria-label={accessibilityLabel || label}
      aria-disabled={disabled}
      data-testid={testID}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "44px",
        minWidth: "44px",
        padding: "8px 16px",
        borderRadius: "8px",
        border: variant === "secondary" ? "1px solid #374151" : "none",
        backgroundColor: getBackgroundColor(),
        color: getTextColor(),
        fontSize: "14px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        touchAction: "manipulation",
      }}
    >
      {label}
    </button>
  );
}

export interface BadgeProps {
  label: string;
  variant?: "low" | "medium" | "high" | "category" | "neutral";
}

export function Badge({ label, variant = "neutral" }: BadgeProps): React.JSX.Element {
  const getColors = () => {
    switch (variant) {
      case "high":
        return { bg: "#7f1d1d", text: "#fca5a5" };
      case "medium":
        return { bg: "#78350f", text: "#fde68a" };
      case "low":
        return { bg: "#064e3b", text: "#a7f3d0" };
      case "category":
        return { bg: "#1e1b4b", text: "#c7d2fe" };
      default:
        return { bg: "#374151", text: "#d1d5db" };
    }
  };

  const colors = getColors();
  return (
    <span
      role="status"
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "9999px",
        backgroundColor: colors.bg,
        color: colors.text,
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      role="region"
      aria-label={title}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        textAlign: "center",
        color: "#9ca3af",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: 600, color: "#e5e7eb", marginBottom: "8px" }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "16px", maxWidth: "300px" }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <TouchButton label={actionLabel} onPress={onAction} variant="primary" />
      )}
    </div>
  );
}
