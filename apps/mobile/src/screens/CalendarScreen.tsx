import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { TaskRepository } from "../storage/taskRepository";
import type { FollowUpRepository } from "../storage/followUpRepository";
import type { Task } from "../types/task";
import type { FollowUp } from "../types/followup";
import { aggregateCalendarMonth, getScheduleForDate } from "../services/calendar";
import { Badge, EmptyState } from "../components/primitives";
import { useTheme } from "../services/theme";

export interface CalendarScreenProps {
  taskRepo: TaskRepository;
  followUpRepo: FollowUpRepository;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarScreen({ taskRepo, followUpRepo }: CalendarScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(() => today.toISOString().slice(0, 10));

  const [tasks, setTasks] = useState<Task[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [allTasks, allFollowUps] = await Promise.all([
          taskRepo.list(),
          followUpRepo.list(),
        ]);
        setTasks(allTasks);
        setFollowups(allFollowUps);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const monthSchedule = aggregateCalendarMonth(tasks, followups, year, month);
  const selectedSchedule = getScheduleForDate(tasks, followups, selectedDate);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const monthName = new Date(year, month - 1, 1).toLocaleString("default", {
    month: "long",
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      testID="calendar-screen"
    >
      {/* Month Navigation */}
      <View style={styles.navRow}>
        <Pressable
          onPress={handlePrevMonth}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={[
            styles.navBtn,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>‹</Text>
        </Pressable>

        <Text style={[styles.monthHeaderTitle, { color: colors.textPrimary }]}>
          {monthName} {year}
        </Text>

        <Pressable
          onPress={handleNextMonth}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={[
            styles.navBtn,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}
        >
          <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>›</Text>
        </Pressable>
      </View>

      {/* Weekday Labels Header */}
      <View style={styles.weekdaysRow}>
        {WEEKDAYS.map((dayName) => (
          <View key={dayName} style={styles.weekdayCol}>
            <Text style={[styles.weekdayText, { color: colors.textMuted }]}>
              {dayName}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Day Grid (7-column Flexbox) */}
      <View style={styles.calendarGrid}>
        {Object.entries(monthSchedule.days).map(([dateKey, dayData]) => {
          const isSelected = selectedDate === dateKey;
          const dayNumber = parseInt(dateKey.slice(8), 10);

          return (
            <View key={dateKey} style={styles.dayCellContainer}>
              <Pressable
                onPress={() => setSelectedDate(dateKey)}
                accessibilityRole="button"
                accessibilityLabel={`Date ${dateKey}, ${dayData.totalItems} items`}
                style={[
                  styles.dayCell,
                  {
                    borderColor: isSelected ? colors.accent : colors.surfaceBorder,
                    backgroundColor: isSelected
                      ? "rgba(59, 130, 246, 0.2)"
                      : dayData.totalItems > 0
                      ? colors.surface
                      : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    {
                      color: isSelected ? colors.accent : colors.textPrimary,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {dayNumber}
                </Text>

                {dayData.totalItems > 0 ? (
                  <View
                    style={[
                      styles.itemDot,
                      {
                        backgroundColor: dayData.hasOverdue ? colors.danger : colors.accent,
                      },
                    ]}
                  />
                ) : (
                  <View style={styles.emptyDotPlaceholder} />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Selected Day Inspector */}
      <View
        style={[
          styles.inspectorCard,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}
      >
        <View style={styles.inspectorHeaderRow}>
          <Text style={[styles.inspectorTitle, { color: colors.textPrimary }]}>
            Schedule for {selectedDate}
          </Text>
          <Badge label={`${selectedSchedule.totalItems} items`} variant="neutral" />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : selectedSchedule.totalItems === 0 ? (
          <EmptyState
            title="Nothing scheduled"
            description="No tasks or follow-ups due on this day."
          />
        ) : (
          <View style={styles.itemsList}>
            {selectedSchedule.tasks.map((task) => (
              <View
                key={task.id}
                style={[
                  styles.scheduleItemRow,
                  { backgroundColor: colors.background, borderColor: colors.surfaceBorder },
                ]}
              >
                <View style={styles.scheduleItemContent}>
                  <Text style={[styles.scheduleItemTitle, { color: colors.textPrimary }]}>
                    {task.title}
                  </Text>
                  <Text style={[styles.scheduleItemSubtitle, { color: colors.textMuted }]}>
                    Task
                  </Text>
                </View>
                <Badge
                  label={task.completed ? "Done" : task.priority}
                  variant={task.completed ? "low" : "high"}
                />
              </View>
            ))}

            {selectedSchedule.followups.map((fu) => (
              <View
                key={fu.id}
                style={[
                  styles.scheduleItemRow,
                  { backgroundColor: colors.background, borderColor: colors.surfaceBorder },
                ]}
              >
                <View style={styles.scheduleItemContent}>
                  <Text style={[styles.scheduleItemTitle, { color: colors.textPrimary }]}>
                    {fu.personName}: {fu.commitment}
                  </Text>
                  <Text style={[styles.scheduleItemSubtitle, { color: colors.accent }]}>
                    Follow Up
                  </Text>
                </View>
                <Badge
                  label={fu.status}
                  variant={fu.status === "completed" ? "low" : "high"}
                />
              </View>
            ))}
          </View>
        )}
      </View>
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
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navBtn: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnText: {
    fontSize: 20,
    fontWeight: "600",
  },
  monthHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayCol: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  dayCellContainer: {
    width: "14.285%",
    padding: 2,
  },
  dayCell: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
  },
  dayNumberText: {
    fontSize: 13,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
  emptyDotPlaceholder: {
    width: 6,
    height: 6,
    marginTop: 3,
  },
  inspectorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  inspectorHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inspectorTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  itemsList: {
    gap: 8,
  },
  scheduleItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  scheduleItemContent: {
    flex: 1,
    marginRight: 8,
  },
  scheduleItemTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  scheduleItemSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
