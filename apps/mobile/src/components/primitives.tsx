import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export interface TouchButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;
}

export function TouchButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: TouchButtonProps): React.JSX.Element {
  const getBackgroundColor = (): string => {
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

  const getTextColor = (): string => {
    if (disabled) return "#9ca3af";
    if (variant === "ghost") return "#60a5fa";
    return "#ffffff";
  };

  const buttonStyles: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: variant === "secondary" ? "#374151" : "transparent",
    borderWidth: variant === "secondary" ? 1 : 0,
  };

  const textStyles: TextStyle = {
    color: getTextColor(),
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.buttonBase,
        buttonStyles,
        pressed && !disabled ? styles.buttonPressed : null,
        style,
      ]}
    >
      <Text style={[styles.buttonText, textStyles]}>{label}</Text>
    </Pressable>
  );
}

export interface BadgeProps {
  label: string;
  variant?: "low" | "medium" | "high" | "category" | "neutral";
  style?: ViewStyle;
}

export function Badge({ label, variant = "neutral", style }: BadgeProps): React.JSX.Element {
  const getColors = (): { bg: string; text: string } => {
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
    <View style={[styles.badgeBase, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {label}
      </Text>
    </View>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps): React.JSX.Element {
  return (
    <View style={[styles.emptyContainer, style]} accessibilityRole="summary">
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? (
        <Text style={styles.emptyDescription}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchButton label={actionLabel} onPress={onAction} variant="primary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  badgeBase: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    color: "#9ca3af",
    marginBottom: 16,
    textAlign: "center",
    maxWidth: 300,
  },
});
