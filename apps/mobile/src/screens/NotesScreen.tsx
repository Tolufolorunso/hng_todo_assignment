import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import type { Note } from "../types/note";
import type { NoteRepository } from "../storage/noteRepository";
import { NoteItemCard } from "../components/NoteItemCard";
import { TouchButton, EmptyState } from "../components/primitives";
import { useTheme } from "../services/theme";

export interface NotesScreenProps {
  noteRepo: NoteRepository;
  onNavigateToEdit: (noteId?: string) => void;
}

export function NotesScreen({
  noteRepo,
  onNavigateToEdit,
}: NotesScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const all = await noteRepo.list(searchQuery || undefined);
      setNotes(all);
    } finally {
      setLoading(false);
    }
  }, [noteRepo, searchQuery]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const renderItem = useCallback(
    ({ item }: { item: Note }) => (
      <NoteItemCard note={item} onPress={onNavigateToEdit} />
    ),
    [onNavigateToEdit]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Notes
        </Text>
        <TouchButton
          label="+ New Note"
          onPress={() => onNavigateToEdit()}
          variant="primary"
          accessibilityLabel="Create a new note"
        />
      </View>

      {/* Note Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter notes..."
          placeholderTextColor="#71717a"
          accessibilityLabel="Filter notes by title or body"
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              color: colors.textPrimary,
            },
          ]}
        />
      </View>

      {/* Notes List */}
      {loading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading notes...
          </Text>
        </View>
      ) : notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          description={
            searchQuery
              ? "No notes matched your search query."
              : "Capture thoughts and ideas in standalone notes."
          }
          actionLabel="+ Create Note"
          onAction={() => onNavigateToEdit()}
        />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  loadingArea: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
});
