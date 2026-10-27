using System;

namespace TaskFlow.Models;

public class TombstoneItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string WorkspaceId { get; set; } = "default";
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string DeletedAt { get; set; } = DateTime.UtcNow.ToString("O");
}
