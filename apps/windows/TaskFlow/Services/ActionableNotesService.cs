using System;
using System.Threading.Tasks;
using TaskFlow.Models;
using TaskFlow.Repositories;

namespace TaskFlow.Services;

public class ActionableNotesService
{
    private readonly ITaskRepository _taskRepo;
    private readonly IFollowUpRepository _followUpRepo;
    private readonly INoteRepository _noteRepo;

    public ActionableNotesService(
        ITaskRepository taskRepo,
        IFollowUpRepository followUpRepo,
        INoteRepository noteRepo)
    {
        _taskRepo = taskRepo;
        _followUpRepo = followUpRepo;
        _noteRepo = noteRepo;
    }

    public async Task<TaskItem> CreateTaskFromNoteAsync(
        string noteId,
        string excerpt,
        string? taskTitle = null,
        string priority = "medium",
        string category = "work",
        string? dueDate = null,
        int estimatedMinutes = 30)
    {
        var note = await _noteRepo.GetByIdAsync(noteId);
        if (note == null)
        {
            throw new KeyNotFoundException($"Note {noteId} not found");
        }

        string trimmedExcerpt = excerpt.Trim();
        if (trimmedExcerpt.Length > 2000)
        {
            trimmedExcerpt = trimmedExcerpt.Substring(0, 1997) + "...";
        }

        string title = !string.IsNullOrWhiteSpace(taskTitle)
            ? taskTitle.Trim()
            : (trimmedExcerpt.Length > 80 ? trimmedExcerpt.Substring(0, 77) + "..." : trimmedExcerpt);

        var task = new TaskItem
        {
            Title = title,
            Description = trimmedExcerpt,
            Priority = priority,
            Category = category,
            DueDate = dueDate,
            EstimatedMinutes = estimatedMinutes,
            SourceNoteId = noteId,
            SourceExcerpt = trimmedExcerpt
        };

        return await _taskRepo.CreateAsync(task);
    }

    public async Task<FollowUpItem> CreateFollowUpFromNoteAsync(
        string noteId,
        string excerpt,
        string personName,
        string commitment,
        string? dueAt = null,
        string? preferredAction = null,
        string? email = null,
        string? phone = null,
        string? whatsapp = null)
    {
        var note = await _noteRepo.GetByIdAsync(noteId);
        if (note == null)
        {
            throw new KeyNotFoundException($"Note {noteId} not found");
        }

        string trimmedExcerpt = excerpt.Trim();
        if (trimmedExcerpt.Length > 2000)
        {
            trimmedExcerpt = trimmedExcerpt.Substring(0, 1997) + "...";
        }

        var followUp = new FollowUpItem
        {
            PersonName = personName,
            Commitment = commitment,
            Details = trimmedExcerpt,
            DueAt = !string.IsNullOrWhiteSpace(dueAt) ? dueAt : DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
            PreferredAction = preferredAction,
            EmailAddress = email,
            PhoneNumber = phone,
            WhatsAppNumber = whatsapp,
            SourceNoteId = noteId,
            SourceExcerpt = trimmedExcerpt
        };

        return await _followUpRepo.CreateAsync(followUp);
    }
}
