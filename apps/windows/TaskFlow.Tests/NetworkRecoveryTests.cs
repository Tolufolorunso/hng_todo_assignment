using System;
using System.Threading.Tasks;
using TaskFlow.Models;
using TaskFlow.Services;
using Xunit;

namespace TaskFlow.Tests;

public class NetworkRecoveryTests
{
    private class MockSyncEngine : ISyncEngine
    {
        public SyncState State { get; set; } = new();
        public event Action<SyncState>? StateChanged { add { } remove { } }

        public int SyncCallCount { get; private set; }

        public Task<SyncResultSummary> SyncOnceAsync()
        {
            SyncCallCount++;
            return Task.FromResult(new SyncResultSummary { Success = true });
        }

        public void StartPeriodicSync(TimeSpan? interval = null) { }
        public void StopPeriodicSync() { }
    }

    [Fact]
    public async Task HandleNetworkAvailabilityChanged_WhenRestored_TriggersSyncAndRecovery()
    {
        var mockSync = new MockSyncEngine();
        bool networkAvailable = false;
        var recoveryService = new NetworkRecoveryService(mockSync, availabilityProvider: () => networkAvailable);

        Assert.False(recoveryService.IsNetworkAvailable);

        bool eventFired = false;
        bool recoveryFired = false;
        recoveryService.NetworkAvailabilityChanged += isAvail =>
        {
            if (isAvail) eventFired = true;
        };
        recoveryService.RecoveryTriggered += () => recoveryFired = true;

        // Transition from offline to online
        networkAvailable = true;
        await recoveryService.HandleNetworkAvailabilityChangedAsync(true);

        Assert.True(recoveryService.IsNetworkAvailable);
        Assert.True(eventFired);
        Assert.True(recoveryFired);
        Assert.Equal(1, mockSync.SyncCallCount);
    }

    [Fact]
    public async Task HandleNetworkAvailabilityChanged_WhenOffline_DoesNotTriggerSync()
    {
        var mockSync = new MockSyncEngine();
        bool networkAvailable = true;
        var recoveryService = new NetworkRecoveryService(mockSync, availabilityProvider: () => networkAvailable);

        Assert.True(recoveryService.IsNetworkAvailable);

        networkAvailable = false;
        await recoveryService.HandleNetworkAvailabilityChangedAsync(false);

        Assert.False(recoveryService.IsNetworkAvailable);
        Assert.Equal(0, mockSync.SyncCallCount);
    }

    [Fact]
    public async Task HandleWindowActivated_WhenOnline_TriggersCatchUpSync()
    {
        var mockSync = new MockSyncEngine();
        var recoveryService = new NetworkRecoveryService(mockSync, availabilityProvider: () => true);

        bool recoveryFired = false;
        recoveryService.RecoveryTriggered += () => recoveryFired = true;

        await recoveryService.HandleWindowActivatedAsync();

        Assert.True(recoveryFired);
        Assert.Equal(1, mockSync.SyncCallCount);
    }

    [Fact]
    public async Task HandleWindowActivated_WhenOffline_SkipsSync()
    {
        var mockSync = new MockSyncEngine();
        var recoveryService = new NetworkRecoveryService(mockSync, availabilityProvider: () => false);

        await recoveryService.HandleWindowActivatedAsync();

        Assert.Equal(0, mockSync.SyncCallCount);
    }

    private class MockFollowUpRepository : TaskFlow.Repositories.IFollowUpRepository
    {
        public int ListDueCallCount { get; private set; }
        public bool ThrowOnListDue { get; set; }

        public Task<System.Collections.Generic.IReadOnlyList<FollowUpItem>> ListDueAsync(DateTimeOffset asOf)
        {
            ListDueCallCount++;
            if (ThrowOnListDue)
            {
                throw new InvalidOperationException("Simulated notification subsystem failure");
            }

            return Task.FromResult<System.Collections.Generic.IReadOnlyList<FollowUpItem>>(
                new System.Collections.Generic.List<FollowUpItem>
                {
                    new()
                    {
                        Id = "fu_catchup",
                        PersonName = "Sarah Connor",
                        Commitment = "Review defensive architecture",
                        DueAt = "2026-05-01T10:00:00.000Z",
                        Status = "open"
                    }
                });
        }

        public Task<FollowUpItem> CompleteOccurrenceAsync(string followUpId, string? notes = null) => throw new NotImplementedException();
        public Task<FollowUpItem> CreateAsync(FollowUpItem item) => throw new NotImplementedException();
        public Task<bool> DeleteAsync(string id) => throw new NotImplementedException();
        public Task<FollowUpItem?> GetByIdAsync(string id) => throw new NotImplementedException();
        public Task<System.Collections.Generic.IReadOnlyList<FollowUpItem>> ListAsync(string? status = null, string? search = null) => throw new NotImplementedException();
        public Task<System.Collections.Generic.IReadOnlyList<FollowUpOccurrenceItem>> ListOccurrencesAsync(string followUpId) => throw new NotImplementedException();
        public Task<FollowUpItem> RescheduleAsync(string followUpId, string newDueAt) => throw new NotImplementedException();
        public Task<FollowUpItem> SnoozeAsync(string followUpId, int hours = 24) => throw new NotImplementedException();
        public Task<FollowUpItem> UpdateAsync(FollowUpItem item) => throw new NotImplementedException();
    }

    [Fact]
    public async Task HandleWindowActivated_WithFollowUpRepo_EvaluatesDueReminders()
    {
        var mockSync = new MockSyncEngine();
        var mockFollowUpRepo = new MockFollowUpRepository();
        var recoveryService = new NetworkRecoveryService(mockSync, mockFollowUpRepo, availabilityProvider: () => true);

        await recoveryService.HandleWindowActivatedAsync();

        Assert.Equal(1, mockFollowUpRepo.ListDueCallCount);
        Assert.Equal(1, mockSync.SyncCallCount);
    }

    [Fact]
    public async Task HandleWindowActivated_WhenNotificationSubsystemThrows_HandlesGracefullyWithoutCrashing()
    {
        var mockSync = new MockSyncEngine();
        var mockFollowUpRepo = new MockFollowUpRepository { ThrowOnListDue = true };
        var recoveryService = new NetworkRecoveryService(mockSync, mockFollowUpRepo, availabilityProvider: () => true);

        // Should not throw unhandled exception
        var exception = await Record.ExceptionAsync(() => recoveryService.HandleWindowActivatedAsync());
        Assert.Null(exception);
    }
}
