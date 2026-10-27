import type { RecurrenceRule } from "../types/followup.js";

export function computeNextDueAt(rule: RecurrenceRule, baseDate: Date): string {
  const current = new Date(baseDate);
  const timeStr = rule.localTime || rule.timeOfDay || "09:00";
  const [hoursStr, minutesStr] = timeStr.split(":");
  const targetHour = parseInt(hoursStr || "09", 10);
  const targetMinute = parseInt(minutesStr || "00", 10);

  if (rule.mode === "calendarAnchored") {
    if (rule.frequency === "daily") {
      current.setUTCDate(current.getUTCDate() + (rule.interval || 1));
      current.setUTCHours(targetHour, targetMinute, 0, 0);
      return current.toISOString();
    }

    if (rule.frequency === "weekly") {
      const weekdays = rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [current.getUTCDay()];
      let foundDate: Date | null = null;

      // Scan up to 14 days ahead for next matching weekday
      for (let i = 1; i <= 14; i++) {
        const candidate = new Date(current);
        candidate.setUTCDate(candidate.getUTCDate() + i);
        candidate.setUTCHours(targetHour, targetMinute, 0, 0);
        if (weekdays.includes(candidate.getUTCDay())) {
          foundDate = candidate;
          break;
        }
      }
      return (foundDate || new Date(current.getTime() + 7 * 86400000)).toISOString();
    }

    if (rule.frequency === "monthly") {
      const targetDay = rule.monthDay || current.getUTCDate();
      const nextMonth = new Date(current);
      const targetMonth = nextMonth.getUTCMonth() + (rule.interval || 1);
      nextMonth.setUTCMonth(targetMonth, 1);

      // Handle month overflow (e.g. Feb 30 clamped to Feb 28/29)
      const lastDayOfNextMonth = new Date(
        Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)
      ).getUTCDate();
      const clampedDay = Math.min(targetDay, lastDayOfNextMonth);
      nextMonth.setUTCDate(clampedDay);
      nextMonth.setUTCHours(targetHour, targetMinute, 0, 0);
      return nextMonth.toISOString();
    }
  }

  // Completion-relative mode
  if (rule.frequency === "daily") {
    const next = new Date(baseDate.getTime() + (rule.interval || 1) * 86400000);
    return next.toISOString();
  }

  if (rule.frequency === "weekly") {
    const next = new Date(baseDate.getTime() + (rule.interval || 1) * 7 * 86400000);
    return next.toISOString();
  }

  if (rule.frequency === "monthly") {
    const next = new Date(baseDate);
    const targetDay = next.getUTCDate();
    const targetMonth = next.getUTCMonth() + (rule.interval || 1);
    next.setUTCMonth(targetMonth, 1);
    const lastDay = new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
    ).getUTCDate();
    next.setUTCDate(Math.min(targetDay, lastDay));
    return next.toISOString();
  }

  return new Date(baseDate.getTime() + 86400000).toISOString();
}

export function snoozeFollowUp(currentDueAt: string, hours = 24): string {
  const current = new Date(currentDueAt);
  const now = new Date();
  const base = current > now ? current : now;
  return new Date(base.getTime() + hours * 3600000).toISOString();
}

export function rescheduleFollowUp(newDueAt: string): string {
  const parsed = new Date(newDueAt);
  if (isNaN(parsed.getTime())) {
    throw new Error("Invalid reschedule timestamp");
  }
  return parsed.toISOString();
}
