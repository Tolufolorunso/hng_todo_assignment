using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using Xunit;

namespace TaskFlow.Tests;

public class SyncRepositoryTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly SyncRepository _syncRepo;

    public SyncRepositoryTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _syncRepo = new SyncRepository(_factory);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public async Task EnqueueAndPeekOutbox_ReturnsQueuedMutations()
    {
        var mutation = await _syncRepo.EnqueueMutationAsync("task", "task_1", "put", null, "{\"title\":\"Test\"}");
        Assert.NotNull(mutation.MutationId);
        Assert.Equal("task", mutation.EntityType);

        var batch = await _syncRepo.PeekOutboxBatchAsync(10);
        Assert.Single(batch);
        Assert.Equal("task_1", batch[0].EntityId);
        Assert.Equal("put", batch[0].Action);

        int count = await _syncRepo.GetOutboxCountAsync();
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task DequeueMutation_RemovesFromOutbox()
    {
        var m1 = await _syncRepo.EnqueueMutationAsync("task", "task_1", "put", null, "{}");
        var m2 = await _syncRepo.EnqueueMutationAsync("note", "note_1", "put", null, "{}");

        Assert.Equal(2, await _syncRepo.GetOutboxCountAsync());

        await _syncRepo.DequeueMutationAsync(m1.MutationId);
        var remaining = await _syncRepo.PeekOutboxBatchAsync(10);

        Assert.Single(remaining);
        Assert.Equal("note_1", remaining[0].EntityId);

        await _syncRepo.DequeueMutationsAsync(new[] { m2.MutationId });
        Assert.Equal(0, await _syncRepo.GetOutboxCountAsync());
    }

    [Fact]
    public async Task Cursors_UpsertAndRetrieve()
    {
        int initial = await _syncRepo.GetCursorAsync("default");
        Assert.Equal(0, initial);

        await _syncRepo.SetCursorAsync(42, "default");
        int updated = await _syncRepo.GetCursorAsync("default");
        Assert.Equal(42, updated);

        await _syncRepo.SetCursorAsync(100, "default");
        Assert.Equal(100, await _syncRepo.GetCursorAsync("default"));
    }

    [Fact]
    public async Task ServerRevisions_UpsertAndRetrieve()
    {
        var initial = await _syncRepo.GetServerRevisionAsync("task", "task_1");
        Assert.Null(initial);

        await _syncRepo.SetServerRevisionAsync("task", "task_1", 5);
        var updated = await _syncRepo.GetServerRevisionAsync("task", "task_1");
        Assert.Equal(5, updated);

        await _syncRepo.SetServerRevisionAsync("task", "task_1", 6);
        Assert.Equal(6, await _syncRepo.GetServerRevisionAsync("task", "task_1"));
    }

    [Fact]
    public async Task Conflicts_RecordAndResolve()
    {
        await _syncRepo.RecordConflictAsync("task", "task_1", "{\"title\":\"Local\"}", "{\"title\":\"Server\"}", 3);
        var conflicts = await _syncRepo.GetConflictsAsync();

        Assert.Single(conflicts);
        Assert.Equal("task_1", conflicts[0].EntityId);
        Assert.Equal(3, conflicts[0].ServerRevision);

        await _syncRepo.ResolveConflictAsync(conflicts[0].Id);
        var remaining = await _syncRepo.GetConflictsAsync();
        Assert.Empty(remaining);
    }

    [Fact]
    public async Task Tombstones_RecordAndRetrieve()
    {
        await _syncRepo.RecordTombstoneAsync("task", "task_deleted");
        var tombstones = await _syncRepo.GetTombstonesAsync();

        Assert.Single(tombstones);
        Assert.Equal("task_deleted", tombstones[0].EntityId);
    }

    [Fact]
    public async Task TaskRepository_WithSyncRepo_EnqueuesMutationOnCreateAndToggle()
    {
        var taskRepo = new TaskRepository(_factory, _syncRepo);

        var task = new TaskItem
        {
            Title = "Sync test task",
            Priority = "high"
        };

        var created = await taskRepo.CreateAsync(task);
        Assert.NotNull(created.Id);

        var batch = await _syncRepo.PeekOutboxBatchAsync(10);
        Assert.Single(batch);
        Assert.Equal("task", batch[0].EntityType);
        Assert.Equal(created.Id, batch[0].EntityId);
        Assert.Equal("put", batch[0].Action);

        await _syncRepo.DequeueMutationAsync(batch[0].MutationId);

        await taskRepo.ToggleCompleteAsync(created.Id);
        var updatedBatch = await _syncRepo.PeekOutboxBatchAsync(10);
        Assert.Single(updatedBatch);
        Assert.Equal("task", updatedBatch[0].EntityType);
    }
}
