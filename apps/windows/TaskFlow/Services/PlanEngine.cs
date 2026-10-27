using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using TaskFlow.Models;

namespace TaskFlow.Services;

public class PlanRecommendationResult
{
    public List<PlanItemReference> RecommendedItems { get; set; } = new();
    public List<PlanItemReference> OverflowItems { get; set; } = new();
    public int TotalEstimatedMinutes { get; set; }
    public int AvailableMinutes { get; set; }
    public int RemainingMinutes { get; set; }
}

public static class PlanEngine
{
    private static int GetDaysDiff(string fromIsoDate, string toIsoDate)
    {
        try
        {
            var fromDateStr = fromIsoDate.Length >= 10 ? fromIsoDate.Substring(0, 10) : fromIsoDate;
            var toDateStr = toIsoDate.Length >= 10 ? toIsoDate.Substring(0, 10) : toIsoDate;

            if (DateTime.TryParseExact(fromDateStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var fromDate) &&
                DateTime.TryParseExact(toDateStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var toDate))
            {
                return (int)Math.Round((toDate - fromDate).TotalDays);
            }
        }
        catch
        {
            // Ignore parse failures
        }
        return 0;
    }

    public static PlanRecommendationResult GenerateDailyPlan(
        IEnumerable<TaskItem> tasks,
        IEnumerable<FollowUpItem> followUps,
        int availableMinutes,
        string? targetDate = null,
        int defaultTaskMinutes = 30,
        int defaultFollowUpMinutes = 15)
    {
        var target = string.IsNullOrWhiteSpace(targetDate)
            ? DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : targetDate.Substring(0, Math.Min(10, targetDate.Length));

        var candidates = new List<(PlanItemReference Item, double Score)>();

        // 1. Process incomplete tasks
        foreach (var task in tasks.Where(t => !t.Completed))
        {
            int estimated = task.EstimatedMinutes.HasValue && task.EstimatedMinutes.Value > 0
                ? task.EstimatedMinutes.Value
                : defaultTaskMinutes;
            double score = 0;
            string reason = string.Empty;

            if (!string.IsNullOrWhiteSpace(task.DueDate))
            {
                int daysOverdue = GetDaysDiff(task.DueDate, target);
                if (daysOverdue > 0)
                {
                    score += 1000 + (daysOverdue * 50);
                    reason = $"Overdue by {daysOverdue} day{(daysOverdue > 1 ? "s" : string.Empty)}";
                }
                else if (daysOverdue == 0)
                {
                    score += 500;
                    reason = "Due today";
                }
            }

            if (string.Equals(task.Priority, "high", StringComparison.OrdinalIgnoreCase))
            {
                score += 200;
                if (reason == "Due today")
                {
                    reason = "High priority and due today";
                }
                else if (string.IsNullOrEmpty(reason))
                {
                    reason = "High priority task";
                }
            }
            else if (string.Equals(task.Priority, "medium", StringComparison.OrdinalIgnoreCase))
            {
                score += 50;
            }
            else if (string.Equals(task.Priority, "low", StringComparison.OrdinalIgnoreCase))
            {
                score += 10;
            }

            if (string.IsNullOrEmpty(reason))
            {
                reason = estimated <= 20
                    ? "Quick win fitting remaining time"
                    : "Backlog task ready to tackle";
            }

            var reference = new PlanItemReference
            {
                Type = "task",
                Id = task.Id,
                Title = task.Title,
                EstimatedMinutes = estimated,
                IsCompleted = false,
                Score = score,
                Explanation = reason
            };
            candidates.Add((reference, score));
        }

        // 2. Process open follow-ups
        foreach (var fu in followUps.Where(f => string.Equals(f.Status, "open", StringComparison.OrdinalIgnoreCase)))
        {
            int estimated = defaultFollowUpMinutes;
            double score = 0;
            string reason = string.Empty;

            if (!string.IsNullOrWhiteSpace(fu.DueAt))
            {
                int daysOverdue = GetDaysDiff(fu.DueAt, target);
                if (daysOverdue > 0)
                {
                    score += 1000 + (daysOverdue * 50);
                    reason = $"Overdue commitment ({daysOverdue} day{(daysOverdue > 1 ? "s" : string.Empty)})";
                }
                else if (daysOverdue == 0)
                {
                    score += 500;
                    reason = "Follow-up commitment due today";
                }
            }

            if (string.IsNullOrEmpty(reason))
            {
                reason = "Scheduled follow-up commitment";
            }

            var reference = new PlanItemReference
            {
                Type = "followup",
                Id = fu.Id,
                Title = $"{fu.PersonName}: {fu.Commitment}",
                EstimatedMinutes = estimated,
                IsCompleted = false,
                Score = score,
                Explanation = reason
            };
            candidates.Add((reference, score));
        }

        // 3. Sort candidates: score descending, then estimated minutes ascending, then title
        var sorted = candidates
            .OrderByDescending(c => c.Score)
            .ThenBy(c => c.Item.EstimatedMinutes)
            .ThenBy(c => c.Item.Title, StringComparer.OrdinalIgnoreCase)
            .Select(c => c.Item)
            .ToList();

        // 4. Greedy knapsack packing by available capacity
        var recommended = new List<PlanItemReference>();
        var overflow = new List<PlanItemReference>();
        int consumed = 0;

        foreach (var item in sorted)
        {
            if (consumed + item.EstimatedMinutes <= availableMinutes)
            {
                recommended.Add(item);
                consumed += item.EstimatedMinutes;
            }
            else
            {
                overflow.Add(item);
            }
        }

        return new PlanRecommendationResult
        {
            RecommendedItems = recommended,
            OverflowItems = overflow,
            TotalEstimatedMinutes = consumed,
            AvailableMinutes = availableMinutes,
            RemainingMinutes = Math.Max(0, availableMinutes - consumed)
        };
    }
}
