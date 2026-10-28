using System;
using System.Globalization;
using TaskFlow.Common;
using TaskFlow.Models;

namespace TaskFlow.ViewModels;

/// <summary>
/// Observable ViewModel wrapping TaskItem for rich UI presentation, Show More/Less toggle,
/// overdue status calculations, and Web-matching badge formatting.
/// </summary>
public class TaskItemViewModel : ObservableObject
{
    private readonly TaskItem _model;
    private bool _isExpanded;

    public TaskItem Model => _model;

    public string Id => _model.Id;
    public string Title => _model.Title;
    public string? Description => _model.Description;
    public bool Completed => _model.Completed;
    public string? CompletedAt => _model.CompletedAt;
    public string Priority => _model.Priority;
    public string? Category => _model.Category;
    public string? DueDate => _model.DueDate;
    public int? EstimatedMinutes => _model.EstimatedMinutes;
    public string? SourceNoteId => _model.SourceNoteId;
    public string? SourceExcerpt => _model.SourceExcerpt;
    public string CreatedAt => _model.CreatedAt;
    public string UpdatedAt => _model.UpdatedAt;

    public bool IsExpanded
    {
        get => _isExpanded;
        set
        {
            if (SetProperty(ref _isExpanded, value))
            {
                OnPropertyChanged(nameof(ShowMoreText));
            }
        }
    }

    public string ShowMoreText => IsExpanded ? "Show less" : "Show more";

    public bool HasDescription => !string.IsNullOrWhiteSpace(_model.Description);

    public bool IsLongDescription => HasDescription &&
        HtmlMetricsHelper.StripHtmlToText(_model.Description).Length > 180;

    public bool HasCategory => !string.IsNullOrWhiteSpace(_model.Category);

    public string CategoryLabel => (_model.Category ?? string.Empty).ToUpperInvariant();

    public string PriorityLabel => (_model.Priority ?? "medium").ToUpperInvariant();

    public bool HasSourceNote => !string.IsNullOrWhiteSpace(_model.SourceNoteId);

    public bool HasSourceExcerpt => !string.IsNullOrWhiteSpace(_model.SourceExcerpt);

    public bool HasEstimatedMinutes => _model.EstimatedMinutes.HasValue && _model.EstimatedMinutes.Value > 0;

    public string FormattedEstimatedMinutes => HasEstimatedMinutes ? $"⏱️ {_model.EstimatedMinutes}m" : string.Empty;

    public bool IsOverdue
    {
        get
        {
            if (_model.Completed || string.IsNullOrWhiteSpace(_model.DueDate)) return false;
            if (DateTime.TryParse(_model.DueDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dt))
            {
                return dt.Date < DateTime.UtcNow.Date;
            }
            return false;
        }
    }

    public string FormattedDueDate
    {
        get
        {
            if (string.IsNullOrWhiteSpace(_model.DueDate)) return string.Empty;
            if (DateTime.TryParse(_model.DueDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dt))
            {
                string formatted = dt.ToString("MMM d", CultureInfo.InvariantCulture);
                return IsOverdue ? $"Overdue, {formatted}" : formatted;
            }
            return _model.DueDate;
        }
    }

    public TaskItemViewModel(TaskItem model)
    {
        _model = model ?? throw new ArgumentNullException(nameof(model));
    }

    public void ToggleExpanded()
    {
        IsExpanded = !IsExpanded;
    }
}
