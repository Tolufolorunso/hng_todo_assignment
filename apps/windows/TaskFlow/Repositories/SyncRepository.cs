using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;

namespace TaskFlow.Repositories;

public class SyncRepository : ISyncRepository
{
    private readonly DatabaseConnectionFactory _connectionFactory;

    public SyncRepository(DatabaseConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<OutboxMutationItem> EnqueueMutationAsync(
        string entityType,
        string entityId,
        string action,
        int? baseRevision,
        string? payload,
        SqliteConnection? connection = null,
        SqliteTransaction? transaction = null)
    {
        var mutation = new OutboxMutationItem
        {
            Id = Guid.NewGuid().ToString(),
            MutationId = Guid.NewGuid().ToString(),
            ProtocolVersion = 1,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            BaseRevision = baseRevision,
            Payload = payload,
            CreatedAt = DateTime.UtcNow.ToString("O")
        };

        if (connection != null)
        {
            await InsertMutationInternalAsync(connection, transaction, mutation);
            return mutation;
        }

        using var conn = _connectionFactory.CreateConnection();
        await conn.OpenAsync();
        using var tx = conn.BeginTransaction();
        await InsertMutationInternalAsync(conn, tx, mutation);
        await tx.CommitAsync();

        return mutation;
    }

    private static async Task InsertMutationInternalAsync(
        SqliteConnection connection,
        SqliteTransaction? transaction,
        OutboxMutationItem mutation)
    {
        using var cmd = connection.CreateCommand();
        if (transaction != null)
        {
            cmd.Transaction = transaction;
        }

        cmd.CommandText = @"
            INSERT INTO outbox (
                id, mutation_id, protocol_version, entity_type, entity_id, action, base_revision, payload, created_at
            ) VALUES (
                @id, @mutation_id, @protocol_version, @entity_type, @entity_id, @action, @base_revision, @payload, @created_at
            );";

        cmd.Parameters.AddWithValue("@id", mutation.Id);
        cmd.Parameters.AddWithValue("@mutation_id", mutation.MutationId);
        cmd.Parameters.AddWithValue("@protocol_version", mutation.ProtocolVersion);
        cmd.Parameters.AddWithValue("@entity_type", mutation.EntityType);
        cmd.Parameters.AddWithValue("@entity_id", mutation.EntityId);
        cmd.Parameters.AddWithValue("@action", mutation.Action);
        cmd.Parameters.AddWithValue("@base_revision", (object?)mutation.BaseRevision ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@payload", (object?)mutation.Payload ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@created_at", mutation.CreatedAt);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<IReadOnlyList<OutboxMutationItem>> PeekOutboxBatchAsync(int limit = 50)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, mutation_id, protocol_version, entity_type, entity_id, action, base_revision, payload, created_at
            FROM outbox
            ORDER BY created_at ASC
            LIMIT @limit;";
        cmd.Parameters.AddWithValue("@limit", limit);

        var list = new List<OutboxMutationItem>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new OutboxMutationItem
            {
                Id = reader.GetString(0),
                MutationId = reader.GetString(1),
                ProtocolVersion = reader.GetInt32(2),
                EntityType = reader.GetString(3),
                EntityId = reader.GetString(4),
                Action = reader.GetString(5),
                BaseRevision = reader.IsDBNull(6) ? null : reader.GetInt32(6),
                Payload = reader.IsDBNull(7) ? null : reader.GetString(7),
                CreatedAt = reader.GetString(8)
            });
        }

