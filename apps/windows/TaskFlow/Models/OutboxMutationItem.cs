using System;

namespace TaskFlow.Models;

public class OutboxMutationItem
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string MutationId { get; set; } = Guid.NewGuid().ToString();
    public int ProtocolVersion { get; set; } = 1;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = "put";
    public int? BaseRevision { get; set; }
    public string? Payload { get; set; }
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("O");
}
