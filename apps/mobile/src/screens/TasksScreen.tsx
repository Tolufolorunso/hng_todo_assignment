import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import type { Task, TaskCategory } from "../types/task.js";
import type { TaskRepository } from "../storage/taskRepository.js";
import { TaskItemCard } from "../components/TaskItemCard.js";
import { TouchButton, EmptyState } from "../components/primitives.js";
import { useTheme } from "../services/theme.js";

export interface TasksScreenProps {
  taskRepo: TaskRepository;
  onNavigateToEdit: (taskId?: string) => void;
  onNavigateToPlan?: () => void;
}

const CATEGORIES: (TaskCategory | "all")[] = [
  "all",
  "work",
  "personal",
  "urgent",
  "study",
  "ideas",
];

export function TasksScreen({
  taskRepo,
  onNavigateToEdit,
  onNavigateToPlan,
}: TasksScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");

  const loadTasks = async () => {
    setLoading(true);
    try {
      const all = await taskRepo.list();
      setTasks(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleToggleComplete = async (id: string) => {
    await taskRepo.toggleComplete(id);
    await loadTasks();
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === "active" && t.completed) return false;
    if (statusFilter === "completed" && !t.completed) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Tasks</Text>
        <TouchButton
          label="+ New Task"
          onPress={() => onNavigateToEdit()}
          variant="primary"
          accessibilityLabel="Create a new task"
        />
      </View>

      {/* Plan My Day Quick Banner */}
      {onNavigateToPlan && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <View style={styles.bannerTextContainer}>
            <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
              Plan My Day
            </Text>
            <Text style={[styles.bannerSubtitle, { color: colors.textMuted }]}>
              Score tasks against today's available capacity
            </Text>
          </View>
          <TouchButton
            label="Open Plan"
            onPress={onNavigateToPlan}
            variant="secondary"
          />
        </View>
      )}

      {/* Status Filter Tabs */}
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Filter tasks by completion status"
        style={[styles.statusTabList, { backgroundColor: colors.surface }]}
      >
        {(["all", "active", "completed"] as const).map((status) => {
          const isSelected = statusFilter === status;
          return (
            <Pressable
              key={status}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Filter ${status}`}
              onPress={() => setStatusFilter(status)}
              style={[
                styles.statusTab,
                isSelected && { backgroundColor: colors.accent },
              ]}
            >
              <Text
                style={[
                  styles.statusTabText,
                  { color: isSelected ? "#ffffff" : colors.textMuted },
                ]}
              >
                {status}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = categoryFilter === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setCategoryFilter(cat)}
              accessibilityRole="button"
              accessibilityLabel={`Category ${cat}`}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isSelected ? colors.accent : colors.surface,
                  borderColor: isSelected ? colors.accent : colors.surfaceBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: isSelected ? "#ffffff" : colors.textMuted },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Task List */}
      {loading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading tasks...
          </Text>
        </View>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description={
            statusFilter !== "all" || categoryFilter !== "all"
              ? "Try clearing filters to see more tasks."
              : "Capture your first task to start planning your day."
          }
          actionLabel="+ Create Task"
          onAction={() => onNavigateToEdit()}
        />
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskItemCard
              task={item}
              onToggleComplete={handleToggleComplete}
              onPress={onNavigateToEdit}
            />
          )}
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
  banner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statusTabList: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    padding: 4,
    borderRadius: 8,
  },
  statusTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTabText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  categoryScroll: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 12,
  },
  categoryChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
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
