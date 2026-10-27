using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;

namespace TaskFlow.Services;

public class ConflictService : IConflictService
{
    private readonly DatabaseConnectionFactory _connectionFactory;
    private readonly ISyncRepository _syncRepo;

    public ConflictService(DatabaseConnectionFactory connectionFactory, ISyncRepository syncRepo)
    {
        _connectionFactory = connectionFactory;
        _syncRepo = syncRepo;
    }

    public async Task<IReadOnlyList<ConflictItem>> GetConflictsAsync()
    {
        return await _syncRepo.GetConflictsAsync();
    }

    public async Task ResolveKeepLocalAsync(string conflictId)
    {
        var conflicts = await _syncRepo.GetConflictsAsync();
        var conflict = conflicts.FirstOrDefault(c => c.Id == conflictId);
        if (conflict == null)
        {
            return;
        }

        // Re-enqueue local mutation with server revision as base
        await _syncRepo.EnqueueMutationAsync(
            conflict.EntityType,
            conflict.EntityId,
            "put",
            conflict.ServerRevision,
            conflict.LocalValue);

        await _syncRepo.ResolveConflictAsync(conflictId);
    }

    public async Task ResolveKeepServerAsync(string conflictId)
    {
        var conflicts = await _syncRepo.GetConflictsAsync();
        var conflict = conflicts.FirstOrDefault(c => c.Id == conflictId);
        if (conflict == null)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(conflict.ServerValue))
        {
            // Delete local item if server has deleted it
            await DeleteLocalEntityAsync(conflict.EntityType, conflict.EntityId);
        }
        else
        {
            // Apply server payload to local entity
            await ApplyServerPayloadAsync(conflict.EntityType, conflict.EntityId, conflict.ServerValue);
        }

        // Update server revision
        await _syncRepo.SetServerRevisionAsync(conflict.EntityType, conflict.EntityId, conflict.ServerRevision);

