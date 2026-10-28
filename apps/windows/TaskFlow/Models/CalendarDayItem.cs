using System;
using System.Collections.Generic;
using System.Linq;
using TaskFlow.Common;

namespace TaskFlow.Models;

public class CalendarDayItem : ObservableObject
{
    private bool _isSelected;

    public DateTime Date { get; set; }
    public int DayNumber => Date.Day;
    public bool IsCurrentMonth { get; set; }
    public bool IsToday { get; set; }

    public bool IsSelected
    {
        get => _isSelected;
        set => SetProperty(ref _isSelected, value);
    }

    public int ItemCount => Items.Count;
    public int TaskCount => Items.Count(i => string.Equals(i.Type, "task", StringComparison.OrdinalIgnoreCase));
    public int FollowUpCount => Items.Count(i => string.Equals(i.Type, "followup", StringComparison.OrdinalIgnoreCase));
    public bool HasTasks => TaskCount > 0;
    public bool HasFollowUps => FollowUpCount > 0;
    public bool HasItems => Items.Count > 0;
    public bool HasFirstItem => Items.Count > 0;
    public bool HasSecondItem => Items.Count > 1;
    public bool HasMoreItems => Items.Count > 2;
    public string MoreItemsText => Items.Count > 2 ? $"+{Items.Count - 2} more" : string.Empty;
    public PlanItemReference? FirstItem => Items.Count > 0 ? Items[0] : null;
    public PlanItemReference? SecondItem => Items.Count > 1 ? Items[1] : null;
    public List<PlanItemReference> Items { get; set; } = new();
}
