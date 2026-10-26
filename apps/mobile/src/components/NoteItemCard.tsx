import React from "react";
import {
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import type { Note } from "../types/note.js";
import { useTheme } from "../services/theme.js";
import { hapticFeedback } from "../services/haptics.js";
import {
  getPlatformCardStyle,
  getPlatformRipple,
} from "../styles/platform.js";

export interface NoteItemCardProps {
  note: Note;
  onPress: (id: string) => void;
}

export const NoteItemCard = React.memo(function NoteItemCard({
  note,
  onPress,
}: NoteItemCardProps): React.JSX.Element {
  const { colors, mode } = useTheme();

  const handlePress = () => {
    hapticFeedback.light();
    onPress(note.id);
  };

  const rippleConfig = getPlatformRipple(
    mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"
  );

  const cardPlatformStyle = getPlatformCardStyle(
    colors.surface,
    colors.surfaceBorder
  );

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Note: ${note.title}`}
      android_ripple={rippleConfig}
      style={({ pressed }) => [
        styles.card,
        cardPlatformStyle,
        pressed && styles.cardPressed,
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {note.title}
      </Text>

      {note.body ? (
        <Text
          style={[styles.body, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {note.body}
        </Text>
      ) : null}

      <Text style={[styles.dateText, { color: colors.textMuted }]}>
        Updated {new Date(note.updatedAt).toLocaleDateString()}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 8,
    minHeight: 52,
  },
  cardPressed: {
    opacity: 0.8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  dateText: {
    fontSize: 11,
  },
});
