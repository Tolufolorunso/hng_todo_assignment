using System;
using System.Threading.Tasks;

namespace TaskFlow.Services;

public interface INetworkRecoveryService : IDisposable
{
    bool IsNetworkAvailable { get; }
    event Action<bool>? NetworkAvailabilityChanged;
    event Action? RecoveryTriggered;

    void Start();
    void Stop();
    Task HandleWindowActivatedAsync();
    Task HandleNetworkAvailabilityChangedAsync(bool isAvailable);
}
