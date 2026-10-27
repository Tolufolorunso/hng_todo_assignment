using System.Collections.Generic;

namespace TaskFlow.Models;

public class RecurrenceRule
{
    public string Mode { get; set; } = "calendarAnchored"; // calendarAnchored | completionRelative
    public string Frequency { get; set; } = "daily"; // daily | weekly | biweekly | monthly | yearly
    public int Interval { get; set; } = 1;
    public List<int>? Weekdays { get; set; }
    public int? MonthDay { get; set; }
    public string? LocalTime { get; set; }
    public string? EndCondition { get; set; }
}