        // Clear conflict
        await _syncRepo.ResolveConflictAsync(conflictId);
    }

    private async Task DeleteLocalEntityAsync(string entityType, string entityId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var cmd = connection.CreateCommand();

        string table = entityType switch
        {
            "task" => "tasks",
            "note" => "notes",
            "followup" => "followups",
            "occurrence" => "followup_occurrences",
            "plan" => "daily_plans",
            "inbox" => "inbox_captures",
            "task_order" => "task_orders",
            _ => string.Empty
        };

        if (string.IsNullOrEmpty(table))
        {
            return;
        }

        cmd.CommandText = $"DELETE FROM {table} WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", entityId);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task ApplyServerPayloadAsync(string entityType, string entityId, string jsonPayload)
    {
        using var doc = JsonDocument.Parse(jsonPayload);
        var root = doc.RootElement;

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var cmd = connection.CreateCommand();

        if (entityType == "task")
        {
            string title = root.TryGetProperty("title", out var tEl) ? tEl.GetString() ?? "" : "";
            string? desc = root.TryGetProperty("description", out var dEl) && dEl.ValueKind == JsonValueKind.String ? dEl.GetString() : null;
            bool completed = root.TryGetProperty("completed", out var cEl) && cEl.GetBoolean();
            string? completedAt = root.TryGetProperty("completedAt", out var caEl) && caEl.ValueKind == JsonValueKind.String ? caEl.GetString() : null;
            string priority = root.TryGetProperty("priority", out var pEl) ? pEl.GetString() ?? "medium" : "medium";
            string? dueDate = root.TryGetProperty("dueDate", out var ddEl) && ddEl.ValueKind == JsonValueKind.String ? ddEl.GetString() : null;
            string? category = root.TryGetProperty("category", out var catEl) && catEl.ValueKind == JsonValueKind.String ? catEl.GetString() : null;
            int? estimatedMinutes = root.TryGetProperty("estimatedMinutes", out var emEl) && emEl.ValueKind == JsonValueKind.Number ? emEl.GetInt32() : null;
            string? sourceNoteId = root.TryGetProperty("sourceNoteId", out var snEl) && snEl.ValueKind == JsonValueKind.String ? snEl.GetString() : null;
            string? sourceExcerpt = root.TryGetProperty("sourceExcerpt", out var seEl) && seEl.ValueKind == JsonValueKind.String ? seEl.GetString() : null;
            string createdAt = root.TryGetProperty("createdAt", out var crEl) ? crEl.GetString() ?? DateTime.UtcNow.ToString("O") : DateTime.UtcNow.ToString("O");
            string updatedAt = root.TryGetProperty("updatedAt", out var upEl) ? upEl.GetString() ?? DateTime.UtcNow.ToString("O") : DateTime.UtcNow.ToString("O");

            cmd.CommandText = @"
                INSERT INTO tasks (
                    id, title, description, completed, completed_at, priority, due_date,
                    category, estimated_minutes, source_note_id, source_excerpt, created_at, updated_at
                ) VALUES (
                    @id, @title, @description, @completed, @completed_at, @priority, @due_date,
                    @category, @estimated_minutes, @source_note_id, @source_excerpt, @created_at, @updated_at
                )
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    description = excluded.description,
                    completed = excluded.completed,
                    completed_at = excluded.completed_at,
                    priority = excluded.priority,
                    due_date = excluded.due_date,
                    category = excluded.category,
                    estimated_minutes = excluded.estimated_minutes,
                    source_note_id = excluded.source_note_id,
                    source_excerpt = excluded.source_excerpt,
                    updated_at = excluded.updated_at;";

            cmd.Parameters.AddWithValue("@id", entityId);
            cmd.Parameters.AddWithValue("@title", title);
            cmd.Parameters.AddWithValue("@description", (object?)desc ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@completed", completed ? 1 : 0);
            cmd.Parameters.AddWithValue("@completed_at", (object?)completedAt ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@priority", priority);
            cmd.Parameters.AddWithValue("@due_date", (object?)dueDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@category", (object?)category ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@estimated_minutes", (object?)estimatedMinutes ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@source_note_id", (object?)sourceNoteId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@source_excerpt", (object?)sourceExcerpt ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@created_at", createdAt);
            cmd.Parameters.AddWithValue("@updated_at", updatedAt);
            await cmd.ExecuteNonQueryAsync();
        }
        else if (entityType == "note")
        {
            string title = root.TryGetProperty("title", out var tEl) ? tEl.GetString() ?? "" : "";
            string body = root.TryGetProperty("body", out var bEl) ? bEl.GetString() ?? "" : "";
            string? color = root.TryGetProperty("color", out var cEl) && cEl.ValueKind == JsonValueKind.String ? cEl.GetString() : null;
            bool pinned = root.TryGetProperty("pinned", out var pEl) && pEl.GetBoolean();
            bool archived = root.TryGetProperty("archived", out var aEl) && aEl.GetBoolean();
            string createdAt = root.TryGetProperty("createdAt", out var crEl) ? crEl.GetString() ?? DateTime.UtcNow.ToString("O") : DateTime.UtcNow.ToString("O");
            string updatedAt = root.TryGetProperty("updatedAt", out var upEl) ? upEl.GetString() ?? DateTime.UtcNow.ToString("O") : DateTime.UtcNow.ToString("O");

            cmd.CommandText = @"
                INSERT INTO notes (id, title, body, color, pinned, archived, created_at, updated_at)
                VALUES (@id, @title, @body, @color, @pinned, @archived, @created_at, @updated_at)
                ON CONFLICT(id) DO UPDATE SET
                    title = excluded.title,
                    body = excluded.body,
                    color = excluded.color,
                    pinned = excluded.pinned,
                    archived = excluded.archived,
                    updated_at = excluded.updated_at;";

            cmd.Parameters.AddWithValue("@id", entityId);
            cmd.Parameters.AddWithValue("@title", title);
            cmd.Parameters.AddWithValue("@body", body);
            cmd.Parameters.AddWithValue("@color", (object?)color ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@pinned", pinned ? 1 : 0);
            cmd.Parameters.AddWithValue("@archived", archived ? 1 : 0);
            cmd.Parameters.AddWithValue("@created_at", createdAt);
            cmd.Parameters.AddWithValue("@updated_at", updatedAt);
            await cmd.ExecuteNonQueryAsync();
        }
    }
}
