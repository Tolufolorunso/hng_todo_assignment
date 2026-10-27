using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Services;

namespace TaskFlow.Repositories;

public class FollowUpRepository : IFollowUpRepository
{
    private readonly DatabaseConnectionFactory _connectionFactory;

    public FollowUpRepository(DatabaseConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<FollowUpItem>> ListAsync(string? status = null, string? search = null)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        var conditions = new List<string>();
        using var cmd = connection.CreateCommand();

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            conditions.Add("status = @status");
            cmd.Parameters.AddWithValue("@status", status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add("(person_name LIKE @search OR commitment LIKE @search OR details LIKE @search)");
            cmd.Parameters.AddWithValue("@search", $"%{search.Trim()}%");
        }

        string whereClause = conditions.Count > 0 ? "WHERE " + string.Join(" AND ", conditions) : string.Empty;
        cmd.CommandText = $@"
            SELECT id, person_name, commitment, details, due_at, time_zone,
                   email_address, phone_number, whatsapp_number, preferred_action,
                   recurrence_json, status, source_note_id, source_excerpt,
                   created_at, updated_at
            FROM followups
            {whereClause}
            ORDER BY due_at ASC;";

        var list = new List<FollowUpItem>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapFollowUp(reader));
        }

        return list;
    }

    public async Task<FollowUpItem?> GetByIdAsync(string id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, person_name, commitment, details, due_at, time_zone,
                   email_address, phone_number, whatsapp_number, preferred_action,
                   recurrence_json, status, source_note_id, source_excerpt,
                   created_at, updated_at
            FROM followups
            WHERE id = @id LIMIT 1;";
        cmd.Parameters.AddWithValue("@id", id);

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapFollowUp(reader);
        }

        return null;
    }

    public async Task<FollowUpItem> CreateAsync(FollowUpItem item)
    {
        if (string.IsNullOrWhiteSpace(item.Id))
        {
            item.Id = $"fu_{Guid.NewGuid():N}";
        }

        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        if (string.IsNullOrWhiteSpace(item.CreatedAt))
        {
            item.CreatedAt = now;
        }
        if (string.IsNullOrWhiteSpace(item.UpdatedAt))
        {
            item.UpdatedAt = now;
        }

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var transaction = connection.BeginTransaction();

        using (var cmd = connection.CreateCommand())
        {
            cmd.Transaction = transaction;
            cmd.CommandText = @"
                INSERT INTO followups (
                    id, person_name, commitment, details, due_at, time_zone,
                    email_address, phone_number, whatsapp_number, preferred_action,
                    recurrence_json, status, source_note_id, source_excerpt,
                    created_at, updated_at
                ) VALUES (
                    @id, @person_name, @commitment, @details, @due_at, @time_zone,
                    @email_address, @phone_number, @whatsapp_number, @preferred_action,
                    @recurrence_json, @status, @source_note_id, @source_excerpt,
                    @created_at, @updated_at
                );";

            AddParameters(cmd, item);
            await cmd.ExecuteNonQueryAsync();
        }

        // Create initial open occurrence
        using (var occCmd = connection.CreateCommand())
        {
            occCmd.Transaction = transaction;
            occCmd.CommandText = @"
                INSERT INTO followup_occurrences (
                    id, followup_id, scheduled_due_time, outcome, resolution_time,
                    created_at, updated_at
                ) VALUES (
                    @id, @followup_id, @scheduled_due_time, 'open', NULL,
                    @created_at, @updated_at
                );";

            occCmd.Parameters.AddWithValue("@id", $"occ_{Guid.NewGuid():N}");
            occCmd.Parameters.AddWithValue("@followup_id", item.Id);
            occCmd.Parameters.AddWithValue("@scheduled_due_time", item.DueAt);
            occCmd.Parameters.AddWithValue("@created_at", now);
            occCmd.Parameters.AddWithValue("@updated_at", now);
            await occCmd.ExecuteNonQueryAsync();
        }

        transaction.Commit();
        return item;
    }

    public async Task<FollowUpItem> UpdateAsync(FollowUpItem item)
    {
        item.UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE followups SET
                person_name = @person_name,
                commitment = @commitment,
                details = @details,
                due_at = @due_at,
                time_zone = @time_zone,
                email_address = @email_address,
                phone_number = @phone_number,
                whatsapp_number = @whatsapp_number,
                preferred_action = @preferred_action,
                recurrence_json = @recurrence_json,
                status = @status,
                source_note_id = @source_note_id,
                source_excerpt = @source_excerpt,
                created_at = @created_at,
                updated_at = @updated_at
            WHERE id = @id;";

        AddParameters(cmd, item);
        await cmd.ExecuteNonQueryAsync();

        return item;
    }

    public async Task<FollowUpItem> CompleteOccurrenceAsync(string followUpId, string? notes = null)
    {
        var item = await GetByIdAsync(followUpId);
        if (item == null)
        {
            throw new KeyNotFoundException($"FollowUp not found: {followUpId}");
        }

        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var transaction = connection.BeginTransaction();

        // 1. Mark latest open occurrence completed
        using (var markCmd = connection.CreateCommand())
        {
            markCmd.Transaction = transaction;
            markCmd.CommandText = @"
                UPDATE followup_occurrences SET
                    outcome = 'completed',
                    resolution_time = @now,
                    updated_at = @now
                WHERE followup_id = @followup_id AND outcome = 'open';";
            markCmd.Parameters.AddWithValue("@now", now);
            markCmd.Parameters.AddWithValue("@followup_id", followUpId);
            await markCmd.ExecuteNonQueryAsync();
        }

        // 2. Check for recurrence rule
        RecurrenceRule? rule = null;
        if (!string.IsNullOrWhiteSpace(item.RecurrenceJson))
        {
            try
            {
                rule = JsonSerializer.Deserialize<RecurrenceRule>(item.RecurrenceJson);
            }
            catch
            {
                rule = null;
            }
        }

        if (rule != null)
        {
            var nowUtc = DateTimeOffset.UtcNow;
            var baseDate = DateTimeOffset.TryParse(item.DueAt, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt) && dt > nowUtc
                ? dt
                : nowUtc;
            string nextDueAt = RecurrenceEngine.ComputeNextDueAt(rule, baseDate);
            item.DueAt = nextDueAt;
            item.UpdatedAt = now;

            using (var updateCmd = connection.CreateCommand())
            {
                updateCmd.Transaction = transaction;
                updateCmd.CommandText = @"
                    UPDATE followups SET
                        due_at = @due_at,
                        updated_at = @updated_at
                    WHERE id = @id;";
                updateCmd.Parameters.AddWithValue("@due_at", nextDueAt);
                updateCmd.Parameters.AddWithValue("@updated_at", now);
                updateCmd.Parameters.AddWithValue("@id", followUpId);
                await updateCmd.ExecuteNonQueryAsync();
            }

            // Create next occurrence
            using (var newOccCmd = connection.CreateCommand())
            {
                newOccCmd.Transaction = transaction;
                newOccCmd.CommandText = @"
                    INSERT INTO followup_occurrences (
                        id, followup_id, scheduled_due_time, outcome, resolution_time,
                        created_at, updated_at
                    ) VALUES (
                        @id, @followup_id, @scheduled_due_time, 'open', NULL,
                        @created_at, @updated_at
                    );";
                newOccCmd.Parameters.AddWithValue("@id", $"occ_{Guid.NewGuid():N}");
                newOccCmd.Parameters.AddWithValue("@followup_id", followUpId);
                newOccCmd.Parameters.AddWithValue("@scheduled_due_time", nextDueAt);
                newOccCmd.Parameters.AddWithValue("@created_at", now);
                newOccCmd.Parameters.AddWithValue("@updated_at", now);
                await newOccCmd.ExecuteNonQueryAsync();
            }
        }
        else
        {
            // One-time completion
            item.Status = "completed";
            item.UpdatedAt = now;

            using (var updateCmd = connection.CreateCommand())
            {
                updateCmd.Transaction = transaction;
                updateCmd.CommandText = @"
                    UPDATE followups SET
                        status = 'completed',
                        updated_at = @updated_at
                    WHERE id = @id;";
                updateCmd.Parameters.AddWithValue("@updated_at", now);
                updateCmd.Parameters.AddWithValue("@id", followUpId);
                await updateCmd.ExecuteNonQueryAsync();
            }
        }

        transaction.Commit();
        return item;
    }

    public async Task<FollowUpItem> SnoozeAsync(string followUpId, int hours = 24)
    {
        var item = await GetByIdAsync(followUpId);
        if (item == null)
        {
            throw new KeyNotFoundException($"FollowUp not found: {followUpId}");
        }

        string newDueAt = RecurrenceEngine.Snooze(item.DueAt, hours);
        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);

        item.DueAt = newDueAt;
        item.UpdatedAt = now;

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var transaction = connection.BeginTransaction();

        using (var updateCmd = connection.CreateCommand())
        {
            updateCmd.Transaction = transaction;
            updateCmd.CommandText = @"
                UPDATE followups SET
                    due_at = @due_at,
                    updated_at = @updated_at
                WHERE id = @id;";
            updateCmd.Parameters.AddWithValue("@due_at", newDueAt);
            updateCmd.Parameters.AddWithValue("@updated_at", now);
            updateCmd.Parameters.AddWithValue("@id", followUpId);
            await updateCmd.ExecuteNonQueryAsync();
        }

        using (var updateOccCmd = connection.CreateCommand())
        {
            updateOccCmd.Transaction = transaction;
            updateOccCmd.CommandText = @"
                UPDATE followup_occurrences SET
                    scheduled_due_time = @due_at,
                    updated_at = @now
                WHERE followup_id = @followup_id AND outcome = 'open';";
            updateOccCmd.Parameters.AddWithValue("@due_at", newDueAt);
            updateOccCmd.Parameters.AddWithValue("@now", now);
            updateOccCmd.Parameters.AddWithValue("@followup_id", followUpId);
            await updateOccCmd.ExecuteNonQueryAsync();
        }

        transaction.Commit();
        return item;
    }

    public async Task<FollowUpItem> RescheduleAsync(string followUpId, string newDueAt)
    {
        var item = await GetByIdAsync(followUpId);
        if (item == null)
        {
            throw new KeyNotFoundException($"FollowUp not found: {followUpId}");
        }

        string validatedDueAt = RecurrenceEngine.Reschedule(newDueAt);
        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);

        item.DueAt = validatedDueAt;
        item.UpdatedAt = now;

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var transaction = connection.BeginTransaction();

        using (var updateCmd = connection.CreateCommand())
        {
            updateCmd.Transaction = transaction;
            updateCmd.CommandText = @"
                UPDATE followups SET
                    due_at = @due_at,
                    updated_at = @updated_at
                WHERE id = @id;";
            updateCmd.Parameters.AddWithValue("@due_at", validatedDueAt);
            updateCmd.Parameters.AddWithValue("@updated_at", now);
            updateCmd.Parameters.AddWithValue("@id", followUpId);
            await updateCmd.ExecuteNonQueryAsync();
        }

        using (var updateOccCmd = connection.CreateCommand())
        {
            updateOccCmd.Transaction = transaction;
            updateOccCmd.CommandText = @"
                UPDATE followup_occurrences SET
                    scheduled_due_time = @due_at,
                    updated_at = @now
                WHERE followup_id = @followup_id AND outcome = 'open';";
            updateOccCmd.Parameters.AddWithValue("@due_at", validatedDueAt);
            updateOccCmd.Parameters.AddWithValue("@now", now);
            updateOccCmd.Parameters.AddWithValue("@followup_id", followUpId);
            await updateOccCmd.ExecuteNonQueryAsync();
        }

        transaction.Commit();
        return item;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var transaction = connection.BeginTransaction();

        using (var deleteOcc = connection.CreateCommand())
        {
            deleteOcc.Transaction = transaction;
            deleteOcc.CommandText = "DELETE FROM followup_occurrences WHERE followup_id = @id;";
            deleteOcc.Parameters.AddWithValue("@id", id);
            await deleteOcc.ExecuteNonQueryAsync();
        }

        int rows;
        using (var deleteFu = connection.CreateCommand())
        {
            deleteFu.Transaction = transaction;
            deleteFu.CommandText = "DELETE FROM followups WHERE id = @id;";
            deleteFu.Parameters.AddWithValue("@id", id);
            rows = await deleteFu.ExecuteNonQueryAsync();
        }

        transaction.Commit();
        return rows > 0;
    }

    public async Task<IReadOnlyList<FollowUpOccurrenceItem>> ListOccurrencesAsync(string followUpId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, followup_id, scheduled_due_time, outcome, resolution_time,
                   created_at, updated_at
            FROM followup_occurrences
            WHERE followup_id = @followup_id
            ORDER BY scheduled_due_time ASC;";
        cmd.Parameters.AddWithValue("@followup_id", followUpId);

        var list = new List<FollowUpOccurrenceItem>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new FollowUpOccurrenceItem
            {
                Id = reader.GetString(0),
                FollowUpId = reader.GetString(1),
                ScheduledDueTime = reader.GetString(2),
                Outcome = reader.GetString(3),
                ResolutionTime = reader.IsDBNull(4) ? null : reader.GetString(4),
                CreatedAt = reader.GetString(5),
                UpdatedAt = reader.GetString(6)
            });
        }

        return list;
    }

    public async Task<IReadOnlyList<FollowUpItem>> ListDueAsync(DateTimeOffset asOf)
    {
        string asOfStr = asOf.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, person_name, commitment, details, due_at, time_zone,
                   email_address, phone_number, whatsapp_number, preferred_action,
                   recurrence_json, status, source_note_id, source_excerpt,
                   created_at, updated_at
            FROM followups
            WHERE status = 'open' AND due_at <= @asOf
            ORDER BY due_at ASC;";
        cmd.Parameters.AddWithValue("@asOf", asOfStr);

        var list = new List<FollowUpItem>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapFollowUp(reader));
        }

        return list;
    }

    private static FollowUpItem MapFollowUp(SqliteDataReader reader)
    {
        return new FollowUpItem
        {
            Id = reader.GetString(0),
            PersonName = reader.GetString(1),
            Commitment = reader.GetString(2),
            Details = reader.IsDBNull(3) ? null : reader.GetString(3),
            DueAt = reader.GetString(4),
            TimeZone = reader.GetString(5),
            EmailAddress = reader.IsDBNull(6) ? null : reader.GetString(6),
            PhoneNumber = reader.IsDBNull(7) ? null : reader.GetString(7),
            WhatsAppNumber = reader.IsDBNull(8) ? null : reader.GetString(8),
            PreferredAction = reader.IsDBNull(9) ? null : reader.GetString(9),
            RecurrenceJson = reader.IsDBNull(10) ? null : reader.GetString(10),
            Status = reader.GetString(11),
            SourceNoteId = reader.IsDBNull(12) ? null : reader.GetString(12),
            SourceExcerpt = reader.IsDBNull(13) ? null : reader.GetString(13),
            CreatedAt = reader.GetString(14),
            UpdatedAt = reader.GetString(15)
        };
    }

    private static void AddParameters(SqliteCommand cmd, FollowUpItem item)
    {
        cmd.Parameters.AddWithValue("@id", item.Id);
        cmd.Parameters.AddWithValue("@person_name", item.PersonName);
        cmd.Parameters.AddWithValue("@commitment", item.Commitment);
        cmd.Parameters.AddWithValue("@details", (object?)item.Details ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@due_at", item.DueAt);
        cmd.Parameters.AddWithValue("@time_zone", item.TimeZone);
        cmd.Parameters.AddWithValue("@email_address", (object?)item.EmailAddress ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@phone_number", (object?)item.PhoneNumber ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@whatsapp_number", (object?)item.WhatsAppNumber ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@preferred_action", (object?)item.PreferredAction ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@recurrence_json", (object?)item.RecurrenceJson ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@status", item.Status);
        cmd.Parameters.AddWithValue("@source_note_id", (object?)item.SourceNoteId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@source_excerpt", (object?)item.SourceExcerpt ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@created_at", item.CreatedAt);
        cmd.Parameters.AddWithValue("@updated_at", item.UpdatedAt);
    }
}
