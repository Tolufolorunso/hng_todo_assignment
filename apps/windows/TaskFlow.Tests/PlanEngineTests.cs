using System.Collections.Generic;
using TaskFlow.Models;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class PlanEngineTests
{
    [Fact]
    public void GenerateDailyPlan_GreedyKnapsack_RespectsAvailableCapacity()
    {
        var tasks = new List<TaskItem>
        {
            new TaskItem { Id = "t1", Title = "Urgent fix", Priority = "high", EstimatedMinutes = 60, DueDate = "2026-10-27" },
            new TaskItem { Id = "t2", Title = "Feature work", Priority = "medium", EstimatedMinutes = 120 },
            new TaskItem { Id = "t3", Title = "Documentation", Priority = "low", EstimatedMinutes = 90 }
        };

        var followUps = new List<FollowUpItem>();

        // Available capacity: 150 minutes
        // t1 (60 mins, high + due today) will be included
        // t2 (120 mins) would exceed 150 - 60 = 90 mins, so it should overflow
        // t3 (90 mins, fits remaining 90 mins exactly) will be included
        var result = PlanEngine.GenerateDailyPlan(tasks, followUps, availableMinutes: 150, targetDate: "2026-10-27");

        Assert.Equal(150, result.TotalEstimatedMinutes);
        Assert.Equal(0, result.RemainingMinutes);
        Assert.Equal(2, result.RecommendedItems.Count);
        Assert.Equal("t1", result.RecommendedItems[0].Id);
        Assert.Equal("t3", result.RecommendedItems[1].Id);
        Assert.Single(result.OverflowItems);
        Assert.Equal("t2", result.OverflowItems[0].Id);
    }

    [Fact]
    public void GenerateDailyPlan_OverdueItems_ReceiveHighestPriority()
    {
        var tasks = new List<TaskItem>
        {
            new TaskItem { Id = "t1", Title = "Due tomorrow", DueDate = "2026-10-28", Priority = "high", EstimatedMinutes = 30 },
            new TaskItem { Id = "t2", Title = "Overdue task", DueDate = "2026-10-25", Priority = "medium", EstimatedMinutes = 30 }
        };

        var result = PlanEngine.GenerateDailyPlan(tasks, new List<FollowUpItem>(), availableMinutes: 120, targetDate: "2026-10-27");

        Assert.Equal(2, result.RecommendedItems.Count);
        // t2 is overdue by 2 days -> score = 1000 + 100 + 50 = 1150
        // t1 is due tomorrow -> score = 200
        Assert.Equal("t2", result.RecommendedItems[0].Id);
        Assert.Contains("Overdue by 2 days", result.RecommendedItems[0].Explanation);
    }

    [Fact]
    public void GenerateDailyPlan_IncludesDueFollowUps()
    {
        var tasks = new List<TaskItem>
        {
            new TaskItem { Id = "t1", Title = "Standard task", Priority = "low", EstimatedMinutes = 30 }
        };

        var followUps = new List<FollowUpItem>
        {
            new FollowUpItem
            {
                Id = "fu1",
                PersonName = "Dr. Banner",
                Commitment = "Discuss lab findings",
                DueAt = "2026-10-27T10:00:00Z",
                Status = "open"
            }
        };

        var result = PlanEngine.GenerateDailyPlan(tasks, followUps, availableMinutes: 60, targetDate: "2026-10-27");

        Assert.Equal(2, result.RecommendedItems.Count);
        // Follow up is due today -> score >= 500, placed first
        Assert.Equal("fu1", result.RecommendedItems[0].Id);
        Assert.Equal("followup", result.RecommendedItems[0].Type);
        Assert.Contains("Dr. Banner", result.RecommendedItems[0].Title);
        Assert.Contains("Follow-up commitment due today", result.RecommendedItems[0].Explanation);
    }

    [Fact]
    public void GenerateDailyPlan_ExcludesCompletedTasksAndFollowUps()
    {
        var tasks = new List<TaskItem>
        {
            new TaskItem { Id = "t1", Title = "Already finished", Completed = true, EstimatedMinutes = 30 }
        };
        var followUps = new List<FollowUpItem>
        {
            new FollowUpItem { Id = "fu1", PersonName = "Alice", Commitment = "Completed", Status = "completed" }
        };

        var result = PlanEngine.GenerateDailyPlan(tasks, followUps, availableMinutes: 120, targetDate: "2026-10-27");

        Assert.Empty(result.RecommendedItems);
        Assert.Empty(result.OverflowItems);
        Assert.Equal(0, result.TotalEstimatedMinutes);
        Assert.Equal(120, result.RemainingMinutes);
    }
}
