import React, { useState, useEffect } from "react";
import type { TaskRepository } from "../storage/taskRepository.js";
import type { FollowUpRepository } from "../storage/followUpRepository.js";
import type { Task } from "../types/task.js";
import type { FollowUp } from "../types/followup.js";
import { aggregateCalendarMonth, getScheduleForDate } from "../services/calendar.js";
import { Badge, EmptyState } from "../components/primitives.js";
import { useTheme } from "../services/theme.js";

export interface CalendarScreenProps {
  taskRepo: TaskRepository;
  followUpRepo: FollowUpRepository;
}

export function CalendarScreen({ taskRepo, followUpRepo }: CalendarScreenProps): React.JSX.Element {
  const { colors } = useTheme();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
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
    <div
      role="region"
      aria-label="Calendar screen"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: colors.background,
        color: colors.textPrimary,
        padding: "16px",
        overflowY: "auto",
      }}
    >
      {/* Month Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{
            minHeight: "44px",
            minWidth: "44px",
            borderRadius: "8px",
            border: `1px solid ${colors.surfaceBorder}`,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          ‹
        </button>
        <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>
          {monthName} {year}
        </h1>
        <button
          type="button"
          onClick={handleNextMonth}
          style={{
            minHeight: "44px",
            minWidth: "44px",
            borderRadius: "8px",
            border: `1px solid ${colors.surfaceBorder}`,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          ›
        </button>
      </div>

      {/* Calendar Day Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          marginBottom: "16px",
        }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
          <div
            key={dayName}
            style={{
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 600,
              color: colors.textMuted,
              padding: "4px 0",
            }}
          >
            {dayName}
          </div>
        ))}

        {Object.entries(monthSchedule.days).map(([dateKey, dayData]) => {
          const isSelected = selectedDate === dateKey;
          const dayNumber = parseInt(dateKey.slice(8), 10);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => setSelectedDate(dateKey)}
              style={{
                minHeight: "44px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "8px",
                border: `1px solid ${isSelected ? colors.accent : colors.surfaceBorder}`,
                backgroundColor: isSelected
                  ? "rgba(59, 130, 246, 0.2)"
                  : dayData.totalItems > 0
                  ? colors.surface
                  : "transparent",
                color: isSelected ? colors.accent : colors.textPrimary,
                cursor: "pointer",
                padding: "2px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: isSelected ? 700 : 500 }}>
                {dayNumber}
              </span>
              {dayData.totalItems > 0 && (
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: dayData.hasOverdue ? colors.danger : colors.accent,
                    marginTop: "2px",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Inspector */}
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.surfaceBorder}`,
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "15px", fontWeight: 700 }}>Schedule for {selectedDate}</div>
          <Badge label={`${selectedSchedule.totalItems} items`} variant="neutral" />
        </div>

        {selectedSchedule.totalItems === 0 ? (
          <EmptyState title="Nothing scheduled" description="No tasks or follow-ups due on this day." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {selectedSchedule.tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  backgroundColor: colors.background,
                  borderRadius: "8px",
                }}
              >
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}>
                    {task.title}
                  </span>
                  <div style={{ fontSize: "11px", color: colors.textMuted }}>Task</div>
                </div>
                <Badge
                  label={task.completed ? "Done" : task.priority}
                  variant={task.completed ? "low" : "high"}
                />
              </div>
            ))}

            {selectedSchedule.followups.map((fu) => (
              <div
                key={fu.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  backgroundColor: colors.background,
                  borderRadius: "8px",
                }}
              >
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}>
                    {fu.personName}: {fu.commitment}
                  </span>
                  <div style={{ fontSize: "11px", color: colors.accent }}>Follow Up</div>
                </div>
                <Badge
                  label={fu.status}
                  variant={fu.status === "completed" ? "low" : "high"}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
