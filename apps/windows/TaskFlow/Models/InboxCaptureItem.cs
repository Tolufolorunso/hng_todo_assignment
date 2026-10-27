namespace TaskFlow.Models;

public class InboxCaptureItem
{
    public string Id { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string? SharedUrl { get; set; }
    public string? SourceAppLabel { get; set; }
    public string State { get; set; } = "pending"; // pending | processed | discarded
    public string? ResultEntityType { get; set; } // task | note | followup
    public string? ResultEntityId { get; set; }
    public string? ProcessedAt { get; set; }
    public string CapturedAt { get; set; } = string.Empty;
}
