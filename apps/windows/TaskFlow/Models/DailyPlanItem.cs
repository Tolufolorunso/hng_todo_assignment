using System.Collections.Generic;

namespace TaskFlow.Models;

public class DailyPlanItem
{
    public string Id { get; set; } = string.Empty;
    public string LocalDate { get; set; } = string.Empty; // YYYY-MM-DD
    public string TimeZone { get; set; } = "UTC";
    public int AvailableMinutes { get; set; } = 480;
    public string ItemsJson { get; set; } = "[]";
    public string? AcceptedAt { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;

    public List<PlanItemReference> Items { get; set; } = new();
}
