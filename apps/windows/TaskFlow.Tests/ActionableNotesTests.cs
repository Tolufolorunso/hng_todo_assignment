using System;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class ActionableNotesTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly NoteRepository _noteRepo;
    private readonly TaskRepository _taskRepo;
    private readonly FollowUpRepository _followUpRepo;
    private readonly ActionableNotesService _actionableService;

    public ActionableNotesTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _noteRepo = new NoteRepository(_factory);
        _taskRepo = new TaskRepository(_factory);
        _followUpRepo = new FollowUpRepository(_factory);
        _actionableService = new ActionableNotesService(_taskRepo, _followUpRepo, _noteRepo);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public async Task CreateTaskFromNoteAsync_SetsSourceNoteId_AndExcerpt()
    {
        var note = await _noteRepo.CreateAsync(new NoteItem
        {
            Title = "Sprint Planning Notes",
            Body = "We need to finalize the SQLite schema and verify migrations."
        });

        var excerpt = "finalize the SQLite schema and verify migrations";
        var task = await _actionableService.CreateTaskFromNoteAsync(
            note.Id,
            excerpt,
            taskTitle: "Finalize SQLite Schema",
            priority: "high",
            category: "work",
            estimatedMinutes: 45);

        Assert.NotNull(task.Id);
        Assert.Equal("Finalize SQLite Schema", task.Title);
        Assert.Equal(note.Id, task.SourceNoteId);
        Assert.Equal(excerpt, task.SourceExcerpt);
        Assert.Equal("high", task.Priority);
        Assert.Equal(45, task.EstimatedMinutes);

        var retrievedTask = await _taskRepo.GetByIdAsync(task.Id);
        Assert.NotNull(retrievedTask);
        Assert.Equal(note.Id, retrievedTask.SourceNoteId);
        Assert.Equal(excerpt, retrievedTask.SourceExcerpt);
    }

    [Fact]
    public async Task CreateFollowUpFromNoteAsync_SetsSourceNoteId_AndExcerpt()
    {
        var note = await _noteRepo.CreateAsync(new NoteItem
        {
            Title = "Client Sync Meeting",
            Body = "Agreed to check in with Michael about data retention policies next Tuesday."
        });

        var excerpt = "check in with Michael about data retention policies";
        var followUp = await _actionableService.CreateFollowUpFromNoteAsync(
            note.Id,
            excerpt,
            personName: "Michael Scott",
            commitment: "Check in about data retention policies",
            dueAt: "2026-11-03T14:00:00Z",
            preferredAction: "email",
            email: "michael@dundermifflin.com");

        Assert.NotNull(followUp.Id);
        Assert.Equal("Michael Scott", followUp.PersonName);
        Assert.Equal(note.Id, followUp.SourceNoteId);
        Assert.Equal(excerpt, followUp.SourceExcerpt);
        Assert.Equal("email", followUp.PreferredAction);

        var retrievedFollowUp = await _followUpRepo.GetByIdAsync(followUp.Id);
        Assert.NotNull(retrievedFollowUp);
        Assert.Equal(note.Id, retrievedFollowUp.SourceNoteId);
        Assert.Equal(excerpt, retrievedFollowUp.SourceExcerpt);
    }

    [Fact]
    public async Task CreateTaskFromNoteAsync_ThrowsWhenNoteNotFound()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _actionableService.CreateTaskFromNoteAsync("non-existent-note", "Excerpt text"));
    }
}
