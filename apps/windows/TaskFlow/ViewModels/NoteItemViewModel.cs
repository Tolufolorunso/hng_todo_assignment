using System;
using System.Globalization;
using TaskFlow.Common;
using TaskFlow.Models;

namespace TaskFlow.ViewModels;

/// <summary>
/// Observable ViewModel wrapping NoteItem with reactive presentation properties,
/// excerpt extraction, word count, reading time estimates, and formatted timestamps.
/// </summary>
public class NoteItemViewModel : ObservableObject
{
    private readonly NoteItem _model;

    public NoteItem Model => _model;

    public string Id => _model.Id;
    public string Title => _model.Title;
    public string Body => _model.Body;
    public string CreatedAt => _model.CreatedAt;
    public string UpdatedAt => _model.UpdatedAt;

    public bool HasBody => !string.IsNullOrWhiteSpace(_model.Body);

    public string Excerpt => HtmlMetricsHelper.CreateExcerpt(_model.Body, 120);

    public int WordCount => HtmlMetricsHelper.CalculateReadingStats(_model.Body).Words;

    public int ReadingTimeMinutes => HtmlMetricsHelper.CalculateReadingStats(_model.Body).ReadingTimeMinutes;

    public string FormattedReadingStats
    {
        get
        {
            var stats = HtmlMetricsHelper.CalculateReadingStats(_model.Body);
            string wordLabel = stats.Words == 1 ? "word" : "words";
            return stats.Words > 0
                ? $"{stats.Words} {wordLabel} ({stats.ReadingTimeMinutes}m)"
                : "0 words";
        }
    }

    public string FormattedUpdatedAt
    {
        get
        {
            if (string.IsNullOrWhiteSpace(_model.UpdatedAt)) return string.Empty;
            if (DateTime.TryParse(_model.UpdatedAt, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var dt))
            {
                return dt.ToString("MMM d, yyyy", CultureInfo.InvariantCulture);
            }
            return _model.UpdatedAt;
        }
    }

    public NoteItemViewModel(NoteItem model)
    {
        _model = model ?? throw new ArgumentNullException(nameof(model));
    }
}

