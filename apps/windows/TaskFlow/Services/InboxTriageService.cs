using System;
using System.IO;
using System.Threading.Tasks;
using TaskFlow.Models;
using TaskFlow.Repositories;

namespace TaskFlow.Services;

public class InboxTriageService
{
    private readonly IInboxRepository _inboxRepo;
    private readonly ITaskRepository _taskRepo;
    private readonly INoteRepository _noteRepo;
    private readonly IFollowUpRepository _followUpRepo;

    public InboxTriageService(
        IInboxRepository inboxRepo,
        ITaskRepository taskRepo,
        INoteRepository noteRepo,
        IFollowUpRepository followUpRepo)
    {
        _inboxRepo = inboxRepo;
        _taskRepo = taskRepo;
        _noteRepo = noteRepo;
        _followUpRepo = followUpRepo;
    }

    public async Task<(InboxCaptureItem Capture, TaskItem Task)> TriageToTaskAsync(
        string captureId,
        string? title = null,
        string priority = "medium",
        string category = "work",
        string? dueDate = null,
        int estimatedMinutes = 30)
    {
        var capture = await _inboxRepo.GetByIdAsync(captureId);
        if (capture == null)
        {
            throw new KeyNotFoundException($"Capture {captureId} not found");
        }

        if (string.Equals(capture.State, "processed", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(capture.ResultEntityType, "task", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(capture.ResultEntityId))
        {
            var existing = await _taskRepo.GetByIdAsync(capture.ResultEntityId);
            if (existing != null)
            {
                return (capture, existing);
            }
        }

        string rawText = capture.Text.Trim();
        string firstLine = string.IsNullOrWhiteSpace(title)
            ? (rawText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length > 0
                ? rawText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)[0].Trim()
                : "New Task")
            : title.Trim();

        string taskTitle = firstLine.Length > 80 ? firstLine.Substring(0, 77) + "..." : firstLine;
        string description = rawText;
        if (!string.IsNullOrWhiteSpace(capture.SharedUrl) && !description.Contains(capture.SharedUrl))
        {
            description += $"\n\nLink: {capture.SharedUrl}";
        }

        var task = new TaskItem
        {
            Title = taskTitle,
            Description = description,
            Priority = priority,
            Category = category,
            DueDate = dueDate,
            EstimatedMinutes = estimatedMinutes,
            SourceExcerpt = capture.Text
        };

        var createdTask = await _taskRepo.CreateAsync(task);
        var updatedCapture = await _inboxRepo.MarkProcessedAsync(captureId, "task", createdTask.Id);
        return (updatedCapture, createdTask);
    }

    public async Task<(InboxCaptureItem Capture, NoteItem Note)> TriageToNoteAsync(
        string captureId,
        string? title = null)
    {
        var capture = await _inboxRepo.GetByIdAsync(captureId);
        if (capture == null)
        {
            throw new KeyNotFoundException($"Capture {captureId} not found");
        }

        if (string.Equals(capture.State, "processed", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(capture.ResultEntityType, "note", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(capture.ResultEntityId))
        {
            var existing = await _noteRepo.GetByIdAsync(capture.ResultEntityId);
            if (existing != null)
            {
                return (capture, existing);
            }
        }

        string rawText = capture.Text.Trim();
        string firstLine = string.IsNullOrWhiteSpace(title)
            ? (rawText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length > 0
                ? rawText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)[0].Trim()
                : "New Note")
            : title.Trim();

        string noteTitle = firstLine.Length > 60 ? firstLine.Substring(0, 57) + "..." : firstLine;
        string body = rawText;
        if (!string.IsNullOrWhiteSpace(capture.SharedUrl) && !body.Contains(capture.SharedUrl))
        {
            body += $"\n\nLink: {capture.SharedUrl}";
        }

        var note = new NoteItem
        {
            Title = noteTitle,
            Body = body
        };

        var createdNote = await _noteRepo.CreateAsync(note);
        var updatedCapture = await _inboxRepo.MarkProcessedAsync(captureId, "note", createdNote.Id);
        return (updatedCapture, createdNote);
    }

    public async Task<(InboxCaptureItem Capture, FollowUpItem FollowUp)> TriageToFollowUpAsync(
        string captureId,
        string personName,
        string? commitment = null,
        string? dueAt = null,
        string? preferredAction = null,
        string? email = null,
        string? phone = null,
        string? whatsapp = null)
    {
        var capture = await _inboxRepo.GetByIdAsync(captureId);
        if (capture == null)
        {
            throw new KeyNotFoundException($"Capture {captureId} not found");
        }

        string rawText = capture.Text.Trim();
        string comm = string.IsNullOrWhiteSpace(commitment)
            ? (rawText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries).Length > 0
                ? rawText.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)[0].Trim()
                : "Follow up")
            : commitment.Trim();

        var followUp = new FollowUpItem
        {
            PersonName = personName,
            Commitment = comm,
            Details = rawText,
            DueAt = !string.IsNullOrWhiteSpace(dueAt) ? dueAt : DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            PreferredAction = preferredAction,
            EmailAddress = email,
            PhoneNumber = phone,
            WhatsAppNumber = whatsapp,
            SourceExcerpt = capture.Text
        };

        var createdFollowUp = await _followUpRepo.CreateAsync(followUp);
        var updatedCapture = await _inboxRepo.MarkProcessedAsync(captureId, "followup", createdFollowUp.Id);
        return (updatedCapture, createdFollowUp);
    }
}
