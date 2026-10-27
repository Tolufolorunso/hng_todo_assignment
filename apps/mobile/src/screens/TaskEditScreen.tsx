import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import type { TaskPriority, TaskCategory } from "../types/task";
import type { TaskRepository } from "../storage/taskRepository";
import { TouchButton } from "../components/primitives";
import { useTheme } from "../services/theme";

export interface TaskEditScreenProps {
  taskRepo: TaskRepository;
  taskId?: string;
  onDone: () => void;
  onCancel: () => void;
}

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const CATEGORIES: TaskCategory[] = ["work", "personal", "urgent", "study", "ideas"];

export function TaskEditScreen({
  taskRepo,
  taskId,
  onDone,
  onCancel,
}: TaskEditScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (taskId) {
      taskRepo.getById(taskId).then((task) => {
        if (task) {
          setTitle(task.title);
          setDescription(task.description);
          setPriority(task.priority);
          setCategory(task.category);
          setDueDate(task.dueDate || "");
          setEstimatedMinutes(task.estimatedMinutes ?? undefined);
        }
      });
    }
  }, [taskId, taskRepo]);

  const handleSave = async () => {
    setErrorMessage(null);
    setSaving(true);
    try {
      if (taskId) {
        await taskRepo.update(taskId, {
          title,
          description,
          priority,
          category,
          dueDate: dueDate ? dueDate : null,
          estimatedMinutes: estimatedMinutes || null,
        });
      } else {
        await taskRepo.create({
          title,
          description,
          priority,
          category,
          dueDate: dueDate ? dueDate : null,
          estimatedMinutes: estimatedMinutes || null,
        });
      }
      onDone();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    await taskRepo.delete(taskId);
    onDone();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.topBar}>
        <TouchButton
          label="← Back"
          onPress={onCancel}
          variant="ghost"
          accessibilityLabel="Cancel task editing"
        />
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          {taskId ? "Edit Task" : "New Task"}
        </Text>
        <TouchButton
          label={saving ? "Saving..." : "Save"}
          onPress={handleSave}
          disabled={saving}
          variant="primary"
          accessibilityLabel="Save task"
        />
      </View>

      {errorMessage && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Task Title Input */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Title *
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What needs to be done?"
          placeholderTextColor="#71717a"
          accessibilityLabel="Task title"
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              color: colors.textPrimary,
            },
          ]}
        />
      </View>

      {/* Task Description Textarea */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Description
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Add details, links, or notes..."
          placeholderTextColor="#71717a"
          accessibilityLabel="Task description"
          multiline
          numberOfLines={4}
          style={[
            styles.textArea,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              color: colors.textPrimary,
            },
          ]}
        />
      </View>

      {/* Priority Selector */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Priority
        </Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => {
            const isSelected = priority === p;
            return (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`Priority ${p}`}
                onPress={() => setPriority(p)}
                style={[
                  styles.priorityButton,
                  {
                    backgroundColor: isSelected ? colors.accent : colors.surface,
                    borderColor: isSelected ? colors.accent : colors.surfaceBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    { color: isSelected ? "#ffffff" : colors.textMuted },
                  ]}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Category Selector */}
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
          Category
        </Text>
        <View style={styles.categoryRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="No category"
            onPress={() => setCategory(null)}
            style={[
              styles.categoryChip,
              {
                backgroundColor: category === null ? colors.accent : colors.surface,
                borderColor: category === null ? colors.accent : colors.surfaceBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                { color: category === null ? "#ffffff" : colors.textMuted },
              ]}
            >
              None
            </Text>
          </Pressable>
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat;
            return (
              <Pressable
                key={cat}
                accessibilityRole="button"
                accessibilityLabel={`Category ${cat}`}
                onPress={() => setCategory(cat)}
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
                    styles.categoryText,
                    { color: isSelected ? "#ffffff" : colors.textMuted },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Due Date & Estimate Inputs */}
      <View style={styles.rowInputs}>
        <View style={styles.halfInput}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
            Due Date (YYYY-MM-DD)
          </Text>
          <TextInput
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="2026-10-31"
            placeholderTextColor="#71717a"
            accessibilityLabel="Due date"
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                color: colors.textPrimary,
              },
            ]}
          />
        </View>

        <View style={styles.halfInput}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
            Est. Minutes
          </Text>
          <TextInput
            value={estimatedMinutes !== undefined ? String(estimatedMinutes) : ""}
            onChangeText={(val) => {
              const num = parseInt(val, 10);
              setEstimatedMinutes(isNaN(num) ? undefined : num);
            }}
            placeholder="30"
            placeholderTextColor="#71717a"
            keyboardType="numeric"
            accessibilityLabel="Estimated minutes"
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                color: colors.textPrimary,
              },
            ]}
          />
        </View>
      </View>

      {/* Delete Action if editing */}
      {taskId && (
        <View style={styles.deleteSection}>
          <TouchButton
            label="Delete Task"
            onPress={handleDelete}
            variant="danger"
            accessibilityLabel="Delete this task permanently"
          />
        </View>
      )}
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
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  errorBanner: {
    padding: 12,
    backgroundColor: "#7f1d1d",
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  textArea: {
    minHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: "top",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  halfInput: {
    flex: 1,
  },
  deleteSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
  },
});
