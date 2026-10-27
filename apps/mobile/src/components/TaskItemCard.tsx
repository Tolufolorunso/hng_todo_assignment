import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import type { Task } from "../types/task";
import { Badge } from "./primitives";
import { useTheme } from "../services/theme";
import { hapticFeedback } from "../services/haptics";
import {
  getPlatformCardStyle,
  getPlatformRipple,
} from "../styles/platform";

export interface TaskItemCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onPress: (id: string) => void;
}

export const TaskItemCard = React.memo(function TaskItemCard({
  task,
  onToggleComplete,
  onPress,
}: TaskItemCardProps): React.JSX.Element {
  const { colors, mode } = useTheme();

  const handleToggle = () => {
    hapticFeedback.medium();
    onToggleComplete(task.id);
  };

  const handlePress = () => {
    hapticFeedback.light();
    onPress(task.id);
  };

  const rippleConfig = getPlatformRipple(
    mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"
  );

  const cardPlatformStyle = getPlatformCardStyle(
    colors.surface,
    colors.surfaceBorder
  );

  return (
    <View
      style={[styles.card, cardPlatformStyle]}
      accessibilityRole="none"
      accessibilityLabel={`Task: ${task.title}`}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        accessibilityLabel={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
        onPress={handleToggle}
        android_ripple={rippleConfig}
        style={styles.checkboxTouchTarget}
      >
        <View
          style={[
            styles.checkboxBox,
            task.completed
              ? [styles.checkboxCompleted, { backgroundColor: colors.accent }]
              : [styles.checkboxIncomplete, { borderColor: colors.surfaceBorder }],
          ]}
        >
          {task.completed ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      </Pressable>

      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Edit task ${task.title}`}
        android_ripple={rippleConfig}
        style={styles.contentArea}
      >
        <Text
          style={[
            styles.title,
            task.completed
              ? [styles.titleCompleted, { color: colors.textMuted }]
              : [styles.titleActive, { color: colors.textPrimary }],
          ]}
        >
          {task.title}
        </Text>

        {task.description ? (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
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
            <Text style={[styles.dueDateText, { color: colors.textMuted }]}>
              Due {task.dueDate}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    marginBottom: 8,
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
    textDecorationLine: "line-through",
  },
  description: {
    fontSize: 13,
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
    marginLeft: 4,
  },
});
