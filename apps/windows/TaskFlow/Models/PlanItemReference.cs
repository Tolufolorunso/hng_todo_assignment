using System;
using TaskFlow.Common;

namespace TaskFlow.Models;

public class PlanItemReference : ObservableObject
{
    private bool _isCompleted;
    private int _estimatedMinutes = 30;

    public string Type { get; set; } = "task"; // task | followup
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public double Score { get; set; }
    public string Explanation { get; set; } = string.Empty;

    public int EstimatedMinutes
    {
        get => _estimatedMinutes;
        set
        {
            if (SetProperty(ref _estimatedMinutes, value))
            {
                OnPropertyChanged(nameof(FormattedEstimate));
            }
        }
    }

    public bool IsCompleted
    {
        get => _isCompleted;
        set => SetProperty(ref _isCompleted, value);
    }

    public bool IsTask => string.Equals(Type, "task", StringComparison.OrdinalIgnoreCase);
    public string TypeLabel => IsTask ? "TASK" : "FOLLOW UP";
    public string FormattedEstimate => $"{EstimatedMinutes}m";
    public bool HasExplanation => !string.IsNullOrWhiteSpace(Explanation);
}
