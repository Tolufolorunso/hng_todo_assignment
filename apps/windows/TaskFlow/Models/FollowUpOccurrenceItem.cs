namespace TaskFlow.Models;

public class FollowUpOccurrenceItem
{
    public string Id { get; set; } = string.Empty;
    public string FollowUpId { get; set; } = string.Empty;
    public string ScheduledDueTime { get; set; } = string.Empty;
    public string Outcome { get; set; } = "open"; // open | completed | skipped | missed
    public string? ResolutionTime { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}
