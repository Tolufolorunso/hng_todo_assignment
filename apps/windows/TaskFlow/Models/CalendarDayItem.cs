using System;
using System.Collections.Generic;

namespace TaskFlow.Models;

public class CalendarDayItem
{
    public DateTime Date { get; set; }
    public int DayNumber => Date.Day;
    public bool IsCurrentMonth { get; set; }
    public bool IsToday { get; set; }
    public bool IsSelected { get; set; }
    public int ItemCount => Items.Count;
    public List<PlanItemReference> Items { get; set; } = new();
}
