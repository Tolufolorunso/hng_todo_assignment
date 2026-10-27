using System;
using System.Net.NetworkInformation;
using System.Threading.Tasks;
using TaskFlow.Repositories;

namespace TaskFlow.Services;

public class NetworkRecoveryService : INetworkRecoveryService
{
    private readonly ISyncEngine _syncEngine;
    private readonly IFollowUpRepository? _followUpRepo;
    private readonly Func<bool> _availabilityProvider;
    private bool _isStarted;
    private bool _disposed;

    public bool IsNetworkAvailable { get; private set; }
    public event Action<bool>? NetworkAvailabilityChanged;
    public event Action? RecoveryTriggered;

    public NetworkRecoveryService(
        ISyncEngine syncEngine,
        IFollowUpRepository? followUpRepo = null,
        Func<bool>? availabilityProvider = null)
    {
        _syncEngine = syncEngine;
        _followUpRepo = followUpRepo;
        _availabilityProvider = availabilityProvider ?? (() => NetworkInterface.GetIsNetworkAvailable());
        IsNetworkAvailable = _availabilityProvider();
    }

    public void Start()
    {
        if (_isStarted || _disposed)
        {
            return;
        }

        try
        {
            NetworkChange.NetworkAvailabilityChanged += OnNetworkAvailabilityChanged;
            _isStarted = true;
            IsNetworkAvailable = _availabilityProvider();
        }
        catch
        {
            // NetworkChange might throw if network subsystem is unavailable in restricted environments
        }
    }

    public void Stop()
    {
        if (!_isStarted)
        {
            return;
        }

        try
        {
            NetworkChange.NetworkAvailabilityChanged -= OnNetworkAvailabilityChanged;
        }
        catch
        {
            // Ignore cleanup exceptions
        }

        _isStarted = false;
    }

    private void OnNetworkAvailabilityChanged(object? sender, NetworkAvailabilityEventArgs e)
    {
        _ = HandleNetworkAvailabilityChangedAsync(e.IsAvailable);
    }

    public async Task HandleNetworkAvailabilityChangedAsync(bool isAvailable)
    {
        bool wasAvailable = IsNetworkAvailable;
        IsNetworkAvailable = isAvailable;

        NetworkAvailabilityChanged?.Invoke(isAvailable);

        if (isAvailable && !wasAvailable)
        {
            await TriggerRecoveryActionsAsync();
        }
    }

    public async Task HandleWindowActivatedAsync()
    {
        // Re-check current network availability
        try
        {
            IsNetworkAvailable = _availabilityProvider();
        }
        catch
        {
            // Ignore provider exceptions
        }

        await TriggerRecoveryActionsAsync();
    }

    private async Task TriggerRecoveryActionsAsync()
    {
        try
        {
            if (IsNetworkAvailable)
            {
                await _syncEngine.SyncOnceAsync();
            }

            if (_followUpRepo != null)
            {
                // Re-evaluate follow-ups and due occurrences
                await _followUpRepo.ListDueAsync(DateTimeOffset.UtcNow);
            }

            RecoveryTriggered?.Invoke();
        }
        catch
        {
            // Background recovery should not throw unhandled exceptions
        }
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            Stop();
            _disposed = true;
        }
    }
}
