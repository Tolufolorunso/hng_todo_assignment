using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;

namespace TaskFlow.Services;

public class BackupService : IBackupService
{
    private readonly DatabaseConnectionFactory _connectionFactory;
    private readonly ITaskRepository _taskRepository;
    private readonly INoteRepository _noteRepository;

    public BackupService(
        DatabaseConnectionFactory connectionFactory,
        ITaskRepository taskRepository,
        INoteRepository noteRepository)
    {
        _connectionFactory = connectionFactory;
        _taskRepository = taskRepository;
        _noteRepository = noteRepository;
    }

    public async Task<string> ExportJsonAsync()
    {
        var tasks = await _taskRepository.ListAsync();
        var notes = await _noteRepository.ListAsync();

        var payload = new
        {
            version = 2,
            exportedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture),
            origin = "taskflow-windows",
            tasks,
            notes
        };

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        return JsonSerializer.Serialize(payload, options);
    }

    public async Task<BackupImportResult> ImportJsonAsync(string json, string mode = "merge")
    {
        string normalizedMode = string.Equals(mode, "replace", StringComparison.OrdinalIgnoreCase) ? "replace" : "merge";

        if (string.IsNullOrWhiteSpace(json))
        {
            throw new ArgumentException("Backup JSON cannot be empty", nameof(json));
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json);
        }
        catch (JsonException ex)
        {
            throw new FormatException("Invalid JSON: failed to parse backup data", ex);
        }

        using (doc)
        {
            if (doc.RootElement.ValueKind != JsonValueKind.Object)
            {
                throw new FormatException("Invalid backup: payload must be an object");
            }

            JsonElement tasksElement = default;
            JsonElement notesElement = default;

            if (doc.RootElement.TryGetProperty("tasks", out var tProp) && tProp.ValueKind == JsonValueKind.Array)
            {
                tasksElement = tProp;
            }
            else if (doc.RootElement.TryGetProperty("data", out var dProp) && dProp.ValueKind == JsonValueKind.Object &&
                     dProp.TryGetProperty("tasks", out var dtProp) && dtProp.ValueKind == JsonValueKind.Array)
            {
                tasksElement = dtProp;
            }

            if (doc.RootElement.TryGetProperty("notes", out var nProp) && nProp.ValueKind == JsonValueKind.Array)
            {
                notesElement = nProp;
            }
            else if (doc.RootElement.TryGetProperty("data", out var dataProp) && dataProp.ValueKind == JsonValueKind.Object &&
                     dataProp.TryGetProperty("notes", out var dnProp) && dnProp.ValueKind == JsonValueKind.Array)
            {
                notesElement = dnProp;
            }

            var validTasks = new List<TaskItem>();
            if (tasksElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in tasksElement.EnumerateArray())
                {
                    if (el.ValueKind != JsonValueKind.Object)
                    {
                        continue;
                    }

                    string? title = GetStringProperty(el, "title", "name");
                    if (string.IsNullOrWhiteSpace(title))
                    {
                        continue;
                    }

                    string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
                    string id = GetStringProperty(el, "id") ?? $"task_{Guid.NewGuid():N}";
                    string description = GetStringProperty(el, "description") ?? string.Empty;
                    bool completed = GetBoolProperty(el, "completed");
                    string? completedAt = GetStringProperty(el, "completedAt", "completed_at");
                    string priority = NormalizePriority(GetStringProperty(el, "priority"));
                    string? dueDate = GetStringProperty(el, "dueDate", "due_date");
                    string? category = GetStringProperty(el, "category");
                    int? estimatedMinutes = GetIntProperty(el, "estimatedMinutes", "estimated_minutes");
                    string? sourceNoteId = GetStringProperty(el, "sourceNoteId", "source_note_id");
                    string? sourceExcerpt = GetStringProperty(el, "sourceExcerpt", "source_excerpt");
                    string createdAt = GetStringProperty(el, "createdAt", "created_at") ?? now;
                    string updatedAt = GetStringProperty(el, "updatedAt", "updated_at") ?? now;

                    validTasks.Add(new TaskItem
                    {
                        Id = id,
                        Title = title.Trim(),
                        Description = description.Trim(),
                        Completed = completed,
                        CompletedAt = completedAt,
                        Priority = priority,
                        DueDate = dueDate,
                        Category = category,
                        EstimatedMinutes = estimatedMinutes,
                        SourceNoteId = sourceNoteId,
                        SourceExcerpt = sourceExcerpt,
                        CreatedAt = createdAt,
                        UpdatedAt = updatedAt
                    });
                }
            }

            var validNotes = new List<NoteItem>();
            if (notesElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in notesElement.EnumerateArray())
                {
                    if (el.ValueKind != JsonValueKind.Object)
                    {
                        continue;
                    }

                    string? title = GetStringProperty(el, "title", "name");
                    if (string.IsNullOrWhiteSpace(title))
                    {
                        continue;
                    }

                    string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
                    string id = GetStringProperty(el, "id") ?? $"note_{Guid.NewGuid():N}";
                    string body = GetStringProperty(el, "body") ?? string.Empty;
                    string createdAt = GetStringProperty(el, "createdAt", "created_at") ?? now;
                    string updatedAt = GetStringProperty(el, "updatedAt", "updated_at") ?? now;

                    validNotes.Add(new NoteItem
                    {
                        Id = id,
                        Title = title.Trim(),
                        Body = body.Trim(),
                        CreatedAt = createdAt,
                        UpdatedAt = updatedAt
                    });
                }
            }

            if (validTasks.Count == 0 && validNotes.Count == 0)
            {
                throw new InvalidOperationException("Invalid backup: no valid tasks or notes found in snapshot");
            }

            using var connection = _connectionFactory.CreateConnection();
            await connection.OpenAsync();
            using var transaction = connection.BeginTransaction();

            int tasksImported = 0;
            int notesImported = 0;
            int tasksUpdated = 0;
            int notesUpdated = 0;

            if (normalizedMode == "replace")
            {
                using (var deleteTasks = connection.CreateCommand())
                {
                    deleteTasks.Transaction = transaction;
                    deleteTasks.CommandText = "DELETE FROM tasks;";
                    await deleteTasks.ExecuteNonQueryAsync();
                }

                using (var deleteNotes = connection.CreateCommand())
                {
                    deleteNotes.Transaction = transaction;
                    deleteNotes.CommandText = "DELETE FROM notes;";
                    await deleteNotes.ExecuteNonQueryAsync();
                }

                foreach (var task in validTasks)
                {
                    await InsertTaskAsync(connection, transaction, task);
                    tasksImported++;
                }

                foreach (var note in validNotes)
                {
                    await InsertNoteAsync(connection, transaction, note);
                    notesImported++;
                }
            }
            else
            {
                // Merge mode
                foreach (var task in validTasks)
                {
                    var existingUpdatedAt = await GetExistingTaskUpdatedAtAsync(connection, transaction, task.Id);
                    if (existingUpdatedAt == null)
                    {
                        await InsertTaskAsync(connection, transaction, task);
                        tasksImported++;
                    }
                    else if (IsNewer(task.UpdatedAt, existingUpdatedAt))
                    {
                        await UpdateTaskAsync(connection, transaction, task);
                        tasksUpdated++;
                    }
                }

                foreach (var note in validNotes)
                {
                    var existingUpdatedAt = await GetExistingNoteUpdatedAtAsync(connection, transaction, note.Id);
                    if (existingUpdatedAt == null)
                    {
                        await InsertNoteAsync(connection, transaction, note);
                        notesImported++;
                    }
                    else if (IsNewer(note.UpdatedAt, existingUpdatedAt))
                    {
                        await UpdateNoteAsync(connection, transaction, note);
                        notesUpdated++;
                    }
                }
            }

            transaction.Commit();

            return new BackupImportResult(
                Mode: normalizedMode,
                TasksImported: tasksImported,
                NotesImported: notesImported,
                TasksUpdated: tasksUpdated,
                NotesUpdated: notesUpdated,
                TotalProcessed: tasksImported + notesImported + tasksUpdated + notesUpdated
            );
        }
    }

    private static bool IsNewer(string incoming, string existing)
    {
        if (DateTimeOffset.TryParse(incoming, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dtIncoming) &&
            DateTimeOffset.TryParse(existing, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dtExisting))
        {
            return dtIncoming > dtExisting;
        }

        return string.Compare(incoming, existing, StringComparison.Ordinal) > 0;
    }

    private static string NormalizePriority(string? p)
    {
        if (string.IsNullOrWhiteSpace(p))
        {
            return "medium";
        }

        string lower = p.Trim().ToLowerInvariant();
        return lower switch
        {
            "low" => "low",
            "medium" => "medium",
            "high" => "high",
            "urgent" => "urgent",
            _ => "medium"
        };
    }

    private static string? GetStringProperty(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            if (element.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String)
            {
                return prop.GetString();
            }
        }
        return null;
    }

    private static bool GetBoolProperty(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            if (element.TryGetProperty(name, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.True) return true;
                if (prop.ValueKind == JsonValueKind.False) return false;
            }
        }
        return false;
    }

    private static int? GetIntProperty(JsonElement element, params string[] names)
    {
        foreach (var name in names)
        {
            if (element.TryGetProperty(name, out var prop))
            {
                if (prop.ValueKind == JsonValueKind.Number && prop.TryGetInt32(out int val))
                {
                    return val;
                }
            }
        }
        return null;
    }

    private static async Task<string?> GetExistingTaskUpdatedAtAsync(SqliteConnection connection, SqliteTransaction transaction, string id)
    {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = "SELECT updated_at FROM tasks WHERE id = @id LIMIT 1;";
        cmd.Parameters.AddWithValue("@id", id);
        var result = await cmd.ExecuteScalarAsync();
        return result is string s ? s : null;
    }

    private static async Task<string?> GetExistingNoteUpdatedAtAsync(SqliteConnection connection, SqliteTransaction transaction, string id)
    {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = "SELECT updated_at FROM notes WHERE id = @id LIMIT 1;";
        cmd.Parameters.AddWithValue("@id", id);
        var result = await cmd.ExecuteScalarAsync();
        return result is string s ? s : null;
    }

    private static async Task InsertTaskAsync(SqliteConnection connection, SqliteTransaction transaction, TaskItem task)
    {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = @"
            INSERT INTO tasks (
                id, title, description, completed, completed_at, priority,
                due_date, category, estimated_minutes, source_note_id,
                source_excerpt, created_at, updated_at
            ) VALUES (
                @id, @title, @description, @completed, @completed_at, @priority,
                @due_date, @category, @estimated_minutes, @source_note_id,
                @source_excerpt, @created_at, @updated_at
            );";
        cmd.Parameters.AddWithValue("@id", task.Id);
        cmd.Parameters.AddWithValue("@title", task.Title);
        cmd.Parameters.AddWithValue("@description", (object?)task.Description ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@completed", task.Completed ? 1 : 0);
        cmd.Parameters.AddWithValue("@completed_at", (object?)task.CompletedAt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@priority", task.Priority);
        cmd.Parameters.AddWithValue("@due_date", (object?)task.DueDate ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@category", (object?)task.Category ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@estimated_minutes", (object?)task.EstimatedMinutes ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@source_note_id", (object?)task.SourceNoteId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@source_excerpt", (object?)task.SourceExcerpt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@created_at", task.CreatedAt);
        cmd.Parameters.AddWithValue("@updated_at", task.UpdatedAt);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task UpdateTaskAsync(SqliteConnection connection, SqliteTransaction transaction, TaskItem task)
    {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = @"
            UPDATE tasks SET
                title = @title,
                description = @description,
                completed = @completed,
                completed_at = @completed_at,
                priority = @priority,
                due_date = @due_date,
                category = @category,
                estimated_minutes = @estimated_minutes,
                source_note_id = @source_note_id,
                source_excerpt = @source_excerpt,
                created_at = @created_at,
                updated_at = @updated_at
            WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", task.Id);
        cmd.Parameters.AddWithValue("@title", task.Title);
        cmd.Parameters.AddWithValue("@description", (object?)task.Description ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@completed", task.Completed ? 1 : 0);
        cmd.Parameters.AddWithValue("@completed_at", (object?)task.CompletedAt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@priority", task.Priority);
        cmd.Parameters.AddWithValue("@due_date", (object?)task.DueDate ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@category", (object?)task.Category ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@estimated_minutes", (object?)task.EstimatedMinutes ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@source_note_id", (object?)task.SourceNoteId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@source_excerpt", (object?)task.SourceExcerpt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@created_at", task.CreatedAt);
        cmd.Parameters.AddWithValue("@updated_at", task.UpdatedAt);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task InsertNoteAsync(SqliteConnection connection, SqliteTransaction transaction, NoteItem note)
    {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = @"
            INSERT INTO notes (id, title, body, created_at, updated_at)
            VALUES (@id, @title, @body, @created_at, @updated_at);";
        cmd.Parameters.AddWithValue("@id", note.Id);
        cmd.Parameters.AddWithValue("@title", note.Title);
        cmd.Parameters.AddWithValue("@body", (object?)note.Body ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@created_at", note.CreatedAt);
        cmd.Parameters.AddWithValue("@updated_at", note.UpdatedAt);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task UpdateNoteAsync(SqliteConnection connection, SqliteTransaction transaction, NoteItem note)
    {
        using var cmd = connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = @"
            UPDATE notes SET
                title = @title,
                body = @body,
                created_at = @created_at,
                updated_at = @updated_at
            WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", note.Id);
        cmd.Parameters.AddWithValue("@title", note.Title);
        cmd.Parameters.AddWithValue("@body", (object?)note.Body ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@created_at", note.CreatedAt);
        cmd.Parameters.AddWithValue("@updated_at", note.UpdatedAt);
        await cmd.ExecuteNonQueryAsync();
    }
}
