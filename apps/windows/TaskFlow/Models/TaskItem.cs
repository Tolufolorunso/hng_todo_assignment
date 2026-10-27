namespace TaskFlow.Models;

public class TaskItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Completed { get; set; }
    public string? CompletedAt { get; set; }
    public string Priority { get; set; } = "medium";
    public string? DueDate { get; set; }
    public string? Category { get; set; }
    public int? EstimatedMinutes { get; set; }
    public string? SourceNoteId { get; set; }
    public string? SourceExcerpt { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}
