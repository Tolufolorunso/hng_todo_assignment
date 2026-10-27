namespace TaskFlow.Models;

public class TaskOrderItem
{
    public string Id { get; set; } = "default";
    public string OrderedIdsJson { get; set; } = "[]";
    public string UpdatedAt { get; set; } = string.Empty;
}
