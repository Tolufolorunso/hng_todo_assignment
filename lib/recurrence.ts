import type { RecurrenceRule, FollowUpStatus } from "@/types/followup";

export function isFollowUpOverdue(
  dueAt: string,
  status: FollowUpStatus,
  nowMs: number = Date.now()
): boolean {
  if (status !== "open") return false;
  const dueTime = new Date(dueAt).getTime();
  return !Number.isNaN(dueTime) && dueTime < nowMs;
}

export function calculateNextOccurrence(
  rule: RecurrenceRule,
  currentDueAt: string,
  completedAt?: string
): string | null {
  const currentDueDate = new Date(currentDueAt);
  if (Number.isNaN(currentDueDate.getTime())) {
    return null;
  }

  const baseDate =
    rule.mode === "completionRelative" && completedAt
      ? new Date(completedAt)
      : new Date(currentDueDate);

  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const interval = Math.max(1, rule.interval || 1);
  const next = new Date(baseDate.getTime());

  switch (rule.frequency) {
    case "daily": {
      next.setUTCDate(next.getUTCDate() + interval);
      break;
    }
    case "customDays": {
      next.setUTCDate(next.getUTCDate() + interval);
      break;
    }
    case "weekly": {
      if (rule.weekdays && rule.weekdays.length > 0) {
        // Sort unique weekdays (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
        const sortedDays = Array.from(new Set(rule.weekdays)).sort((a, b) => a - b);
        const currentDay = baseDate.getUTCDay();

        // Look for next weekday in current week
        const nextDayInWeek = sortedDays.find((d) => d > currentDay);
        if (nextDayInWeek !== undefined) {
          next.setUTCDate(next.getUTCDate() + (nextDayInWeek - currentDay));
        } else {
          // Wrap to first weekday of subsequent week interval
          const firstDay = sortedDays[0];
          const daysUntilNextWeek = 7 - currentDay + (interval - 1) * 7 + firstDay;
          next.setUTCDate(next.getUTCDate() + daysUntilNextWeek);
        }
      } else {
        // Standard interval weeks
        next.setUTCDate(next.getUTCDate() + interval * 7);
      }
      break;
    }
    case "monthly": {
      const currentMonth = next.getUTCMonth();
      const targetMonth = currentMonth + interval;
      const targetDay = rule.monthDay ?? currentDueDate.getUTCDate();

      next.setUTCMonth(targetMonth, 1);
      // Determine max days in target month
      const maxDaysInMonth = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
      ).getUTCDate();
      next.setUTCDate(Math.min(targetDay, maxDaysInMonth));
      break;
    }
    default: {
      next.setUTCDate(next.getUTCDate() + interval);
    }
  }

  // Preserve wall-clock time if localTime (HH:mm) is specified
  if (rule.localTime && /^\d{2}:\d{2}$/.test(rule.localTime)) {
    const [hours, minutes] = rule.localTime.split(":").map(Number);
    next.setUTCHours(hours, minutes, 0, 0);
  } else {
    // Preserve the original time of day from currentDueDate
    next.setUTCHours(
      currentDueDate.getUTCHours(),
      currentDueDate.getUTCMinutes(),
      currentDueDate.getUTCSeconds(),
      currentDueDate.getUTCMilliseconds()
    );
  }

  // Check end date condition if present
  if (rule.endDate) {
    const endDateTime = new Date(rule.endDate).getTime();
    if (!Number.isNaN(endDateTime) && next.getTime() > endDateTime) {
      return null;
    }
  }

  return next.toISOString();
}

export function calculateSnoozeDueAt(
  currentDueAt: string,
  option: "1hour" | "tomorrow" | "nextWeek" | string,
  referenceNowMs: number = Date.now()
): string {
  const currentDueDate = new Date(currentDueAt);
  const baseTime = Math.max(
    referenceNowMs,
    Number.isNaN(currentDueDate.getTime()) ? referenceNowMs : currentDueDate.getTime()
  );

  const target = new Date(baseTime);

  if (option === "1hour") {
    target.setTime(target.getTime() + 60 * 60 * 1000);
    return target.toISOString();
  }

  if (option === "tomorrow") {
    target.setUTCDate(target.getUTCDate() + 1);
    target.setUTCHours(9, 0, 0, 0); // Default to 09:00 UTC morning
    return target.toISOString();
  }

  if (option === "nextWeek") {
    target.setUTCDate(target.getUTCDate() + 7);
    target.setUTCHours(9, 0, 0, 0);
    return target.toISOString();
  }

  // Custom ISO timestamp option
  const customParsed = new Date(option);
  if (!Number.isNaN(customParsed.getTime())) {
    return customParsed.toISOString();
  }

  // Fallback default: 1 day later
  target.setUTCDate(target.getUTCDate() + 1);
  return target.toISOString();
}