        return list;
    }

    public async Task DequeueMutationAsync(string mutationId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM outbox WHERE mutation_id = @mutation_id;";
        cmd.Parameters.AddWithValue("@mutation_id", mutationId);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task DequeueMutationsAsync(IEnumerable<string> mutationIds)
    {
        var idList = mutationIds.ToList();
        if (idList.Count == 0) return;

        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var tx = connection.BeginTransaction();

        foreach (var id in idList)
        {
            using var cmd = connection.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = "DELETE FROM outbox WHERE mutation_id = @mutation_id;";
            cmd.Parameters.AddWithValue("@mutation_id", id);
            await cmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
    }

    public async Task<int> GetOutboxCountAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM outbox;";
        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    public async Task<int> GetCursorAsync(string workspaceId = "default")
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT cursor FROM sync_cursors WHERE workspace_id = @workspace_id LIMIT 1;";
        cmd.Parameters.AddWithValue("@workspace_id", workspaceId);

        var result = await cmd.ExecuteScalarAsync();
        return result != null && result != DBNull.Value ? Convert.ToInt32(result) : 0;
    }

    public async Task SetCursorAsync(int cursor, string workspaceId = "default")
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO sync_cursors (workspace_id, cursor, updated_at)
            VALUES (@workspace_id, @cursor, @updated_at)
            ON CONFLICT(workspace_id) DO UPDATE SET
                cursor = excluded.cursor,
                updated_at = excluded.updated_at;";
        cmd.Parameters.AddWithValue("@workspace_id", workspaceId);
        cmd.Parameters.AddWithValue("@cursor", cursor);
        cmd.Parameters.AddWithValue("@updated_at", DateTime.UtcNow.ToString("O"));

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<int?> GetServerRevisionAsync(string entityType, string entityId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT server_revision FROM server_revisions WHERE entity_type = @type AND entity_id = @id LIMIT 1;";
        cmd.Parameters.AddWithValue("@type", entityType);
        cmd.Parameters.AddWithValue("@id", entityId);

        var result = await cmd.ExecuteScalarAsync();
        return result != null && result != DBNull.Value ? Convert.ToInt32(result) : null;
    }

    public async Task SetServerRevisionAsync(string entityType, string entityId, int revision)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO server_revisions (entity_type, entity_id, server_revision)
            VALUES (@type, @id, @revision)
            ON CONFLICT(entity_type, entity_id) DO UPDATE SET
                server_revision = excluded.server_revision;";
        cmd.Parameters.AddWithValue("@type", entityType);
        cmd.Parameters.AddWithValue("@id", entityId);
        cmd.Parameters.AddWithValue("@revision", revision);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task RecordTombstoneAsync(string entityType, string entityId, string workspaceId = "default")
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO tombstones (id, workspace_id, entity_type, entity_id, deleted_at)
            VALUES (@id, @workspace_id, @type, @id_val, @deleted_at);";
        cmd.Parameters.AddWithValue("@id", Guid.NewGuid().ToString());
        cmd.Parameters.AddWithValue("@workspace_id", workspaceId);
        cmd.Parameters.AddWithValue("@type", entityType);
        cmd.Parameters.AddWithValue("@id_val", entityId);
        cmd.Parameters.AddWithValue("@deleted_at", DateTime.UtcNow.ToString("O"));

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<IReadOnlyList<TombstoneItem>> GetTombstonesAsync(string workspaceId = "default")
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT id, workspace_id, entity_type, entity_id, deleted_at FROM tombstones WHERE workspace_id = @workspace_id;";
        cmd.Parameters.AddWithValue("@workspace_id", workspaceId);

        var list = new List<TombstoneItem>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new TombstoneItem
            {
                Id = reader.GetString(0),
                WorkspaceId = reader.GetString(1),
                EntityType = reader.GetString(2),
                EntityId = reader.GetString(3),
                DeletedAt = reader.GetString(4)
            });
        }

        return list;
    }

    public async Task RecordConflictAsync(
        string entityType,
        string entityId,
        string? localValue,
        string? serverValue,
        int serverRevision,
        string workspaceId = "default")
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO conflicts (
                id, workspace_id, entity_type, entity_id, local_value, server_value, server_revision, created_at
            ) VALUES (
                @id, @workspace_id, @type, @id_val, @local, @server, @rev, @created_at
            );";
        cmd.Parameters.AddWithValue("@id", Guid.NewGuid().ToString());
        cmd.Parameters.AddWithValue("@workspace_id", workspaceId);
        cmd.Parameters.AddWithValue("@type", entityType);
        cmd.Parameters.AddWithValue("@id_val", entityId);
        cmd.Parameters.AddWithValue("@local", (object?)localValue ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@server", (object?)serverValue ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@rev", serverRevision);
        cmd.Parameters.AddWithValue("@created_at", DateTime.UtcNow.ToString("O"));

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<IReadOnlyList<ConflictItem>> GetConflictsAsync(string workspaceId = "default")
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, workspace_id, entity_type, entity_id, local_value, server_value, server_revision, created_at
            FROM conflicts
            WHERE workspace_id = @workspace_id
            ORDER BY created_at DESC;";
        cmd.Parameters.AddWithValue("@workspace_id", workspaceId);

        var list = new List<ConflictItem>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new ConflictItem
            {
                Id = reader.GetString(0),
                WorkspaceId = reader.GetString(1),
                EntityType = reader.GetString(2),
                EntityId = reader.GetString(3),
                LocalValue = reader.IsDBNull(4) ? null : reader.GetString(4),
                ServerValue = reader.IsDBNull(5) ? null : reader.GetString(5),
                ServerRevision = reader.GetInt32(6),
                CreatedAt = reader.GetString(7)
            });
        }

        return list;
    }

    public async Task ResolveConflictAsync(string conflictId)
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = "DELETE FROM conflicts WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", conflictId);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task ClearAllSyncStateAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            DELETE FROM outbox;
            DELETE FROM sync_cursors;
            DELETE FROM conflicts;
            DELETE FROM tombstones;
            DELETE FROM server_revisions;";

        await cmd.ExecuteNonQueryAsync();
    }
}
