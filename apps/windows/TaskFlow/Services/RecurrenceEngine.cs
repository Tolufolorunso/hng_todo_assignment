using System;
using System.Collections.Generic;
using System.Globalization;
using TaskFlow.Models;

namespace TaskFlow.Services;

public static class RecurrenceEngine
{
    public static string ComputeNextDueAt(RecurrenceRule rule, DateTimeOffset baseDate)
    {
        int targetHour = 9;
        int targetMinute = 0;
        if (!string.IsNullOrWhiteSpace(rule.LocalTime))
        {
            var parts = rule.LocalTime.Split(':');
            if (parts.Length >= 2 && int.TryParse(parts[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out int h) &&
                int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out int m))
            {
                targetHour = h;
                targetMinute = m;
            }
        }

        int interval = rule.Interval > 0 ? rule.Interval : 1;

        if (string.Equals(rule.Mode, "calendarAnchored", StringComparison.OrdinalIgnoreCase))
        {
            if (string.Equals(rule.Frequency, "daily", StringComparison.OrdinalIgnoreCase))
            {
                var next = baseDate.AddDays(interval);
                return new DateTimeOffset(next.Year, next.Month, next.Day, targetHour, targetMinute, 0, TimeSpan.Zero)
                    .ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
            }

            if (string.Equals(rule.Frequency, "weekly", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(rule.Frequency, "biweekly", StringComparison.OrdinalIgnoreCase))
            {
                int stepWeeks = string.Equals(rule.Frequency, "biweekly", StringComparison.OrdinalIgnoreCase) ? 2 : interval;
                var weekdays = rule.Weekdays != null && rule.Weekdays.Count > 0
                    ? rule.Weekdays
                    : new List<int> { (int)baseDate.DayOfWeek };

                DateTimeOffset? found = null;
                for (int i = 1; i <= 14 * stepWeeks; i++)
                {
                    var cand = baseDate.AddDays(i);
                    if (weekdays.Contains((int)cand.DayOfWeek))
                    {
                        found = new DateTimeOffset(cand.Year, cand.Month, cand.Day, targetHour, targetMinute, 0, TimeSpan.Zero);
                        break;
                    }
                }

                var result = found ?? baseDate.AddDays(7 * stepWeeks);
                return result.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
            }

            if (string.Equals(rule.Frequency, "monthly", StringComparison.OrdinalIgnoreCase))
            {
                int targetDay = rule.MonthDay.HasValue ? rule.MonthDay.Value : baseDate.Day;
                var nextMonth = baseDate.AddMonths(interval);
                int daysInMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
                int clampedDay = Math.Min(targetDay, daysInMonth);
                return new DateTimeOffset(nextMonth.Year, nextMonth.Month, clampedDay, targetHour, targetMinute, 0, TimeSpan.Zero)
                    .ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
            }
        }

        // Completion-relative mode
        if (string.Equals(rule.Frequency, "daily", StringComparison.OrdinalIgnoreCase))
        {
            return baseDate.AddDays(interval).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        }

        if (string.Equals(rule.Frequency, "weekly", StringComparison.OrdinalIgnoreCase))
        {
            return baseDate.AddDays(interval * 7).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        }

        if (string.Equals(rule.Frequency, "biweekly", StringComparison.OrdinalIgnoreCase))
        {
            return baseDate.AddDays(14).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        }

        if (string.Equals(rule.Frequency, "monthly", StringComparison.OrdinalIgnoreCase))
        {
            return baseDate.AddMonths(interval).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        }

        return baseDate.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
    }

    public static string Snooze(string currentDueAt, int hours = 24)
    {
        var now = DateTimeOffset.UtcNow;
        var baseDate = DateTimeOffset.TryParse(currentDueAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt) && dt > now
            ? dt
            : now;
        return baseDate.AddHours(hours).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
    }

    public static string Reschedule(string newDueAt)
    {
        if (!DateTimeOffset.TryParse(newDueAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
        {
            throw new ArgumentException("Invalid reschedule timestamp", nameof(newDueAt));
        }
        return dt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
    }
}
