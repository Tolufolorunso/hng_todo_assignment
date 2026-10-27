using System;
using System.Text.Json;
using System.Threading.Tasks;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;

namespace TaskFlow.Services;

public class AdoptionService : IAdoptionService
{
    private readonly DatabaseConnectionFactory _connectionFactory;
    private readonly ISyncRepository _syncRepo;
    private readonly ITaskRepository _taskRepo;
    private readonly INoteRepository _noteRepo;
    private readonly IFollowUpRepository _followUpRepo;
    private readonly IDailyPlanRepository _planRepo;
    private readonly IInboxRepository _inboxRepo;
    private readonly ITaskOrderRepository _orderRepo;

    public AdoptionService(
        DatabaseConnectionFactory connectionFactory,
        ISyncRepository syncRepo,
        ITaskRepository taskRepo,
        INoteRepository noteRepo,
        IFollowUpRepository followUpRepo,
        IDailyPlanRepository planRepo,
        IInboxRepository inboxRepo,
        ITaskOrderRepository orderRepo)
    {
        _connectionFactory = connectionFactory;
        _syncRepo = syncRepo;
        _taskRepo = taskRepo;
        _noteRepo = noteRepo;
        _followUpRepo = followUpRepo;
        _planRepo = planRepo;
        _inboxRepo = inboxRepo;
        _orderRepo = orderRepo;
    }

    public async Task<int> GetLocalEntityCountAsync()
    {
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        int total = 0;
        string[] tables = { "tasks", "notes", "followups", "followup_occurrences", "daily_plans", "inbox_captures", "task_orders" };

        foreach (var table in tables)
        {
            using var cmd = connection.CreateCommand();
            cmd.CommandText = $"SELECT COUNT(*) FROM {table};";
            var result = await cmd.ExecuteScalarAsync();
            if (result != null && long.TryParse(result.ToString(), out long count))
            {
                total += (int)count;
            }
        }

        return total;
    }

    public async Task<bool> HasLocalDataToAdoptAsync()
    {
        int cursor = await _syncRepo.GetCursorAsync();
        if (cursor > 0)
        {
            // Already synced with server before
            return false;
        }

        int count = await GetLocalEntityCountAsync();
        return count > 0;
    }

    public async Task<int> AdoptLocalDataAsync()
    {
        int adoptedCount = 0;

        // 1. Tasks
        var tasks = await _taskRepo.ListAsync();
        foreach (var t in tasks)
        {
            var payload = JsonSerializer.Serialize(t);
            await _syncRepo.EnqueueMutationAsync("task", t.Id, "put", null, payload);
            adoptedCount++;
        }

        // 2. Notes
        var notes = await _noteRepo.ListAsync();
        foreach (var n in notes)
        {
            var payload = JsonSerializer.Serialize(n);
            await _syncRepo.EnqueueMutationAsync("note", n.Id, "put", null, payload);
            adoptedCount++;
        }

        // 3. Follow-ups
        var followUps = await _followUpRepo.ListAsync();
        foreach (var f in followUps)
        {
            var payload = JsonSerializer.Serialize(f);
            await _syncRepo.EnqueueMutationAsync("followup", f.Id, "put", null, payload);
            adoptedCount++;

            // Occurrences
            var occurrences = await _followUpRepo.ListOccurrencesAsync(f.Id);
            foreach (var occ in occurrences)
            {
                var occPayload = JsonSerializer.Serialize(occ);
                await _syncRepo.EnqueueMutationAsync("occurrence", occ.Id, "put", null, occPayload);
                adoptedCount++;
            }
        }

        // 4. Daily Plans
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using (var cmd = connection.CreateCommand())
        {
            cmd.CommandText = "SELECT id, local_date, time_zone, available_minutes, items_json, accepted_at, created_at, updated_at FROM daily_plans;";
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var plan = new DailyPlanItem
                {
                    Id = reader.GetString(0),
                    LocalDate = reader.GetString(1),
                    TimeZone = reader.GetString(2),
                    AvailableMinutes = reader.GetInt32(3),
                    ItemsJson = reader.IsDBNull(4) ? "[]" : reader.GetString(4),
                    AcceptedAt = reader.IsDBNull(5) ? null : reader.GetString(5),
                    CreatedAt = reader.GetString(6),
                    UpdatedAt = reader.GetString(7)
                };

                var payload = JsonSerializer.Serialize(plan);
                await _syncRepo.EnqueueMutationAsync("plan", plan.Id, "put", null, payload);
                adoptedCount++;
            }
        }

        // 5. Inbox Captures
        var inboxItems = await _inboxRepo.ListAsync();
        foreach (var item in inboxItems)
        {
            var payload = JsonSerializer.Serialize(item);
            await _syncRepo.EnqueueMutationAsync("inbox", item.Id, "put", null, payload);
            adoptedCount++;
        }

        // 6. Task Orders
        using (var orderCmd = connection.CreateCommand())
        {
            orderCmd.CommandText = "SELECT id, ordered_ids_json, updated_at FROM task_orders;";
            using var orderReader = await orderCmd.ExecuteReaderAsync();
            while (await orderReader.ReadAsync())
            {
                string id = orderReader.GetString(0);
                string orderedIdsJson = orderReader.IsDBNull(1) ? "[]" : orderReader.GetString(1);
                string updatedAt = orderReader.GetString(2);

                var orderObj = new
                {
                    id = id,
                    orderedIdsJson = orderedIdsJson,
                    updatedAt = updatedAt
                };

                await _syncRepo.EnqueueMutationAsync("task_order", id, "put", null, JsonSerializer.Serialize(orderObj));
                adoptedCount++;
            }
        }

        return adoptedCount;
    }
}
