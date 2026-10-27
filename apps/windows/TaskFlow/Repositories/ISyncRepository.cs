using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Models;

namespace TaskFlow.Repositories;

public interface ISyncRepository
{
    Task<OutboxMutationItem> EnqueueMutationAsync(
        string entityType,
        string entityId,
        string action,
        int? baseRevision,
        string? payload,
        SqliteConnection? connection = null,
        SqliteTransaction? transaction = null);

    Task<IReadOnlyList<OutboxMutationItem>> PeekOutboxBatchAsync(int limit = 50);
    Task DequeueMutationAsync(string mutationId);
    Task DequeueMutationsAsync(IEnumerable<string> mutationIds);
    Task<int> GetOutboxCountAsync();

    Task<int> GetCursorAsync(string workspaceId = "default");
    Task SetCursorAsync(int cursor, string workspaceId = "default");

    Task<int?> GetServerRevisionAsync(string entityType, string entityId);
    Task SetServerRevisionAsync(string entityType, string entityId, int revision);

    Task RecordTombstoneAsync(string entityType, string entityId, string workspaceId = "default");
    Task<IReadOnlyList<TombstoneItem>> GetTombstonesAsync(string workspaceId = "default");

    Task RecordConflictAsync(
        string entityType,
        string entityId,
        string? localValue,
        string? serverValue,
        int serverRevision,
        string workspaceId = "default");

    Task<IReadOnlyList<ConflictItem>> GetConflictsAsync(string workspaceId = "default");
    Task ResolveConflictAsync(string conflictId);
    Task ClearAllSyncStateAsync();
}
