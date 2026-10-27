using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;

namespace TaskFlow.Repositories;

public class InboxRepository : IInboxRepository
{
    private readonly DatabaseConnectionFactory _connectionFactory;
    private static readonly Regex UrlRegex = new(@"https?://[^\s]+", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public InboxRepository(DatabaseConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<InboxCaptureItem>> ListAsync(string? state = null, string? search = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        var conditions = new List<string>();
        using var cmd = connection.CreateCommand();

        if (!string.IsNullOrWhiteSpace(state) && !string.Equals(state, "all", StringComparison.OrdinalIgnoreCase))
        {
            conditions.Add("state = @state");
            cmd.Parameters.AddWithValue("@state", state);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add("(text LIKE @search OR shared_url LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        string whereClause = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : string.Empty;
        cmd.CommandText = $@"
            SELECT id, text, shared_url, source_app_label, state,
                   result_entity_type, result_entity_id, processed_at, captured_at
            FROM inbox_captures
            {whereClause}
            ORDER BY captured_at DESC;";

        var list = new List<InboxCaptureItem>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapInboxCapture(reader));
        }

        return list;
    }

    public async Task<InboxCaptureItem?> GetByIdAsync(string id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, text, shared_url, source_app_label, state,
                   result_entity_type, result_entity_id, processed_at, captured_at
            FROM inbox_captures
            WHERE id = @id
            LIMIT 1;";
        cmd.Parameters.AddWithValue("@id", id);

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapInboxCapture(reader);
        }

        return null;
    }

    public async Task<InboxCaptureItem> CreateAsync(string text, string? sharedUrl = null, string? sourceAppLabel = null)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            throw new ArgumentException("Capture text cannot be empty.", nameof(text));
        }

        string detectedUrl = sharedUrl ?? string.Empty;
        if (string.IsNullOrWhiteSpace(detectedUrl))
        {
            var match = UrlRegex.Match(text);
            if (match.Success)
            {
                detectedUrl = match.Value;
            }
        }

        string id = $"inbox_{Guid.NewGuid():N}";
        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);

        var item = new InboxCaptureItem
        {
            Id = id,
            Text = text.Trim(),
            SharedUrl = string.IsNullOrWhiteSpace(detectedUrl) ? null : detectedUrl,
            SourceAppLabel = string.IsNullOrWhiteSpace(sourceAppLabel) ? null : sourceAppLabel.Trim(),
            State = "pending",
            CapturedAt = now
        };

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO inbox_captures (
                id, text, shared_url, source_app_label, state,
                result_entity_type, result_entity_id, processed_at, captured_at
            ) VALUES (
                @id, @text, @shared_url, @source_app_label, @state,
                @result_entity_type, @result_entity_id, @processed_at, @captured_at
            );";
        cmd.Parameters.AddWithValue("@id", item.Id);
        cmd.Parameters.AddWithValue("@text", item.Text);
        cmd.Parameters.AddWithValue("@shared_url", (object?)item.SharedUrl ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@source_app_label", (object?)item.SourceAppLabel ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@state", item.State);
        cmd.Parameters.AddWithValue("@result_entity_type", DBNull.Value);
        cmd.Parameters.AddWithValue("@result_entity_id", DBNull.Value);
        cmd.Parameters.AddWithValue("@processed_at", DBNull.Value);
        cmd.Parameters.AddWithValue("@captured_at", item.CapturedAt);

        await cmd.ExecuteNonQueryAsync();
        return item;
    }

    public async Task<InboxCaptureItem> MarkProcessedAsync(string id, string resultEntityType, string resultEntityId)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null)
        {
            throw new KeyNotFoundException($"Inbox capture not found: {id}");
        }

        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        existing.State = "processed";
        existing.ResultEntityType = resultEntityType;
        existing.ResultEntityId = resultEntityId;
        existing.ProcessedAt = now;

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE inbox_captures SET
                state = @state,
                result_entity_type = @result_entity_type,
                result_entity_id = @result_entity_id,
                processed_at = @processed_at
            WHERE id = @id;";
        cmd.Parameters.AddWithValue("@state", existing.State);
        cmd.Parameters.AddWithValue("@result_entity_type", resultEntityType);
        cmd.Parameters.AddWithValue("@result_entity_id", resultEntityId);
        cmd.Parameters.AddWithValue("@processed_at", now);
        cmd.Parameters.AddWithValue("@id", id);

        await cmd.ExecuteNonQueryAsync();
        return existing;
    }

    public async Task<InboxCaptureItem> MarkDiscardedAsync(string id)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null)
        {
            throw new KeyNotFoundException($"Inbox capture not found: {id}");
        }

        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        existing.State = "discarded";
        existing.ProcessedAt = now;

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE inbox_captures SET
                state = @state,
                processed_at = @processed_at
            WHERE id = @id;";
        cmd.Parameters.AddWithValue("@state", existing.State);
        cmd.Parameters.AddWithValue("@processed_at", now);
        cmd.Parameters.AddWithValue("@id", id);

        await cmd.ExecuteNonQueryAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM inbox_captures WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", id);

        int rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }

    private static InboxCaptureItem MapInboxCapture(SqliteDataReader reader)
    {
        return new InboxCaptureItem
        {
            Id = reader.GetString(0),
            Text = reader.GetString(1),
            SharedUrl = reader.IsDBNull(2) ? null : reader.GetString(2),
            SourceAppLabel = reader.IsDBNull(3) ? null : reader.GetString(3),
            State = reader.GetString(4),
            ResultEntityType = reader.IsDBNull(5) ? null : reader.GetString(5),
            ResultEntityId = reader.IsDBNull(6) ? null : reader.GetString(6),
            ProcessedAt = reader.IsDBNull(7) ? null : reader.GetString(7),
            CapturedAt = reader.GetString(8)
        };
    }
}
