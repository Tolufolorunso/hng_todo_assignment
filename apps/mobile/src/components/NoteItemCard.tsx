import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import type { Note } from "../types/note.js";

export interface NoteItemCardProps {
  note: Note;
  onPress: (id: string) => void;
}

export function NoteItemCard({ note, onPress }: NoteItemCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={() => onPress(note.id)}
      accessibilityRole="button"
      accessibilityLabel={`Note: ${note.title}`}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <Text style={styles.title}>{note.title}</Text>

      {note.body ? (
        <Text style={styles.body} numberOfLines={2}>
          {note.body}
        </Text>
      ) : null}

      <Text style={styles.dateText}>
        Updated {new Date(note.updatedAt).toLocaleDateString()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    minHeight: 52,
  },
  cardPressed: {
    opacity: 0.8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#f4f4f5",
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: "#a1a1aa",
    marginBottom: 8,
    lineHeight: 18,
  },
  dateText: {
    fontSize: 11,
    color: "#71717a",
  },
});
