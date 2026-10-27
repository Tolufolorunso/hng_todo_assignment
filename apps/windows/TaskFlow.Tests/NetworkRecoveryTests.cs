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
}
