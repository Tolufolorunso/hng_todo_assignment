using System;
using System.Globalization;
using TaskFlow.Common;
using TaskFlow.Models;

namespace TaskFlow.ViewModels;

public class FollowUpItemViewModel : ObservableObject
{
    public FollowUpItem Model { get; }

    public FollowUpItemViewModel(FollowUpItem model)
    {
        Model = model ?? throw new ArgumentNullException(nameof(model));
    }

    public string Id => Model.Id;
    public string PersonName => Model.PersonName;
    public string Commitment => Model.Commitment;
    public string? Details => Model.Details;
    public string DueAt => Model.DueAt;
    public string? EmailAddress => Model.EmailAddress;
    public string? PhoneNumber => Model.PhoneNumber;
    public string? WhatsAppNumber => Model.WhatsAppNumber;
    public string? PreferredAction => Model.PreferredAction;
    public string Status => Model.Status;
    public string? SourceNoteId => Model.SourceNoteId;
    public string? SourceExcerpt => Model.SourceExcerpt;
    public RecurrenceRule? Recurrence => Model.Recurrence;

    public string Initials
    {
        get
        {
            if (string.IsNullOrWhiteSpace(PersonName)) return "?";
            var parts = PersonName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 1)
            {
                return parts[0].Length >= 2
                    ? parts[0].Substring(0, 2).ToUpperInvariant()
                    : parts[0].ToUpperInvariant();
            }
            return $"{char.ToUpperInvariant(parts[0][0])}{char.ToUpperInvariant(parts[parts.Length - 1][0])}";
        }
    }

    public string AvatarColor
    {
        get
        {
            string[] colors = { "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EC4899", "#6366F1", "#14B8A6" };
            int hash = Math.Abs((PersonName ?? string.Empty).GetHashCode());
            return colors[hash % colors.Length];
        }
    }

    public bool IsCompleted => string.Equals(Status, "completed", StringComparison.OrdinalIgnoreCase);

    public bool IsOverdue
    {
        get
        {
            if (IsCompleted) return false;
            if (DateTimeOffset.TryParse(DueAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
            {
                return dt < DateTimeOffset.UtcNow;
            }
            return false;
        }
    }

    public string FormattedDueAt
    {
        get
        {
            if (DateTimeOffset.TryParse(DueAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
            {
                return dt.ToLocalTime().ToString("ddd, MMM d, yyyy HH:mm", CultureInfo.InvariantCulture);
            }
            return DueAt;
        }
    }

    public string? RecurrenceLabel
    {
        get
        {
            var r = Recurrence;
            if (r == null) return null;
            string intervalPart = r.Interval > 1 ? $"Every {r.Interval} " : "Every ";
            string freqName = (r.Frequency ?? string.Empty).ToLowerInvariant() switch
            {
                "daily" => r.Interval > 1 ? "days" : "day",
                "weekly" => r.Interval > 1 ? "weeks" : "week",
                "monthly" => r.Interval > 1 ? "months" : "month",
                "customdays" => $"{r.Interval} days",
                _ => r.Frequency ?? "custom"
            };
            string modeName = string.Equals(r.Mode, "calendarAnchored", StringComparison.OrdinalIgnoreCase)
                ? "Calendar-anchored"
                : "Completion-relative";
            return $"{intervalPart}{freqName} ({modeName})";
        }
    }

    public bool HasRecurrence => Recurrence != null;
    public bool HasDetails => !string.IsNullOrWhiteSpace(Details);
    public bool HasSourceNote => !string.IsNullOrWhiteSpace(SourceNoteId);
    public bool HasSourceExcerpt => !string.IsNullOrWhiteSpace(SourceExcerpt);
    public bool HasEmail => !string.IsNullOrWhiteSpace(EmailAddress);
    public bool HasPhone => !string.IsNullOrWhiteSpace(PhoneNumber);
    public bool HasWhatsApp => !string.IsNullOrWhiteSpace(WhatsAppNumber);
    public bool IsPreferredEmail => string.Equals(PreferredAction, "email", StringComparison.OrdinalIgnoreCase);
    public bool IsPreferredPhone => string.Equals(PreferredAction, "phone", StringComparison.OrdinalIgnoreCase);
    public bool IsPreferredWhatsApp => string.Equals(PreferredAction, "whatsapp", StringComparison.OrdinalIgnoreCase);
}

