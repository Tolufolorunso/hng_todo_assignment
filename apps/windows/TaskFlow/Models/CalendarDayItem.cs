using System;
using System.Collections.Generic;
using System.Linq;

namespace TaskFlow.Models;

public class CalendarDayItem
{
    public DateTime Date { get; set; }
    public int DayNumber => Date.Day;
    public bool IsCurrentMonth { get; set; }
    public bool IsToday { get; set; }
    public bool IsSelected { get; set; }
    public int ItemCount => Items.Count;
    public int TaskCount => Items.Count(i => string.Equals(i.Type, "task", StringComparison.OrdinalIgnoreCase));
    public int FollowUpCount => Items.Count(i => string.Equals(i.Type, "followup", StringComparison.OrdinalIgnoreCase));
    public bool HasTasks => TaskCount > 0;
    public bool HasFollowUps => FollowUpCount > 0;
    public List<PlanItemReference> Items { get; set; } = new();
}
