using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;

namespace TaskFlow.Repositories;

public class TaskOrderRepository : ITaskOrderRepository
{
    private readonly DatabaseConnectionFactory _connectionFactory;
    private readonly ISyncRepository? _syncRepository;

    public TaskOrderRepository(DatabaseConnectionFactory connectionFactory, ISyncRepository? syncRepository = null)
    {
        _connectionFactory = connectionFactory;
        _syncRepository = syncRepository;
    }

    public async Task<IReadOnlyList<string>> GetOrderAsync(string id = "default")
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT ordered_ids_json
            FROM task_orders
            WHERE id = @id
            LIMIT 1;";
        cmd.Parameters.AddWithValue("@id", id);

        var result = await cmd.ExecuteScalarAsync();
        if (result != null && result is string json && !string.IsNullOrWhiteSpace(json))
        {
            try
            {
                var list = JsonSerializer.Deserialize<List<string>>(json);
                return list ?? (IReadOnlyList<string>)Array.Empty<string>();
            }
            catch
            {
                return Array.Empty<string>();
            }
        }

        return Array.Empty<string>();
    }

    public async Task SaveOrderAsync(string id, IReadOnlyList<string> orderedIds)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        string json = JsonSerializer.Serialize(orderedIds);
        string now = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture);

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO task_orders (id, ordered_ids_json, updated_at)
            VALUES (@id, @ordered_ids_json, @updated_at)
            ON CONFLICT(id) DO UPDATE SET
                ordered_ids_json = excluded.ordered_ids_json,
                updated_at = excluded.updated_at;";
        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@ordered_ids_json", json);
        cmd.Parameters.AddWithValue("@updated_at", now);

        await cmd.ExecuteNonQueryAsync();

        if (_syncRepository != null)
        {
            var baseRev = await _syncRepository.GetServerRevisionAsync("task_order", id);
            var payload = JsonSerializer.Serialize(new { id, orderedIds = orderedIds.ToList(), updatedAt = now });
            await _syncRepository.EnqueueMutationAsync("task_order", id, "put", baseRev, payload, connection);
        }
    }
}
