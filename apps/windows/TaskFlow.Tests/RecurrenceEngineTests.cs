using System;
using System.Collections.Generic;
using TaskFlow.Models;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class RecurrenceEngineTests
{
    [Fact]
    public void ComputeNextDueAt_CalendarAnchored_Daily_UsesIntervalAndLocalTime()
    {
        var rule = new RecurrenceRule
        {
            Frequency = "daily",
            Mode = "calendarAnchored",
            Interval = 2,
            LocalTime = "15:45"
        };
        var baseDate = new DateTimeOffset(2026, 11, 1, 8, 0, 0, TimeSpan.Zero);

        var next = RecurrenceEngine.ComputeNextDueAt(rule, baseDate);
        var parsed = DateTimeOffset.Parse(next);

        Assert.Equal(2026, parsed.Year);
        Assert.Equal(11, parsed.Month);
        Assert.Equal(3, parsed.Day);
        Assert.Equal(15, parsed.Hour);
        Assert.Equal(45, parsed.Minute);
    }

    [Fact]
    public void ComputeNextDueAt_CalendarAnchored_Weekly_SelectsMatchingWeekday()
    {
        // 2026-11-01 is Sunday (DayOfWeek = 0)
        // Select Tuesday (2) and Thursday (4)
        var rule = new RecurrenceRule
        {
            Frequency = "weekly",
            Mode = "calendarAnchored",
            Interval = 1,
            Weekdays = new List<int> { 2, 4 },
            LocalTime = "10:00"
        };
        var baseDate = new DateTimeOffset(2026, 11, 1, 9, 0, 0, TimeSpan.Zero);

        var next = RecurrenceEngine.ComputeNextDueAt(rule, baseDate);
        var parsed = DateTimeOffset.Parse(next);

        Assert.Equal(DayOfWeek.Tuesday, parsed.DayOfWeek);
        Assert.Equal(2026, parsed.Year);
        Assert.Equal(11, parsed.Month);
        Assert.Equal(3, parsed.Day);
        Assert.Equal(10, parsed.Hour);
    }

    [Fact]
    public void ComputeNextDueAt_CalendarAnchored_Monthly_ClampsToDaysInMonth()
    {
        var rule = new RecurrenceRule
        {
            Frequency = "monthly",
            Mode = "calendarAnchored",
            Interval = 1,
            MonthDay = 31,
            LocalTime = "09:00"
        };
        // Base is Jan 31, 2027 (non-leap year, Feb has 28 days)
        var baseDate = new DateTimeOffset(2027, 1, 31, 9, 0, 0, TimeSpan.Zero);

        var next = RecurrenceEngine.ComputeNextDueAt(rule, baseDate);
        var parsed = DateTimeOffset.Parse(next);

        Assert.Equal(2027, parsed.Year);
        Assert.Equal(2, parsed.Month);
        Assert.Equal(28, parsed.Day);
        Assert.Equal(9, parsed.Hour);
    }

    [Fact]
    public void ComputeNextDueAt_CompletionRelative_Daily_AddsIntervalDays()
    {
        var rule = new RecurrenceRule
        {
            Frequency = "daily",
            Mode = "completionRelative",
            Interval = 3
        };
        var baseDate = new DateTimeOffset(2026, 11, 10, 14, 0, 0, TimeSpan.Zero);

        var next = RecurrenceEngine.ComputeNextDueAt(rule, baseDate);
        var parsed = DateTimeOffset.Parse(next);

        Assert.Equal(2026, parsed.Year);
        Assert.Equal(11, parsed.Month);
        Assert.Equal(13, parsed.Day);
    }

    [Fact]
    public void Snooze_ExtendsDueDateByHours()
    {
        var futureDue = DateTimeOffset.UtcNow.AddDays(2).ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        var snoozed = RecurrenceEngine.Snooze(futureDue, 12);
        var parsedFuture = DateTimeOffset.Parse(futureDue);
        var parsedSnoozed = DateTimeOffset.Parse(snoozed);

        Assert.True(parsedSnoozed > parsedFuture);
        Assert.Equal(12, Math.Round((parsedSnoozed - parsedFuture).TotalHours));
    }

    [Fact]
    public void Reschedule_ValidTimestamp_ReturnsFormattedString()
    {
        var input = "2026-12-25T10:00:00Z";
        var rescheduled = RecurrenceEngine.Reschedule(input);
        Assert.Contains("2026-12-25", rescheduled);
    }

    [Fact]
    public void Reschedule_InvalidTimestamp_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => RecurrenceEngine.Reschedule("not-a-timestamp"));
    }

    [Fact]
    public void ComputeNextDueAt_SatisfiesSharedCrossPlatformRecurrenceFixtures()
    {
        string? fixturePath = null;
        var directCandidate = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "fixtures", "recurrence.json");
        if (System.IO.File.Exists(directCandidate))
        {
            fixturePath = directCandidate;
        }
        else
        {
            string? current = AppContext.BaseDirectory;
            for (int i = 0; i < 12 && current != null; i++)
            {
                var candidate = System.IO.Path.Combine(current, "fixtures", "recurrence.json");
                if (System.IO.File.Exists(candidate))
                {
                    fixturePath = candidate;
                    break;
                }
                current = System.IO.Directory.GetParent(current)?.FullName;
            }
        }

        Assert.NotNull(fixturePath);
        string json = System.IO.File.ReadAllText(fixturePath!);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var testCases = doc.RootElement.GetProperty("testCases");

        foreach (var tc in testCases.EnumerateArray())
        {
            var ruleElement = tc.GetProperty("rule");
            var rule = new RecurrenceRule
            {
                Mode = ruleElement.GetProperty("mode").GetString() ?? "calendarAnchored",
                Frequency = ruleElement.GetProperty("frequency").GetString() ?? "daily",
                Interval = ruleElement.GetProperty("interval").GetInt32(),
                LocalTime = ruleElement.TryGetProperty("localTime", out var lt) ? lt.GetString() : null,
                MonthDay = ruleElement.TryGetProperty("monthDay", out var md) ? md.GetInt32() : null,
            };

            if (ruleElement.TryGetProperty("weekdays", out var wd))
            {
                rule.Weekdays = new List<int>();
                foreach (var day in wd.EnumerateArray())
                {
                    rule.Weekdays.Add(day.GetInt32());
                }
            }

            var baseDate = DateTimeOffset.Parse(tc.GetProperty("baseDate").GetString()!);
            var expectedNext = DateTimeOffset.Parse(tc.GetProperty("expectedNext").GetString()!);

            var actualStr = RecurrenceEngine.ComputeNextDueAt(rule, baseDate);
            var actual = DateTimeOffset.Parse(actualStr);

            Assert.Equal(expectedNext, actual);
        }
    }
}
