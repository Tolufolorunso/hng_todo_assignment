using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;

namespace TaskFlow.Services;

public class SyncEngine : ISyncEngine
{
    private readonly DatabaseConnectionFactory _connectionFactory;
    private readonly ISyncRepository _syncRepo;
    private readonly IAuthService _authService;
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    private readonly SyncState _state = new();
    private bool _isRunning;
    private Timer? _periodicTimer;

    public SyncState State
    {
        get
        {
            lock (_state)
            {
                return new SyncState
                {
                    Status = _state.Status,
                    LastSyncedAt = _state.LastSyncedAt,
                    PendingMutationsCount = _state.PendingMutationsCount,
                    UnresolvedConflictsCount = _state.UnresolvedConflictsCount,
                    ErrorMessage = _state.ErrorMessage
                };
            }
        }
    }

    public event Action<SyncState>? StateChanged;

    public SyncEngine(
        DatabaseConnectionFactory connectionFactory,
        ISyncRepository syncRepo,
        IAuthService authService,
        HttpClient? httpClient = null,
        string baseUrl = "http://localhost:3000")
    {
        _connectionFactory = connectionFactory;
        _syncRepo = syncRepo;
        _authService = authService;
        _httpClient = httpClient ?? new HttpClient();
        _baseUrl = baseUrl.TrimEnd('/');
    }

    public void StartPeriodicSync(TimeSpan? interval = null)
    {
        var period = interval ?? TimeSpan.FromMinutes(2);
        _periodicTimer?.Dispose();
        _periodicTimer = new Timer(async _ =>
        {
            if (_authService.IsAuthenticated && !_isRunning)
            {
                await SyncOnceAsync();
            }
        }, null, period, period);
    }

    public void StopPeriodicSync()
    {
        _periodicTimer?.Dispose();
        _periodicTimer = null;
    }

