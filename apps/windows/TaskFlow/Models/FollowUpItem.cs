using System;

namespace TaskFlow.Models;

public class FollowUpItem
{
    public string Id { get; set; } = string.Empty;
    public string PersonName { get; set; } = string.Empty;
    public string Commitment { get; set; } = string.Empty;
    public string? Details { get; set; }
    public string DueAt { get; set; } = string.Empty;
    public string TimeZone { get; set; } = "UTC";
    public string? EmailAddress { get; set; }
    public string? PhoneNumber { get; set; }
    public string? WhatsAppNumber { get; set; }
    public string? PreferredAction { get; set; } // email | phone | whatsapp
    public string? RecurrenceJson { get; set; }

    [System.Text.Json.Serialization.JsonIgnore]
    public RecurrenceRule? Recurrence
    {
        get => string.IsNullOrWhiteSpace(RecurrenceJson)
            ? null
            : System.Text.Json.JsonSerializer.Deserialize<RecurrenceRule>(RecurrenceJson, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        set => RecurrenceJson = value != null ? System.Text.Json.JsonSerializer.Serialize(value) : null;
    }

    public string Status { get; set; } = "open"; // open | completed | archived
    public string? SourceNoteId { get; set; }
    public string? SourceExcerpt { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

