namespace TaskFlow.Models;

public class PlanItemReference
{
    public string Type { get; set; } = "task"; // task | followup
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public double Score { get; set; }
    public string Explanation { get; set; } = string.Empty;
    public int EstimatedMinutes { get; set; } = 30;
    public bool IsCompleted { get; set; }
}
