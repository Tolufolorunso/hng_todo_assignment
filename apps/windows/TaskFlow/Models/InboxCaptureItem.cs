using System;
using System.Globalization;
using TaskFlow.Common;

namespace TaskFlow.Models;

public class InboxCaptureItem : ObservableObject
{
    private string _state = "pending";
    private string? _resultEntityType;
    private string? _resultEntityId;
    private string? _processedAt;

    public string Id { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public string? SharedUrl { get; set; }
    public string? SourceAppLabel { get; set; }

    public string State
    {
        get => _state;
        set
        {
            if (SetProperty(ref _state, value))
            {
                OnPropertyChanged(nameof(IsPending));
                OnPropertyChanged(nameof(IsProcessed));
                OnPropertyChanged(nameof(StateBadgeColor));
            }
        }
    }

    public string? ResultEntityType
    {
        get => _resultEntityType;
        set => SetProperty(ref _resultEntityType, value);
    }

    public string? ResultEntityId
    {
        get => _resultEntityId;
        set => SetProperty(ref _resultEntityId, value);
    }

    public string? ProcessedAt
    {
        get => _processedAt;
        set => SetProperty(ref _processedAt, value);
    }

    public string CapturedAt { get; set; } = string.Empty;

    public bool HasUrl => !string.IsNullOrWhiteSpace(SharedUrl);
    public bool IsPending => string.Equals(State, "pending", StringComparison.OrdinalIgnoreCase);
    public bool IsProcessed => string.Equals(State, "processed", StringComparison.OrdinalIgnoreCase);

    public string StateBadgeColor => IsProcessed ? "#10B981" : IsPending ? "#F59E0B" : "#64748B";

    public string FormattedCapturedAt
    {
        get
        {
            if (DateTimeOffset.TryParse(CapturedAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
            {
                return dt.ToLocalTime().ToString("MMM d, HH:mm", CultureInfo.InvariantCulture);
            }
            return CapturedAt;
        }
    }
}
