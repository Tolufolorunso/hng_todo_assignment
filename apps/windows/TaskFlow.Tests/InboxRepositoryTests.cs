using System;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Repositories;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class InboxRepositoryTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly InboxRepository _inboxRepo;
    private readonly TaskRepository _taskRepo;
    private readonly NoteRepository _noteRepo;
    private readonly FollowUpRepository _followUpRepo;
    private readonly InboxTriageService _triageService;

    public InboxRepositoryTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _inboxRepo = new InboxRepository(_factory);
        _taskRepo = new TaskRepository(_factory);
        _noteRepo = new NoteRepository(_factory);
        _followUpRepo = new FollowUpRepository(_factory);
        _triageService = new InboxTriageService(_inboxRepo, _taskRepo, _noteRepo, _followUpRepo);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public async Task CreateAsync_AutoDetectsUrl_AndSetsPendingState()
    {
        var text = "Review https://github.com/microsoft/terminal release notes for Windows";
        var capture = await _inboxRepo.CreateAsync(text);

        Assert.NotNull(capture.Id);
        Assert.Equal("pending", capture.State);
        Assert.Equal("https://github.com/microsoft/terminal", capture.SharedUrl);

        var retrieved = await _inboxRepo.GetByIdAsync(capture.Id);
        Assert.NotNull(retrieved);
        Assert.Equal(capture.Id, retrieved.Id);
    }

    [Fact]
    public async Task TriageToTask_CreatesTask_AndMarksCaptureProcessed()
    {
        var capture = await _inboxRepo.CreateAsync("Ship WPF Feature Parity by Friday\nAll details in plan");
        var result = await _triageService.TriageToTaskAsync(capture.Id, priority: "high");

        Assert.Equal("processed", result.Capture.State);
        Assert.Equal("task", result.Capture.ResultEntityType);
        Assert.Equal(result.Task.Id, result.Capture.ResultEntityId);

        var task = await _taskRepo.GetByIdAsync(result.Task.Id);
        Assert.NotNull(task);
        Assert.Equal("Ship WPF Feature Parity by Friday", task.Title);
        Assert.Equal("high", task.Priority);
        Assert.Contains("All details in plan", task.Description);
        Assert.Equal(capture.Text, task.SourceExcerpt);
    }

    [Fact]
    public async Task TriageToNote_CreatesNote_AndMarksCaptureProcessed()
    {
        var capture = await _inboxRepo.CreateAsync("Ideas for future roadmap\n1. Cloud sync\n2. MSIX packaging");
        var result = await _triageService.TriageToNoteAsync(capture.Id);

        Assert.Equal("processed", result.Capture.State);
        Assert.Equal("note", result.Capture.ResultEntityType);

        var note = await _noteRepo.GetByIdAsync(result.Note.Id);
        Assert.NotNull(note);
        Assert.Equal("Ideas for future roadmap", note.Title);
        Assert.Contains("MSIX packaging", note.Body);
    }

    [Fact]
    public async Task TriageToFollowUp_CreatesFollowUp_AndMarksCaptureProcessed()
    {
        var capture = await _inboxRepo.CreateAsync("Send updated slides to Sarah Jenkins\nHer email is sarah@acme.com");
        var result = await _triageService.TriageToFollowUpAsync(
            capture.Id,
            personName: "Sarah Jenkins",
            commitment: "Send updated slides",
            dueAt: "2026-11-03T17:00:00Z",
            email: "sarah@acme.com",
            preferredAction: "email");

        Assert.Equal("processed", result.Capture.State);
        Assert.Equal("followup", result.Capture.ResultEntityType);

        var followUp = await _followUpRepo.GetByIdAsync(result.FollowUp.Id);
        Assert.NotNull(followUp);
        Assert.Equal("Sarah Jenkins", followUp.PersonName);
        Assert.Equal("Send updated slides", followUp.Commitment);
        Assert.Equal("email", followUp.PreferredAction);
        Assert.Equal("sarah@acme.com", followUp.EmailAddress);
        Assert.Equal(capture.Text, followUp.SourceExcerpt);
    }

    [Fact]
    public async Task MarkDiscarded_UpdatesStateToDiscarded()
    {
        var capture = await _inboxRepo.CreateAsync("Spam notification or irrelevant link");
        var discarded = await _inboxRepo.MarkDiscardedAsync(capture.Id);

        Assert.Equal("discarded", discarded.State);
        Assert.NotNull(discarded.ProcessedAt);

        var retrieved = await _inboxRepo.GetByIdAsync(capture.Id);
        Assert.NotNull(retrieved);
        Assert.Equal("discarded", retrieved.State);
    }
}
