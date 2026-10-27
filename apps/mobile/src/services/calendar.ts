import type { Task } from "../types/task";
import type { FollowUp } from "../types/followup";

export interface CalendarDaySchedule {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  followups: FollowUp[];
  totalItems: number;
  hasOverdue: boolean;
}

export interface CalendarMonthSchedule {
  year: number;
  month: number; // 1-12
  days: Record<string, CalendarDaySchedule>;
}

export function getScheduleForDate(
  tasks: Task[],
  followups: FollowUp[],
  targetDate: string
): CalendarDaySchedule {
  const dayTasks = tasks.filter((t) => t.dueDate === targetDate);
  const dayFollowUps = followups.filter((f) => f.dueAt && f.dueAt.slice(0, 10) === targetDate);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isPast = targetDate < todayStr;
  const hasOverdue =
    isPast &&
    (dayTasks.some((t) => !t.completed) || dayFollowUps.some((f) => f.status === "open"));

  return {
    date: targetDate,
    tasks: dayTasks,
    followups: dayFollowUps,
    totalItems: dayTasks.length + dayFollowUps.length,
    hasOverdue,
  };
}

export function aggregateCalendarMonth(
  tasks: Task[],
  followups: FollowUp[],
  year: number,
  month: number
): CalendarMonthSchedule {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: Record<string, CalendarDaySchedule> = {};

  const monthStr = month < 10 ? `0${month}` : `${month}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const dateKey = `${year}-${monthStr}-${dayStr}`;
    days[dateKey] = getScheduleForDate(tasks, followups, dateKey);
  }

  return {
    year,
    month,
    days,
  };
}
