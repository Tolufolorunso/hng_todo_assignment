import type { Task } from "@/types/task";

export interface CalendarDay {
  isoDate: string; // YYYY-MM-DD
  year: number;
  month: number; // 1-12
  dayOfMonth: number; // 1-31
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

export interface GroupedTasks {
  byDate: Record<string, Task[]>;
  unscheduled: Task[];
}

export interface MonthYear {
  year: number;
  monthIndex: number; // 0-11
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function pad(num: number): string {
  return num < 10 ? `0${num}` : String(num);
}

export function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getCalendarDays(
  year: number,
  monthIndex: number,
  todayIso: string,
): CalendarDay[] {
  // First day of target month
  const firstDate = new Date(Date.UTC(year, monthIndex, 1));
  // Monday-based day of week: 0 for Mon, 6 for Sun
  const firstDayOfWeek = (firstDate.getUTCDay() + 6) % 7;

  // Total days in target month
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  // Days in previous month
  const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();

  const days: CalendarDay[] = [];

  // 1. Leading padding days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayOfMonth = daysInPrevMonth - i;
    const isoDate = formatIsoDate(prevYear, prevMonthIndex + 1, dayOfMonth);
    days.push({
      isoDate,
      year: prevYear,
      month: prevMonthIndex + 1,
      dayOfMonth,
      isCurrentMonth: false,
      isToday: isoDate === todayIso,
      isPast: isoDate < todayIso,
    });
  }

  // 2. Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const isoDate = formatIsoDate(year, monthIndex + 1, day);
    days.push({
      isoDate,
      year,
      month: monthIndex + 1,
      dayOfMonth: day,
      isCurrentMonth: true,
      isToday: isoDate === todayIso,
      isPast: isoDate < todayIso,
    });
  }

  // 3. Trailing padding days to fill 7-day row alignment (either 35 or 42 days total)
  const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  const remainder = days.length % 7;
  const trailingDaysNeeded = remainder === 0 ? 0 : 7 - remainder;

  for (let day = 1; day <= trailingDaysNeeded; day++) {
    const isoDate = formatIsoDate(nextYear, nextMonthIndex + 1, day);
    days.push({
      isoDate,
      year: nextYear,
      month: nextMonthIndex + 1,
      dayOfMonth: day,
      isCurrentMonth: false,
      isToday: isoDate === todayIso,
      isPast: isoDate < todayIso,
    });
  }

  return days;
}

export function groupTasksByDate(tasks: Task[]): GroupedTasks {
  const byDate: Record<string, Task[]> = {};
  const unscheduled: Task[] = [];

  for (const task of tasks) {
    if (task.dueDate === null) {
      unscheduled.push(task);
    } else {
      if (!byDate[task.dueDate]) {
        byDate[task.dueDate] = [];
      }
      byDate[task.dueDate].push(task);
    }
  }

  return { byDate, unscheduled };
}

export function getPrevMonth(year: number, monthIndex: number): MonthYear {
  if (monthIndex === 0) {
    return { year: year - 1, monthIndex: 11 };
  }
  return { year, monthIndex: monthIndex - 1 };
}

export function getNextMonth(year: number, monthIndex: number): MonthYear {
  if (monthIndex === 11) {
    return { year: year + 1, monthIndex: 0 };
  }
  return { year, monthIndex: monthIndex + 1 };
}

export function formatMonthYear(year: number, monthIndex: number): string {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatSelectedDateHeading(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
