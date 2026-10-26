import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import type { Task } from "../types/task.js";
import { Badge } from "./primitives.js";

export interface TaskItemCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onPress: (id: string) => void;
}

export function TaskItemCard({
  task,
  onToggleComplete,
  onPress,
}: TaskItemCardProps): React.JSX.Element {
  return (
    <View
      style={styles.card}
      accessibilityRole="none"
      accessibilityLabel={`Task: ${task.title}`}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
        onPress={() => onToggleComplete(task.id)}
        style={styles.checkboxTouchTarget}
      >
        <View
          style={[
            styles.checkboxBox,
            task.completed ? styles.checkboxCompleted : styles.checkboxIncomplete,
          ]}
        >
          {task.completed ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      </Pressable>

      <Pressable
        onPress={() => onPress(task.id)}
        accessibilityRole="button"
        accessibilityLabel={`Edit task ${task.title}`}
        style={styles.contentArea}
      >
        <Text
          style={[
            styles.title,
            task.completed ? styles.titleCompleted : styles.titleActive,
          ]}
        >
          {task.title}
        </Text>

        {task.description ? (
          <Text
            style={styles.description}
            numberOfLines={2}
          >
            {task.description}
          </Text>
        ) : null}

        <View style={styles.badgeRow}>
          <Badge label={task.priority} variant={task.priority} />
          {task.category ? (
            <Badge label={task.category} variant="category" />
          ) : null}
          {task.dueDate ? (
            <Text style={styles.dueDateText}>Due {task.dueDate}</Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    gap: 8,
  },
  checkboxTouchTarget: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxIncomplete: {
    borderWidth: 2,
    borderColor: "#52525b",
    backgroundColor: "transparent",
  },
  checkboxCompleted: {
    backgroundColor: "#3b82f6",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
  },
  contentArea: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  titleActive: {
    color: "#f4f4f5",
  },
  titleCompleted: {
    color: "#71717a",
    textDecorationLine: "line-through",
  },
  description: {
    fontSize: 13,
    color: "#a1a1aa",
    marginBottom: 8,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  dueDateText: {
    fontSize: 11,
    color: "#a1a1aa",
    marginLeft: 4,
  },
});
