using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;

using System.Text.Json;

namespace TaskFlow.Repositories;

public class TaskRepository : ITaskRepository
{
    private readonly DatabaseConnectionFactory _connectionFactory;
    private readonly ISyncRepository? _syncRepository;

    public TaskRepository(DatabaseConnectionFactory connectionFactory, ISyncRepository? syncRepository = null)
    {
        _connectionFactory = connectionFactory;
        _syncRepository = syncRepository;
    }

    public async Task<IReadOnlyList<TaskItem>> ListAsync(string? status = null, string? category = null, string? search = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        var conditions = new List<string>();
        using var cmd = connection.CreateCommand();

        if (string.Equals(status, "active", StringComparison.OrdinalIgnoreCase))
        {
            conditions.Add("completed = 0");
        }
        else if (string.Equals(status, "completed", StringComparison.OrdinalIgnoreCase))
        {
            conditions.Add("completed = 1");
        }

        if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase))
        {
            conditions.Add("category = @category");
            cmd.Parameters.AddWithValue("@category", category);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add("(title LIKE @search OR description LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        string whereClause = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : "";
        cmd.CommandText = $@"
            SELECT id, title, description, completed, completed_at, priority, due_date, category,
                   estimated_minutes, source_note_id, source_excerpt, created_at, updated_at
            FROM tasks
            {whereClause}
            ORDER BY created_at DESC;";

        var list = new List<TaskItem>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapTask(reader));
        }

        return list;
    }

    public async Task<TaskItem?> GetByIdAsync(string id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, title, description, completed, completed_at, priority, due_date, category,
                   estimated_minutes, source_note_id, source_excerpt, created_at, updated_at
            FROM tasks
            WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", id);

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapTask(reader);
        }

        return null;
    }

    public async Task<TaskItem> CreateAsync(TaskItem task)
    {
        if (string.IsNullOrWhiteSpace(task.Id))
        {
            task.Id = $"task_{Guid.NewGuid():N}";
        }

        string now = DateTime.UtcNow.ToString("O");
        if (string.IsNullOrWhiteSpace(task.CreatedAt))
        {
            task.CreatedAt = now;
        }
        if (string.IsNullOrWhiteSpace(task.UpdatedAt))
        {
            task.UpdatedAt = now;
        }

        if (task.Completed && string.IsNullOrWhiteSpace(task.CompletedAt))
        {
            task.CompletedAt = now;
        }

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO tasks (
                id, title, description, completed, completed_at, priority, due_date, category,
                estimated_minutes, source_note_id, source_excerpt, created_at, updated_at
            ) VALUES (
                @id, @title, @description, @completed, @completed_at, @priority, @due_date, @category,
                @estimated_minutes, @source_note_id, @source_excerpt, @created_at, @updated_at
            );";

        AddParameters(cmd, task);
        await cmd.ExecuteNonQueryAsync();

        if (_syncRepository != null)
        {
            var payload = JsonSerializer.Serialize(task);
            await _syncRepository.EnqueueMutationAsync("task", task.Id, "put", null, payload, connection);
        }

        return task;
    }

    public async Task<TaskItem> UpdateAsync(TaskItem task)
    {
        task.UpdatedAt = DateTime.UtcNow.ToString("O");
        if (task.Completed && string.IsNullOrWhiteSpace(task.CompletedAt))
        {
            task.CompletedAt = task.UpdatedAt;
        }
        else if (!task.Completed)
        {
            task.CompletedAt = null;
        }

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
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
                updated_at = @updated_at
            WHERE id = @id;";

        AddParameters(cmd, task);
        int rows = await cmd.ExecuteNonQueryAsync();
        if (rows == 0)
        {
            throw new InvalidOperationException($"Task with id '{task.Id}' not found.");
        }

        if (_syncRepository != null)
        {
            var baseRev = await _syncRepository.GetServerRevisionAsync("task", task.Id);
            var payload = JsonSerializer.Serialize(task);
            await _syncRepository.EnqueueMutationAsync("task", task.Id, "put", baseRev, payload, connection);
        }

        return task;
    }

    public async Task<TaskItem> ToggleCompleteAsync(string id)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null)
        {
            throw new InvalidOperationException($"Task with id '{id}' not found.");
        }

        existing.Completed = !existing.Completed;
        string now = DateTime.UtcNow.ToString("O");
        existing.UpdatedAt = now;
        existing.CompletedAt = existing.Completed ? now : null;

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE tasks SET
                completed = @completed,
                completed_at = @completed_at,
                updated_at = @updated_at
            WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@completed", existing.Completed ? 1 : 0);
        cmd.Parameters.AddWithValue("@completed_at", (object?)existing.CompletedAt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@updated_at", existing.UpdatedAt);

        await cmd.ExecuteNonQueryAsync();

        if (_syncRepository != null)
        {
            var baseRev = await _syncRepository.GetServerRevisionAsync("task", existing.Id);
            var payload = JsonSerializer.Serialize(existing);
            await _syncRepository.EnqueueMutationAsync("task", existing.Id, "put", baseRev, payload, connection);
        }

        return existing;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM tasks WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", id);

        int rows = await cmd.ExecuteNonQueryAsync();

        if (rows > 0 && _syncRepository != null)
        {
            var baseRev = await _syncRepository.GetServerRevisionAsync("task", id);
            await _syncRepository.EnqueueMutationAsync("task", id, "delete", baseRev, null, connection);
            await _syncRepository.RecordTombstoneAsync("task", id);
        }

        return rows > 0;
    }

    private static void AddParameters(SqliteCommand cmd, TaskItem task)
    {
        cmd.Parameters.AddWithValue("@id", task.Id);
        cmd.Parameters.AddWithValue("@title", task.Title);
        cmd.Parameters.AddWithValue("@description", (object?)task.Description ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@completed", task.Completed ? 1 : 0);
        cmd.Parameters.AddWithValue("@completed_at", (object?)task.CompletedAt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@priority", task.Priority ?? "medium");
        cmd.Parameters.AddWithValue("@due_date", (object?)task.DueDate ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@category", (object?)task.Category ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@estimated_minutes", (object?)task.EstimatedMinutes ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@source_note_id", (object?)task.SourceNoteId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@source_excerpt", (object?)task.SourceExcerpt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@created_at", task.CreatedAt);
        cmd.Parameters.AddWithValue("@updated_at", task.UpdatedAt);
    }

    private static TaskItem MapTask(SqliteDataReader reader)
    {
        return new TaskItem
        {
            Id = reader.GetString(0),
            Title = reader.GetString(1),
            Description = reader.IsDBNull(2) ? null : reader.GetString(2),
            Completed = reader.GetInt32(3) == 1,
            CompletedAt = reader.IsDBNull(4) ? null : reader.GetString(4),
            Priority = reader.GetString(5),
            DueDate = reader.IsDBNull(6) ? null : reader.GetString(6),
            Category = reader.IsDBNull(7) ? null : reader.GetString(7),
            EstimatedMinutes = reader.IsDBNull(8) ? null : reader.GetInt32(8),
            SourceNoteId = reader.IsDBNull(9) ? null : reader.GetString(9),
            SourceExcerpt = reader.IsDBNull(10) ? null : reader.GetString(10),
            CreatedAt = reader.GetString(11),
            UpdatedAt = reader.GetString(12)
        };
    }
}
