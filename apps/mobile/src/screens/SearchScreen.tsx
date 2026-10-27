import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { SearchService, SearchResults } from "../services/search";
import { TaskItemCard } from "../components/TaskItemCard";
import { NoteItemCard } from "../components/NoteItemCard";
import type { TaskRepository } from "../storage/taskRepository";
import { useTheme } from "../services/theme";

export interface SearchScreenProps {
  searchService: SearchService;
  taskRepo: TaskRepository;
  onNavigateToTask: (taskId: string) => void;
  onNavigateToNote: (noteId: string) => void;
}

export function SearchScreen({
  searchService,
  taskRepo,
  onNavigateToTask,
  onNavigateToNote,
}: SearchScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    query: "",
    tasks: [],
    notes: [],
    totalCount: 0,
  });
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ query: "", tasks: [], notes: [], totalCount: 0 });
      return;
    }

    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await searchService.search(query);
        setResults(res);
      } finally {
        setSearching(false);
      }
    }, 150);

    return () => clearTimeout(timeout);
  }, [query, searchService]);

  const handleToggleTaskComplete = async (taskId: string) => {
    await taskRepo.toggleComplete(taskId);
    const res = await searchService.search(query);
    setResults(res);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      testID="search-screen"
    >
      <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
        Search
      </Text>

      {/* Search Input */}
      <View style={styles.inputContainer}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search tasks and notes..."
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Search across tasks and notes"
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accent,
              color: colors.textPrimary,
            },
          ]}
        />
      </View>

      {searching ? (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            Searching...
          </Text>
        </View>
      ) : null}

      {!searching && query.trim() && results.totalCount === 0 ? (
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, { color: colors.textMuted }]}>
            No tasks or notes found matching &ldquo;{query}&rdquo;.
          </Text>
        </View>
      ) : null}

      {/* Task Matches */}
      {results.tasks.length > 0 ? (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.textMuted }]}>
            Tasks ({results.tasks.length})
          </Text>
          <View style={styles.cardsList}>
            {results.tasks.map((task) => (
              <TaskItemCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleTaskComplete}
                onPress={onNavigateToTask}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Note Matches */}
      {results.notes.length > 0 ? (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeaderTitle, { color: colors.textMuted }]}>
            Notes ({results.notes.length})
          </Text>
          <View style={styles.cardsList}>
            {results.notes.map((note) => (
              <NoteItemCard
                key={note.id}
                note={note}
                onPress={onNavigateToNote}
              />
            ))}
          </View>
        </View>
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
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 15,
  },
  statusContainer: {
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
  },
  sectionContainer: {
    marginBottom: 20,
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardsList: {
    gap: 8,
  },
});
