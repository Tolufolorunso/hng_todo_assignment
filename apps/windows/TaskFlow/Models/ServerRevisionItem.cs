namespace TaskFlow.Models;

public class ServerRevisionItem
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public int ServerRevision { get; set; }
}
