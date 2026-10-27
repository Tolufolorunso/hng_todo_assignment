using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;

namespace TaskFlow.Repositories;

public class DailyPlanRepository : IDailyPlanRepository
{
    private readonly DatabaseConnectionFactory _connectionFactory;
    private readonly ISyncRepository? _syncRepository;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public DailyPlanRepository(DatabaseConnectionFactory connectionFactory, ISyncRepository? syncRepository = null)
    {
        _connectionFactory = connectionFactory;
        _syncRepository = syncRepository;
    }

    public async Task<DailyPlanItem?> GetByDateAsync(string localDate)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, local_date, time_zone, available_minutes, items_json, accepted_at, created_at, updated_at
            FROM daily_plans
            WHERE local_date = @local_date
            LIMIT 1;";
        cmd.Parameters.AddWithValue("@local_date", localDate);

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapDailyPlan(reader);
        }

        return null;
    }

    public async Task<DailyPlanItem> SaveAsync(DailyPlanItem plan)
    {
        if (string.IsNullOrWhiteSpace(plan.LocalDate))
        {
            throw new ArgumentException("LocalDate is required for a daily plan.", nameof(plan));
        }

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        var existing = await GetByDateAsync(plan.LocalDate);

        if (plan.Items != null && plan.Items.Count > 0)
        {
            plan.ItemsJson = JsonSerializer.Serialize(plan.Items);
        }
        else if (!string.IsNullOrWhiteSpace(plan.ItemsJson))
        {
            try
            {
                plan.Items = JsonSerializer.Deserialize<List<PlanItemReference>>(plan.ItemsJson, JsonOptions) ?? new();
            }
            catch
            {
                plan.Items = new();
            }
        }

        using var cmd = connection.CreateCommand();
        if (existing == null)
        {
            if (string.IsNullOrWhiteSpace(plan.Id))
            {
                plan.Id = $"plan_{Guid.NewGuid():N}";
            }
            plan.CreatedAt = now;
            plan.UpdatedAt = now;

            cmd.CommandText = @"
                INSERT INTO daily_plans (
                    id, local_date, time_zone, available_minutes, items_json, accepted_at, created_at, updated_at
                ) VALUES (
                    @id, @local_date, @time_zone, @available_minutes, @items_json, @accepted_at, @created_at, @updated_at
                );";
            cmd.Parameters.AddWithValue("@id", plan.Id);
            cmd.Parameters.AddWithValue("@local_date", plan.LocalDate);
            cmd.Parameters.AddWithValue("@time_zone", plan.TimeZone);
            cmd.Parameters.AddWithValue("@available_minutes", plan.AvailableMinutes);
            cmd.Parameters.AddWithValue("@items_json", plan.ItemsJson);
            cmd.Parameters.AddWithValue("@accepted_at", (object?)plan.AcceptedAt ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@created_at", plan.CreatedAt);
            cmd.Parameters.AddWithValue("@updated_at", plan.UpdatedAt);
        }
        else
        {
            plan.Id = existing.Id;
            plan.CreatedAt = existing.CreatedAt;
            plan.UpdatedAt = now;
            if (plan.AcceptedAt == null)
            {
                plan.AcceptedAt = existing.AcceptedAt;
            }

            cmd.CommandText = @"
                UPDATE daily_plans SET
                    time_zone = @time_zone,
                    available_minutes = @available_minutes,
                    items_json = @items_json,
                    accepted_at = @accepted_at,
                    updated_at = @updated_at
                WHERE local_date = @local_date;";
            cmd.Parameters.AddWithValue("@local_date", plan.LocalDate);
            cmd.Parameters.AddWithValue("@time_zone", plan.TimeZone);
            cmd.Parameters.AddWithValue("@available_minutes", plan.AvailableMinutes);
            cmd.Parameters.AddWithValue("@items_json", plan.ItemsJson);
            cmd.Parameters.AddWithValue("@accepted_at", (object?)plan.AcceptedAt ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@updated_at", plan.UpdatedAt);
        }

        await cmd.ExecuteNonQueryAsync();

        if (_syncRepository != null)
        {
            var baseRev = await _syncRepository.GetServerRevisionAsync("plan", plan.Id);
            var payload = JsonSerializer.Serialize(plan);
            await _syncRepository.EnqueueMutationAsync("plan", plan.Id, "put", baseRev, payload, connection);
        }

        return plan;
    }

    public async Task<DailyPlanItem> AcceptAsync(string localDate)
    {
        var existing = await GetByDateAsync(localDate);
        if (existing == null)
        {
            throw new KeyNotFoundException($"No daily plan found for date {localDate}");
        }

        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);
        existing.AcceptedAt = now;
        existing.UpdatedAt = now;

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE daily_plans SET
                accepted_at = @accepted_at,
                updated_at = @updated_at
            WHERE local_date = @local_date;";
        cmd.Parameters.AddWithValue("@local_date", localDate);
        cmd.Parameters.AddWithValue("@accepted_at", now);
        cmd.Parameters.AddWithValue("@updated_at", now);

        await cmd.ExecuteNonQueryAsync();

        if (_syncRepository != null)
        {
            var baseRev = await _syncRepository.GetServerRevisionAsync("plan", existing.Id);
            var payload = JsonSerializer.Serialize(existing);
            await _syncRepository.EnqueueMutationAsync("plan", existing.Id, "put", baseRev, payload, connection);
        }

        return existing;
    }

    public async Task<IReadOnlyList<DailyPlanItem>> ListRecentAsync(int limit = 14)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, local_date, time_zone, available_minutes, items_json, accepted_at, created_at, updated_at
            FROM daily_plans
            ORDER BY local_date DESC
            LIMIT @limit;";
        cmd.Parameters.AddWithValue("@limit", limit);

        var list = new List<DailyPlanItem>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapDailyPlan(reader));
        }
        return list;
    }

    private static DailyPlanItem MapDailyPlan(SqliteDataReader reader)
    {
        var item = new DailyPlanItem
        {
            Id = reader.GetString(0),
            LocalDate = reader.GetString(1),
            TimeZone = reader.GetString(2),
            AvailableMinutes = reader.GetInt32(3),
            ItemsJson = reader.GetString(4),
            AcceptedAt = reader.IsDBNull(5) ? null : reader.GetString(5),
            CreatedAt = reader.GetString(6),
            UpdatedAt = reader.GetString(7)
        };

        if (!string.IsNullOrWhiteSpace(item.ItemsJson))
        {
            try
            {
                item.Items = JsonSerializer.Deserialize<List<PlanItemReference>>(item.ItemsJson, JsonOptions) ?? new();
            }
            catch
            {
                item.Items = new();
            }
        }

        return item;
    }
}