    public async Task<SyncResultSummary> SyncOnceAsync()
    {
        if (_isRunning)
        {
            return new SyncResultSummary { Success = false, Error = "Sync already in progress." };
        }

        if (!_authService.IsAuthenticated || _authService.CurrentSession == null)
        {
            UpdateState(s =>
            {
                s.Status = "idle";
                s.ErrorMessage = null;
            });
            return new SyncResultSummary { Success = false, Error = "Unauthenticated." };
        }

        _isRunning = true;
        UpdateState(s =>
        {
            s.Status = "syncing";
            s.ErrorMessage = null;
        });

        int totalPushed = 0;
        int totalPulled = 0;
        int totalConflicts = 0;

        try
        {
            bool hasMore = true;
            int loopCount = 0;
            const int maxLoops = 20;

            while (hasMore && loopCount < maxLoops)
            {
                loopCount++;

                var outboxBatch = await _syncRepo.PeekOutboxBatchAsync(50);
                int currentCursor = await _syncRepo.GetCursorAsync("default");

                var mutationsList = new List<object>();
                foreach (var m in outboxBatch)
                {
                    object? payloadObj = null;
                    if (!string.IsNullOrWhiteSpace(m.Payload))
                    {
                        try
                        {
                            payloadObj = JsonSerializer.Deserialize<JsonElement>(m.Payload);
                        }
                        catch
                        {
                            payloadObj = null;
                        }
                    }

                    mutationsList.Add(new
                    {
                        mutationId = m.MutationId,
                        protocolVersion = m.ProtocolVersion,
                        entityType = m.EntityType,
                        entityId = m.EntityId,
                        action = m.Action,
                        baseRevision = m.BaseRevision,
                        payload = payloadObj
                    });
                }

                var requestBody = new
                {
                    protocolVersion = 1,
                    cursor = currentCursor,
                    limit = 50,
                    mutations = mutationsList
                };

                string requestJson = JsonSerializer.Serialize(requestBody);
                var (responseStatus, responseText) = await SendSyncRequestAsync(requestJson);

                if (responseStatus == HttpStatusCode.Unauthorized)
                {
                    var refreshed = await _authService.RefreshSessionAsync();
                    if (refreshed != null)
                    {
                        (responseStatus, responseText) = await SendSyncRequestAsync(requestJson);
                    }
                    else
                    {
                        UpdateState(s =>
                        {
                            s.Status = "error";
                            s.ErrorMessage = "Session expired. Please sign in again.";
                        });
                        return new SyncResultSummary { Success = false, Error = "Unauthorized" };
                    }
                }

                if ((int)responseStatus == 0 || responseStatus == HttpStatusCode.ServiceUnavailable || responseStatus == HttpStatusCode.GatewayTimeout)
                {
                    UpdateState(s =>
                    {
                        s.Status = "offline";
                        s.ErrorMessage = "Network unavailable or server unreachable.";
                    });
                    return new SyncResultSummary { Success = false, Error = "Offline" };
                }

                if (responseStatus != HttpStatusCode.OK)
                {
                    UpdateState(s =>
                    {
                        s.Status = "error";
                        s.ErrorMessage = $"Server returned error: {responseStatus}";
                    });
                    return new SyncResultSummary { Success = false, Error = responseText };
                }

                using var doc = JsonDocument.Parse(responseText);
                var data = doc.RootElement.GetProperty("data");

                // 1. Process receipts
                if (data.TryGetProperty("receipts", out var receiptsEl) && receiptsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var r in receiptsEl.EnumerateArray())
                    {
                        string mutationId = r.GetProperty("mutationId").GetString() ?? string.Empty;
                        string status = r.GetProperty("status").GetString() ?? string.Empty;
                        string entityType = r.GetProperty("entityType").GetString() ?? string.Empty;
                        string entityId = r.GetProperty("entityId").GetString() ?? string.Empty;

                        if (status == "applied")
                        {
                            totalPushed++;
                            await _syncRepo.DequeueMutationAsync(mutationId);
                            if (r.TryGetProperty("appliedRevision", out var revEl) && revEl.ValueKind == JsonValueKind.Number)
                            {
                                await _syncRepo.SetServerRevisionAsync(entityType, entityId, revEl.GetInt32());
                            }
                        }
                        else if (status == "duplicate")
                        {
                            await _syncRepo.DequeueMutationAsync(mutationId);
                        }
                        else if (status == "conflict")
                        {
                            totalConflicts++;
                            await _syncRepo.DequeueMutationAsync(mutationId);

                            int serverRevision = 0;
                            string? serverValue = null;
                            if (r.TryGetProperty("conflictDetails", out var cdEl) && cdEl.ValueKind == JsonValueKind.Object)
                            {
                                if (cdEl.TryGetProperty("serverRevision", out var srEl))
                                {
                                    serverRevision = srEl.GetInt32();
                                }
                                if (cdEl.TryGetProperty("currentServerEntity", out var cseEl))
                                {
                                    serverValue = cseEl.GetRawText();
                                }
                            }

                            string? localValue = null;
                            var outboxItem = outboxBatch.FirstOrDefault(o => o.MutationId == mutationId);
                            if (outboxItem != null)
                            {
                                localValue = outboxItem.Payload;
                            }

                            await _syncRepo.RecordConflictAsync(entityType, entityId, localValue, serverValue, serverRevision);
                        }
                        else if (status == "invalid")
                        {
                            await _syncRepo.DequeueMutationAsync(mutationId);
                        }
                    }
                }

                // 2. Process changes
                if (data.TryGetProperty("changes", out var changesEl))
                {
                    int pulledCount = await ApplyServerChangesAsync(changesEl);
                    totalPulled += pulledCount;
                }

                // 3. Update cursor
                if (data.TryGetProperty("nextCursor", out var nextCursorEl) && nextCursorEl.ValueKind == JsonValueKind.Number)
                {
                    int nextCursor = nextCursorEl.GetInt32();
                    await _syncRepo.SetCursorAsync(nextCursor);
                }

                bool serverHasMore = data.TryGetProperty("hasMore", out var hmEl) && hmEl.GetBoolean();
                int remainingOutbox = await _syncRepo.GetOutboxCountAsync();
                hasMore = serverHasMore || remainingOutbox > 0;
            }

            int finalConflicts = (await _syncRepo.GetConflictsAsync()).Count;
            int finalOutbox = await _syncRepo.GetOutboxCountAsync();

            UpdateState(s =>
            {
                s.Status = finalConflicts > 0 ? "conflict" : "idle";
                s.LastSyncedAt = DateTime.UtcNow.ToString("O");
                s.PendingMutationsCount = finalOutbox;
                s.UnresolvedConflictsCount = finalConflicts;
                s.ErrorMessage = null;
            });

            return new SyncResultSummary
            {
                Success = true,
                Pushed = totalPushed,
                Pulled = totalPulled,
                Conflicts = totalConflicts
            };
        }
        catch (HttpRequestException ex)
        {
            UpdateState(s =>
            {
                s.Status = "offline";
                s.ErrorMessage = ex.Message;
            });
            return new SyncResultSummary { Success = false, Error = ex.Message };
        }
        catch (Exception ex)
        {
            UpdateState(s =>
            {
                s.Status = "error";
                s.ErrorMessage = ex.Message;
            });
            return new SyncResultSummary { Success = false, Error = ex.Message };
        }
        finally
        {
            _isRunning = false;
        }
    }

    private async Task<(HttpStatusCode Status, string Body)> SendSyncRequestAsync(string payload)
    {
        try
        {
            string url = $"{_baseUrl}/api/v1/sync";
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

            if (_authService.CurrentSession != null)
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _authService.CurrentSession.AccessToken);
            }

            using var response = await _httpClient.SendAsync(request);
            string responseText = await response.Content.ReadAsStringAsync();
            return (response.StatusCode, responseText);
        }
        catch (HttpRequestException)
        {
            return (0, string.Empty);
        }
    }

    private async Task<int> ApplyServerChangesAsync(JsonElement changes)
    {
        int count = 0;
        using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();
        using var tx = connection.BeginTransaction();

        // Tasks
        if (changes.TryGetProperty("tasks", out var tasksEl) && tasksEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var t in tasksEl.EnumerateArray())
            {
                count++;
                string id = t.GetProperty("id").GetString() ?? string.Empty;
                string title = t.GetProperty("title").GetString() ?? string.Empty;
                string? desc = t.TryGetProperty("description", out var dEl) && dEl.ValueKind == JsonValueKind.String ? dEl.GetString() : null;
                bool completed = t.TryGetProperty("completed", out var cEl) && cEl.GetBoolean();
                string? completedAt = t.TryGetProperty("completedAt", out var caEl) && caEl.ValueKind == JsonValueKind.String ? caEl.GetString() : null;
                string priority = t.TryGetProperty("priority", out var pEl) ? pEl.GetString() ?? "medium" : "medium";
                string? dueDate = t.TryGetProperty("dueDate", out var ddEl) && ddEl.ValueKind == JsonValueKind.String ? ddEl.GetString() : null;
                string? category = t.TryGetProperty("category", out var catEl) && catEl.ValueKind == JsonValueKind.String ? catEl.GetString() : null;
                int? estimatedMinutes = t.TryGetProperty("estimatedMinutes", out var emEl) && emEl.ValueKind == JsonValueKind.Number ? emEl.GetInt32() : null;
                string? sourceNoteId = t.TryGetProperty("sourceNoteId", out var snEl) && snEl.ValueKind == JsonValueKind.String ? snEl.GetString() : null;
                string? sourceExcerpt = t.TryGetProperty("sourceExcerpt", out var seEl) && seEl.ValueKind == JsonValueKind.String ? seEl.GetString() : null;
                string createdAt = t.TryGetProperty("createdAt", out var crEl) ? crEl.GetString() ?? DateTime.UtcNow.ToString("O") : DateTime.UtcNow.ToString("O");
                string updatedAt = t.TryGetProperty("updatedAt", out var upEl) ? upEl.GetString() ?? DateTime.UtcNow.ToString("O") : DateTime.UtcNow.ToString("O");

                using var cmd = connection.CreateCommand();
                cmd.Transaction = tx;
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

                cmd.Parameters.AddWithValue("@id", id);
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

                if (t.TryGetProperty("revision", out var revEl) && revEl.ValueKind == JsonValueKind.Number)
                {
                    await _syncRepo.SetServerRevisionAsync("task", id, revEl.GetInt32());
                }
            }
        }

        // Notes
        if (changes.TryGetProperty("notes", out var notesEl) && notesEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var n in notesEl.EnumerateArray())
            {
                count++;
                string id = n.GetProperty("id").GetString() ?? string.Empty;
                string title = n.GetProperty("title").GetString() ?? string.Empty;
                string body = n.TryGetProperty("body", out var bEl) ? bEl.GetString() ?? string.Empty : string.Empty;
                string createdAt = n.TryGetProperty("createdAt", out var crEl) ? crEl.GetString() ?? DateTime.UtcNow.ToString("O") : DateTime.UtcNow.ToString("O");
                string updatedAt = n.TryGetProperty("updatedAt", out var upEl) ? upEl.GetString() ?? DateTime.UtcNow.ToString("O") : DateTime.UtcNow.ToString("O");

                using var cmd = connection.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = @"
                    INSERT INTO notes (id, title, body, created_at, updated_at)
                    VALUES (@id, @title, @body, @created_at, @updated_at)
                    ON CONFLICT(id) DO UPDATE SET
                        title = excluded.title,
                        body = excluded.body,
                        updated_at = excluded.updated_at;";

                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@title", title);
                cmd.Parameters.AddWithValue("@body", body);
                cmd.Parameters.AddWithValue("@created_at", createdAt);
                cmd.Parameters.AddWithValue("@updated_at", updatedAt);
                await cmd.ExecuteNonQueryAsync();

                if (n.TryGetProperty("revision", out var revEl) && revEl.ValueKind == JsonValueKind.Number)
                {
                    await _syncRepo.SetServerRevisionAsync("note", id, revEl.GetInt32());
                }
            }
        }

        // FollowUps
        if (changes.TryGetProperty("followups", out var fuEl) && fuEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var f in fuEl.EnumerateArray())
            {
                count++;
                string id = f.GetProperty("id").GetString() ?? string.Empty;
                string personName = f.GetProperty("personName").GetString() ?? string.Empty;
                string commitment = f.GetProperty("commitment").GetString() ?? string.Empty;
                string? details = f.TryGetProperty("details", out var dEl) && dEl.ValueKind == JsonValueKind.String ? dEl.GetString() : null;
                string dueAt = f.GetProperty("dueAt").GetString() ?? DateTime.UtcNow.ToString("O");
                string timeZone = f.TryGetProperty("timeZone", out var tzEl) ? tzEl.GetString() ?? "UTC" : "UTC";
                string? email = f.TryGetProperty("emailAddress", out var emEl) && emEl.ValueKind == JsonValueKind.String ? emEl.GetString() : null;
                string? phone = f.TryGetProperty("phoneNumber", out var phEl) && phEl.ValueKind == JsonValueKind.String ? phEl.GetString() : null;
                string? wa = f.TryGetProperty("whatsAppNumber", out var waEl) && waEl.ValueKind == JsonValueKind.String ? waEl.GetString() : null;
                string? prefAction = f.TryGetProperty("preferredAction", out var paEl) && paEl.ValueKind == JsonValueKind.String ? paEl.GetString() : null;
                string? recJson = f.TryGetProperty("recurrence", out var recEl) && recEl.ValueKind != JsonValueKind.Null ? recEl.GetRawText() : null;
                string status = f.TryGetProperty("status", out var stEl) ? stEl.GetString() ?? "open" : "open";
                string? sourceNoteId = f.TryGetProperty("sourceNoteId", out var snEl) && snEl.ValueKind == JsonValueKind.String ? snEl.GetString() : null;
                string? sourceExcerpt = f.TryGetProperty("sourceExcerpt", out var seEl) && seEl.ValueKind == JsonValueKind.String ? seEl.GetString() : null;
                string createdAt = f.TryGetProperty("createdAt", out var crEl) ? crEl.GetString() ?? DateTime.UtcNow.ToString("O") : DateTime.UtcNow.ToString("O");
                string updatedAt = f.TryGetProperty("updatedAt", out var upEl) ? upEl.GetString() ?? DateTime.UtcNow.ToString("O") : DateTime.UtcNow.ToString("O");

                using var cmd = connection.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = @"
                    INSERT INTO followups (
                        id, person_name, commitment, details, due_at, time_zone,
                        email_address, phone_number, whatsapp_number, preferred_action,
                        recurrence_json, status, source_note_id, source_excerpt, created_at, updated_at
                    ) VALUES (
                        @id, @person_name, @commitment, @details, @due_at, @time_zone,
                        @email_address, @phone_number, @whatsapp_number, @preferred_action,
                        @recurrence_json, @status, @source_note_id, @source_excerpt, @created_at, @updated_at
                    )
                    ON CONFLICT(id) DO UPDATE SET
                        person_name = excluded.person_name,
                        commitment = excluded.commitment,
                        details = excluded.details,
                        due_at = excluded.due_at,
                        time_zone = excluded.time_zone,
                        email_address = excluded.email_address,
                        phone_number = excluded.phone_number,
                        whatsapp_number = excluded.whatsapp_number,
                        preferred_action = excluded.preferred_action,
                        recurrence_json = excluded.recurrence_json,
                        status = excluded.status,
                        source_note_id = excluded.source_note_id,
                        source_excerpt = excluded.source_excerpt,
                        updated_at = excluded.updated_at;";

                cmd.Parameters.AddWithValue("@id", id);
                cmd.Parameters.AddWithValue("@person_name", personName);
                cmd.Parameters.AddWithValue("@commitment", commitment);
                cmd.Parameters.AddWithValue("@details", (object?)details ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@due_at", dueAt);
                cmd.Parameters.AddWithValue("@time_zone", timeZone);
                cmd.Parameters.AddWithValue("@email_address", (object?)email ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@phone_number", (object?)phone ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@whatsapp_number", (object?)wa ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@preferred_action", (object?)prefAction ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@recurrence_json", (object?)recJson ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@status", status);
                cmd.Parameters.AddWithValue("@source_note_id", (object?)sourceNoteId ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@source_excerpt", (object?)sourceExcerpt ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@created_at", createdAt);
                cmd.Parameters.AddWithValue("@updated_at", updatedAt);
                await cmd.ExecuteNonQueryAsync();

                if (f.TryGetProperty("revision", out var revEl) && revEl.ValueKind == JsonValueKind.Number)
                {
                    await _syncRepo.SetServerRevisionAsync("followup", id, revEl.GetInt32());
                }
            }
        }

        // Tombstones
        if (changes.TryGetProperty("tombstones", out var tsEl) && tsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var tomb in tsEl.EnumerateArray())
            {
                count++;
                string entityType = tomb.GetProperty("entityType").GetString() ?? string.Empty;
                string entityId = tomb.GetProperty("id").GetString() ?? string.Empty;

                using var cmd = connection.CreateCommand();
                cmd.Transaction = tx;

                if (entityType == "task")
                {
                    cmd.CommandText = "DELETE FROM tasks WHERE id = @id;";
                }
                else if (entityType == "note")
                {
                    cmd.CommandText = "DELETE FROM notes WHERE id = @id;";
                }
                else if (entityType == "followup")
                {
                    cmd.CommandText = "DELETE FROM followups WHERE id = @id;";
                }
                else if (entityType == "occurrence")
                {
                    cmd.CommandText = "DELETE FROM followup_occurrences WHERE id = @id;";
                }
                else if (entityType == "plan")
                {
                    cmd.CommandText = "DELETE FROM daily_plans WHERE id = @id;";
                }
                else if (entityType == "inbox")
                {
                    cmd.CommandText = "DELETE FROM inbox_captures WHERE id = @id;";
                }

                if (!string.IsNullOrEmpty(cmd.CommandText))
                {
                    cmd.Parameters.AddWithValue("@id", entityId);
                    await cmd.ExecuteNonQueryAsync();
                }

                if (tomb.TryGetProperty("revision", out var revEl) && revEl.ValueKind == JsonValueKind.Number)
                {
                    await _syncRepo.SetServerRevisionAsync(entityType, entityId, revEl.GetInt32());
                }
            }
        }

        await tx.CommitAsync();
        return count;
    }

    private void UpdateState(Action<SyncState> updateAction)
    {
        SyncState snapshot;
        lock (_state)
        {
            updateAction(_state);
            snapshot = new SyncState
            {
                Status = _state.Status,
                LastSyncedAt = _state.LastSyncedAt,
                PendingMutationsCount = _state.PendingMutationsCount,
                UnresolvedConflictsCount = _state.UnresolvedConflictsCount,
                ErrorMessage = _state.ErrorMessage
            };
        }

        StateChanged?.Invoke(snapshot);
    }
}
