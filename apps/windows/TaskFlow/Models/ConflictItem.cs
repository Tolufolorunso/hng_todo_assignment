using System;

namespace TaskFlow.Models;

public class ConflictItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string WorkspaceId { get; set; } = "default";
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? LocalValue { get; set; }
    public string? ServerValue { get; set; }
    public int ServerRevision { get; set; }
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("O");
}
