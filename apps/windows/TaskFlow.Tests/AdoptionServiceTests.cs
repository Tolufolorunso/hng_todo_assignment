using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class AdoptionServiceTests : IDisposable
{
    private readonly SqliteConnection _keepAliveConnection;
    private readonly DatabaseConnectionFactory _connectionFactory;
    private readonly ISyncRepository _syncRepo;
    private readonly TaskRepository _taskRepo;
    private readonly NoteRepository _noteRepo;
    private readonly FollowUpRepository _followUpRepo;
    private readonly DailyPlanRepository _planRepo;
    private readonly InboxRepository _inboxRepo;
    private readonly TaskOrderRepository _orderRepo;

    public AdoptionServiceTests()
    {
        _connectionFactory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _connectionFactory.CreateConnection();
        _keepAliveConnection.Open();
        new MigrationRunner(_connectionFactory).RunMigrations(_keepAliveConnection);

        _syncRepo = new SyncRepository(_connectionFactory);
        _taskRepo = new TaskRepository(_connectionFactory, _syncRepo);
        _noteRepo = new NoteRepository(_connectionFactory, _syncRepo);
        _followUpRepo = new FollowUpRepository(_connectionFactory, _syncRepo);
        _planRepo = new DailyPlanRepository(_connectionFactory, _syncRepo);
        _inboxRepo = new InboxRepository(_connectionFactory, _syncRepo);
        _orderRepo = new TaskOrderRepository(_connectionFactory, _syncRepo);
    }

    public void Dispose()
    {
        _keepAliveConnection.Close();
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public async Task HasLocalDataToAdopt_ReturnsTrue_WhenLocalDataExistsAndCursorIsZero()
    {
        var service = new AdoptionService(
            _connectionFactory, _syncRepo, _taskRepo, _noteRepo,
            _followUpRepo, _planRepo, _inboxRepo, _orderRepo);

        // Initially empty
        bool empty = await service.HasLocalDataToAdoptAsync();
        Assert.False(empty);

        // Add a task
        await _taskRepo.CreateAsync(new TaskItem { Title = "Local Task" });

        bool hasData = await service.HasLocalDataToAdoptAsync();
        Assert.True(hasData);

        // Advance cursor
        await _syncRepo.SetCursorAsync(5);
        bool alreadySynced = await service.HasLocalDataToAdoptAsync();
        Assert.False(alreadySynced);
    }

    [Fact]
    public async Task AdoptLocalDataAsync_EnqueuesMutationsWithNullBaseRevision()
    {
        // Clear outbox from initial repo insertions
        await _syncRepo.ClearAllSyncStateAsync();

        // Create entities without syncRepo logging
        var pureTaskRepo = new TaskRepository(_connectionFactory);
        var pureNoteRepo = new NoteRepository(_connectionFactory);
        var task = await pureTaskRepo.CreateAsync(new TaskItem { Title = "Adopt Me Task", Priority = "high" });
        var note = await pureNoteRepo.CreateAsync(new NoteItem { Title = "Adopt Me Note", Body = "Note Body" });

        var service = new AdoptionService(
            _connectionFactory, _syncRepo, _taskRepo, _noteRepo,
            _followUpRepo, _planRepo, _inboxRepo, _orderRepo);

        int count = await service.AdoptLocalDataAsync();
        Assert.Equal(2, count);

        var outbox = await _syncRepo.PeekOutboxBatchAsync(10);
        Assert.Equal(2, outbox.Count);
        Assert.All(outbox, m =>
        {
            Assert.Null(m.BaseRevision);
            Assert.Equal("put", m.Action);
        });
    }

    [Fact]
    public async Task ConflictService_ResolveKeepLocal_ReEnqueuesWithServerRevision()
    {
        var conflictService = new ConflictService(_connectionFactory, _syncRepo);

        // Create conflict
        string localPayload = JsonSerializer.Serialize(new { title = "Local My Task" });
        string serverPayload = JsonSerializer.Serialize(new { title = "Server My Task" });
        await _syncRepo.RecordConflictAsync("task", "task-abc", localPayload, serverPayload, 14);

        var conflicts = await conflictService.GetConflictsAsync();
        Assert.Single(conflicts);
        string conflictId = conflicts[0].Id;

        // Resolve Keep Local
        await conflictService.ResolveKeepLocalAsync(conflictId);

        // Conflict should be resolved
        var remainingConflicts = await conflictService.GetConflictsAsync();
        Assert.Empty(remainingConflicts);

        // Outbox should contain mutation with baseRevision = 14
        var outbox = await _syncRepo.PeekOutboxBatchAsync(10);
        Assert.Single(outbox);
        Assert.Equal("task", outbox[0].EntityType);
        Assert.Equal("task-abc", outbox[0].EntityId);
        Assert.Equal(14, outbox[0].BaseRevision);
    }

    [Fact]
    public async Task ConflictService_ResolveKeepServer_OverwritesLocalEntity()
    {
        var conflictService = new ConflictService(_connectionFactory, _syncRepo);

        // Seed initial local task
        await _taskRepo.CreateAsync(new TaskItem
        {
            Id = "task-xyz",
            Title = "Local Value Title",
            Priority = "low"
        });

        string serverPayload = JsonSerializer.Serialize(new
        {
            title = "Server Wins Title",
            priority = "high",
            completed = false,
            createdAt = "2026-10-27T08:00:00Z",
            updatedAt = "2026-10-27T08:30:00Z"
        });

        await _syncRepo.RecordConflictAsync("task", "task-xyz", "local", serverPayload, 22);
        var conflicts = await conflictService.GetConflictsAsync();
        string conflictId = conflicts[0].Id;

        // Resolve Keep Server
        await conflictService.ResolveKeepServerAsync(conflictId);

        // Conflict should be removed
        var remaining = await conflictService.GetConflictsAsync();
        Assert.Empty(remaining);

        // Task in DB should have server title and priority
        var updatedTask = await _taskRepo.GetByIdAsync("task-xyz");
        Assert.NotNull(updatedTask);
        Assert.Equal("Server Wins Title", updatedTask.Title);
        Assert.Equal("high", updatedTask.Priority);

        // Server revision should be 22
        int? rev = await _syncRepo.GetServerRevisionAsync("task", "task-xyz");
        Assert.Equal(22, rev);
    }
}
