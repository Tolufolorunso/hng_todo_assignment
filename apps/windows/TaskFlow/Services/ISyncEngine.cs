using System;
using System.Threading.Tasks;
using TaskFlow.Models;

namespace TaskFlow.Services;

public interface ISyncEngine
{
    SyncState State { get; }
    event Action<SyncState>? StateChanged;

    Task<SyncResultSummary> SyncOnceAsync();
    void StartPeriodicSync(TimeSpan? interval = null);
    void StopPeriodicSync();
}
