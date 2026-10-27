using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using TaskFlow.Data;
using TaskFlow.Models;
using TaskFlow.Repositories;
using Xunit;

namespace TaskFlow.Tests;

public class FollowUpRepositoryTests : IDisposable
{
    private readonly DatabaseConnectionFactory _factory;
    private readonly SqliteConnection _keepAliveConnection;
    private readonly FollowUpRepository _repository;

    public FollowUpRepositoryTests()
    {
        _factory = DatabaseConnectionFactory.CreateInMemory();
        _keepAliveConnection = _factory.CreateConnection();
        _keepAliveConnection.Open();

        var runner = new MigrationRunner(_factory);
        runner.RunMigrations(_keepAliveConnection);

        _repository = new FollowUpRepository(_factory);
    }

    public void Dispose()
    {
        _keepAliveConnection.Dispose();
    }

    [Fact]
    public async Task CreateAsync_CreatesFollowUp_AndInitialOccurrence()
    {
        var item = new FollowUpItem
        {
            PersonName = "Alice Morgan",
            Commitment = "Send updated project proposal",
            Details = "Include architecture diagrams",
            DueAt = "2026-11-05T14:00:00Z",
            EmailAddress = "alice@example.com",
            PreferredAction = "email"
        };

        var created = await _repository.CreateAsync(item);
        Assert.NotNull(created.Id);
        Assert.Equal("Alice Morgan", created.PersonName);
        Assert.Equal("open", created.Status);

        var retrieved = await _repository.GetByIdAsync(created.Id);
        Assert.NotNull(retrieved);
        Assert.Equal(created.Id, retrieved.Id);
        Assert.Equal("alice@example.com", retrieved.EmailAddress);

        var occurrences = await _repository.ListOccurrencesAsync(created.Id);
        Assert.Single(occurrences);
        Assert.Equal("open", occurrences[0].Outcome);
        Assert.Equal("2026-11-05T14:00:00Z", occurrences[0].ScheduledDueTime);
    }

    [Fact]
    public async Task CompleteOccurrenceAsync_NonRecurring_MarksCompleted()
    {
        var item = new FollowUpItem
        {
            PersonName = "Bob Smith",
            Commitment = "Call about design review",
            DueAt = "2026-11-02T10:00:00Z"
        };
        var created = await _repository.CreateAsync(item);

        var completed = await _repository.CompleteOccurrenceAsync(created.Id, "Call went well, approved");
        Assert.Equal("completed", completed.Status);

        var occurrences = await _repository.ListOccurrencesAsync(created.Id);
        Assert.Single(occurrences);
        Assert.Equal("completed", occurrences[0].Outcome);
        Assert.NotNull(occurrences[0].ResolutionTime);
    }

    [Fact]
    public async Task CompleteOccurrenceAsync_Recurring_AdvancesToNextOccurrence()
    {
        var item = new FollowUpItem
        {
            PersonName = "Carol Danvers",
            Commitment = "Weekly standup review",
            DueAt = "2026-11-01T09:00:00Z",
            Recurrence = new RecurrenceRule
            {
                Frequency = "daily",
                Mode = "calendarAnchored",
                Interval = 1,
                LocalTime = "09:00"
            }
        };
        var created = await _repository.CreateAsync(item);

        var updated = await _repository.CompleteOccurrenceAsync(created.Id);
        Assert.Equal("open", updated.Status);
        Assert.Contains("2026-11-02", updated.DueAt);

        var occurrences = await _repository.ListOccurrencesAsync(created.Id);
        Assert.Equal(2, occurrences.Count);
        Assert.Equal("completed", occurrences[0].Outcome);
        Assert.Equal("open", occurrences[1].Outcome);
    }

    [Fact]
    public async Task SnoozeAsync_PostponesDueAtAndPendingOccurrence()
    {
        var item = new FollowUpItem
        {
            PersonName = "David Banner",
            Commitment = "Share lab notes",
            DueAt = "2026-11-01T12:00:00Z"
        };
        var created = await _repository.CreateAsync(item);

        var snoozed = await _repository.SnoozeAsync(created.Id, 24);
        var parsedOriginal = DateTimeOffset.Parse("2026-11-01T12:00:00Z");
        var parsedSnoozed = DateTimeOffset.Parse(snoozed.DueAt);

        Assert.True(parsedSnoozed > parsedOriginal);

        var occurrences = await _repository.ListOccurrencesAsync(created.Id);
        Assert.Single(occurrences);
        Assert.Equal(snoozed.DueAt, occurrences[0].ScheduledDueTime);
    }

    [Fact]
    public async Task RescheduleAsync_SetsExplicitNewDueTime()
    {
        var item = new FollowUpItem
        {
            PersonName = "Elena Fisher",
            Commitment = "Coordinate field expedition",
            DueAt = "2026-11-01T12:00:00Z"
        };
        var created = await _repository.CreateAsync(item);

        var newDue = "2026-11-15T16:30:00Z";
        var rescheduled = await _repository.RescheduleAsync(created.Id, newDue);
        Assert.Contains("2026-11-15T16:30:00", rescheduled.DueAt);

        var occurrences = await _repository.ListOccurrencesAsync(created.Id);
        Assert.Single(occurrences);
        Assert.Equal(rescheduled.DueAt, occurrences[0].ScheduledDueTime);
    }

    [Fact]
    public async Task ListDueAsync_ReturnsItemsDueBeforeCutoff()
    {
        var item1 = new FollowUpItem
        {
            PersonName = "Past Person",
            Commitment = "Overdue task",
            DueAt = "2026-10-01T10:00:00Z"
        };
        var item2 = new FollowUpItem
        {
            PersonName = "Future Person",
            Commitment = "Far away task",
            DueAt = "2026-12-01T10:00:00Z"
        };
        await _repository.CreateAsync(item1);
        await _repository.CreateAsync(item2);

        var cutoff = new DateTimeOffset(2026, 10, 15, 0, 0, 0, TimeSpan.Zero);
        var dueList = await _repository.ListDueAsync(cutoff);

        Assert.Single(dueList);
        Assert.Equal("Past Person", dueList[0].PersonName);
    }

    [Fact]
    public async Task DeleteAsync_RemovesItemAndOccurrences()
    {
        var item = new FollowUpItem
        {
            PersonName = "Temporary Contact",
            Commitment = "Ephemeral commitment",
            DueAt = "2026-11-01T10:00:00Z"
        };
        var created = await _repository.CreateAsync(item);

        var deleted = await _repository.DeleteAsync(created.Id);
        Assert.True(deleted);

        var retrieved = await _repository.GetByIdAsync(created.Id);
        Assert.Null(retrieved);

        var occurrences = await _repository.ListOccurrencesAsync(created.Id);
        Assert.Empty(occurrences);
    }
}
